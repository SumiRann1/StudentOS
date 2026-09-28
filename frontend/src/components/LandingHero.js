import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../theme/colors';
import { triggerJobOnDemand } from '../services/schedulerApi';
import { fetchThreadMessages } from '../services/chatStream';
import { storage } from '../services/storage';

/**
 * Calculates badge count text based on markdown content or parsed items.
 */
function calculateBadgeText(text, widgetType) {
  if (!text || typeof text !== 'string') {
    return 'Live';
  }
  const clean = text.trim();
  if (clean.includes('|')) {
    // Markdown table rows
    const rows = clean.split('\n').filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
    const dataRows = rows.slice(2).filter((r) => !r.includes('---'));
    const count = dataRows.length;
    if (widgetType === 'email') return `${count} Unread`;
    if (widgetType === 'classroom') return `${count} Pending`;
    if (widgetType === 'timetable') return `${count} Classes`;
  }

  // Count lines / bullets
  const bullets = clean.split('\n').filter((l) => {
    const trimmed = l.trim();
    return trimmed.length > 5 && !trimmed.startsWith('#') && !trimmed.startsWith('Hello') && !trimmed.startsWith('Below');
  });

  const count = Math.max(1, Math.min(bullets.length, 5));
  if (widgetType === 'email') return `${count} Unread`;
  if (widgetType === 'classroom') return `${count} Pending`;
  if (widgetType === 'timetable') return `${count} Classes`;
  return 'Synced';
}

const INITIAL_WIDGETS = {
  email: {
    id: 'email',
    icon: '✉️',
    title: 'Email Digest',
    badge: 'Live',
    badgeColor: '#10A37F',
    schedule: 'Daily 1:00 AM',
    prompt: 'Summarize all my unread emails and important messages from the last 24 hours.',
    rawMarkdown: '',
    lastSynced: 'Not synced yet',
  },
  classroom: {
    id: 'classroom',
    icon: '📚',
    title: 'Classroom Pending',
    badge: 'Live',
    badgeColor: '#8B5CF6',
    schedule: 'Daily 2:00 AM',
    prompt: 'What are all my upcoming pending assignment deadlines across my courses?',
    rawMarkdown: '',
    lastSynced: 'Not synced yet',
  },
  timetable: {
    id: 'timetable',
    icon: '📅',
    title: "Today's Schedule",
    badge: 'Live',
    badgeColor: '#38BDF8',
    schedule: 'Daily 3:00 AM',
    prompt: 'What is my complete timetable and class schedule for today?',
    rawMarkdown: '',
    lastSynced: 'Not synced yet',
  },
};

const calculateGreeting = () => {
  try {
    const kolkataHourStr = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(kolkataHourStr, 10);
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  } catch (e) {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  }
};

export default function ClaudeLandingHero({
  userName,
  onSelectPrompt,
  onOpenOcrModal,
}) {
  const [greeting, setGreeting] = useState(() => calculateGreeting());
  const [widgets, setWidgets] = useState(INITIAL_WIDGETS);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingWidgetId, setSyncingWidgetId] = useState(null);

  // Accordion Expand/Collapse state for widgets (all default to true for immediate visibility)
  const [expandedWidgets, setExpandedWidgets] = useState({
    email: true,
    classroom: true,
    timetable: true,
  });

  useEffect(() => {
    setGreeting(calculateGreeting());
    const timer = setInterval(() => {
      setGreeting(calculateGreeting());
    }, 30000);
    loadLastAutomatedResults();
    return () => clearInterval(timer);
  }, []);

  const toggleWidgetExpand = (id) => {
    setExpandedWidgets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const saveWidgetsState = async (updatedWidgets) => {
    try {
      await storage.setItem('student_os_automation_widgets', updatedWidgets);
    } catch (e) {
      console.warn('Failed to save widget state:', e);
    }
  };

  /**
   * On App startup, loads the last automated results from persistent local storage
   * and backend SQLite thread history without calling LLM agents repeatedly.
   */
  const loadLastAutomatedResults = async () => {
    try {
      // 1. Try local storage cache
      const saved = await storage.getItem('student_os_automation_widgets');
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (parsed && typeof parsed === 'object') {
          const hasContent = Object.values(parsed).some((w) => !!w.rawMarkdown);
          if (hasContent) {
            setWidgets((prev) => ({ ...prev, ...parsed }));
          }
        }
      }

      // 2. Fetch last automated results from SQLite thread history
      const studentName = userName || 'Student';
      const emailThreadId = `default_email_${studentName}`;
      const classroomThreadId = `default_classroom_${studentName}`;
      const timetableThreadId = `default_tt_${studentName}`;

      const [emailMsgs, classroomMsgs, timetableMsgs] = await Promise.all([
        fetchThreadMessages(emailThreadId, studentName).catch(() => []),
        fetchThreadMessages(classroomThreadId, studentName).catch(() => []),
        fetchThreadMessages(timetableThreadId, studentName).catch(() => []),
      ]);

      const getLastAgentText = (msgs) => {
        if (!Array.isArray(msgs) || msgs.length === 0) return null;
        const agentMsg = [...msgs].reverse().find((m) => m.sender === 'agent' || m.sender === 'assistant');
        return agentMsg ? agentMsg.content : null;
      };

      const emailText = getLastAgentText(emailMsgs);
      const classroomText = getLastAgentText(classroomMsgs);
      const timetableText = getLastAgentText(timetableMsgs);

      if (emailText || classroomText || timetableText) {
        setWidgets((prev) => {
          const updated = { ...prev };

          if (emailText) {
            updated.email = {
              ...prev.email,
              rawMarkdown: emailText,
              badge: calculateBadgeText(emailText, 'email'),
              lastSynced: 'Last Automated Result',
            };
          }

          if (classroomText) {
            updated.classroom = {
              ...prev.classroom,
              rawMarkdown: classroomText,
              badge: calculateBadgeText(classroomText, 'classroom'),
              lastSynced: 'Last Automated Result',
            };
          }

          if (timetableText) {
            updated.timetable = {
              ...prev.timetable,
              rawMarkdown: timetableText,
              badge: calculateBadgeText(timetableText, 'timetable'),
              lastSynced: 'Last Automated Result',
            };
          }

          saveWidgetsState(updated);
          return updated;
        });
      }
    } catch (e) {
      console.warn('Failed to load last automated results on startup:', e);
    }
  };

  const handleSyncAllWidgets = async () => {
    if (isSyncingAll || syncingWidgetId) return;
    setIsSyncingAll(true);

    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const [emailRes, classroomRes, timetableRes] = await Promise.all([
        triggerJobOnDemand('email').catch(() => null),
        triggerJobOnDemand('classroom').catch(() => null),
        triggerJobOnDemand('timetable').catch(() => null),
      ]);

      setWidgets((prev) => {
        const emailText = emailRes?.response || prev.email.rawMarkdown;
        const classroomText = classroomRes?.response || prev.classroom.rawMarkdown;
        const timetableText = timetableRes?.response || prev.timetable.rawMarkdown;

        const updated = {
          ...prev,
          email: {
            ...prev.email,
            rawMarkdown: emailText,
            badge: calculateBadgeText(emailText, 'email'),
            lastSynced: `Synced at ${nowFormatted}`,
          },
          classroom: {
            ...prev.classroom,
            rawMarkdown: classroomText,
            badge: calculateBadgeText(classroomText, 'classroom'),
            lastSynced: `Synced at ${nowFormatted}`,
          },
          timetable: {
            ...prev.timetable,
            rawMarkdown: timetableText,
            badge: calculateBadgeText(timetableText, 'timetable'),
            lastSynced: `Synced at ${nowFormatted}`,
          },
        };
        saveWidgetsState(updated);
        return updated;
      });
    } catch (e) {
      console.warn('Failed to sync all widgets:', e);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncSingleWidget = async (jobId) => {
    if (isSyncingAll || syncingWidgetId) return;
    setSyncingWidgetId(jobId);

    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      const res = await triggerJobOnDemand(jobId);
      if (res?.response) {
        setWidgets((prev) => {
          const updated = {
            ...prev,
            [jobId]: {
              ...prev[jobId],
              rawMarkdown: res.response,
              badge: calculateBadgeText(res.response, jobId),
              lastSynced: `Synced at ${nowFormatted}`,
            },
          };
          saveWidgetsState(updated);
          return updated;
        });
      }
    } catch (e) {
      console.warn(`Failed to sync widget ${jobId}:`, e);
    } finally {
      setSyncingWidgetId(null);
    }
  };

  const displayName = userName ? userName.trim().split(' ')[0] : 'Student';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* App Logo & Warm Greeting */}
      <View style={styles.headerContainer}>
        <View style={styles.logoBadge}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
        </View>
        <Text style={styles.greetingText}>{greeting}, {displayName}</Text>
        <Text style={styles.subtitleText}>How can Student OS assist your academics today?</Text>
      </View>

      {/* ⚡ Live Briefing Widgets Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.sectionTitle}>⚡ Live Briefing Widgets</Text>
            <Text style={styles.sectionSubtitleText}>Pre-loaded summaries updated on demand</Text>
          </View>

          {/* Sync Now Main Button */}
          <TouchableOpacity
            style={[styles.syncNowBtn, isSyncingAll && styles.syncNowBtnActive]}
            onPress={handleSyncAllWidgets}
            disabled={isSyncingAll || !!syncingWidgetId}
            activeOpacity={0.75}
          >
            {isSyncingAll ? (
              <View style={styles.syncBtnRow}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.syncNowBtnText}>Syncing All...</Text>
              </View>
            ) : (
              <View style={styles.syncBtnRow}>
                <Text style={styles.syncIcon}>🔄</Text>
                <Text style={styles.syncNowBtnText}>Sync Now</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Expandable Scrollable Widgets */}
        <View style={styles.widgetsGrid}>
          {Object.values(widgets).map((widget) => {
            const isWidgetSyncing = syncingWidgetId === widget.id || isSyncingAll;
            const isExpanded = !!expandedWidgets[widget.id];
            const hasMarkdown = !!widget.rawMarkdown;

            return (
              <View key={widget.id} style={styles.widgetCard}>
                {/* Clickable Header Bar (Expand/Collapse Accordion) */}
                <TouchableOpacity
                  style={styles.widgetHeader}
                  onPress={() => toggleWidgetExpand(widget.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.widgetTitleRow}>
                    <Text style={styles.widgetIcon}>{widget.icon}</Text>
                    <View>
                      <Text style={styles.widgetTitle}>{widget.title}</Text>
                      <Text style={styles.widgetSchedule}>{widget.schedule}</Text>
                    </View>
                  </View>

                  <View style={styles.headerRightGroup}>
                    <View style={[styles.badgePill, { borderColor: widget.badgeColor, backgroundColor: 'rgba(255,255,255,0.04)' }]}>
                      <Text style={[styles.badgePillText, { color: widget.badgeColor }]}>{widget.badge}</Text>
                    </View>

                    {/* Chevron expand indicator */}
                    <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Expandable Scrollable Body */}
                {isExpanded && (
                  <View style={styles.expandedBodyContainer}>
                    <View style={styles.widgetContentBox}>
                      {isWidgetSyncing ? (
                        <View style={styles.loadingBox}>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.loadingText}>Fetching live backend digest...</Text>
                        </View>
                      ) : hasMarkdown ? (
                        <ScrollView
                          style={styles.widgetScrollBox}
                          nestedScrollEnabled={true}
                          showsVerticalScrollIndicator={true}
                        >
                          <Markdown style={markdownStyles}>
                            {widget.rawMarkdown}
                          </Markdown>
                        </ScrollView>
                      ) : (
                        <View style={styles.emptyBox}>
                          <Text style={styles.emptyText}>No live briefing data loaded yet.</Text>
                          <TouchableOpacity
                            style={styles.emptySyncBtn}
                            onPress={() => handleSyncSingleWidget(widget.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.emptySyncBtnText}>Sync {widget.title}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Widget Footer */}
                    <View style={styles.widgetFooter}>
                      <Text style={styles.lastSyncedText}>{widget.lastSynced}</Text>

                      <View style={styles.footerActionsRow}>
                        {/* Single Widget Refresh */}
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleSyncSingleWidget(widget.id)}
                          disabled={isWidgetSyncing}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.iconBtnText}>🔄 Refresh</Text>
                        </TouchableOpacity>

                        {/* Chat Follow-up button */}
                        <TouchableOpacity
                          style={styles.chatActionBtn}
                          onPress={() => {
                            if (onSelectPrompt) {
                              onSelectPrompt(widget.prompt);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.chatActionBtnText}>💬 Ask AI</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Grade & Document OCR Quick Launcher (Prompt card section removed as requested) */}
      <View style={styles.ocrSectionContainer}>
        <TouchableOpacity
          style={styles.ocrQuickCard}
          onPress={() => {
            if (onOpenOcrModal) {
              onOpenOcrModal();
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.ocrCardHeader}>
            <View style={styles.ocrIconCircle}>
              <Text style={styles.ocrCardIcon}>📊</Text>
            </View>
            <View style={styles.ocrTextContainer}>
              <Text style={styles.ocrCardTitle}>Grade & GPA Calculator (Groq Vision OCR)</Text>
              <Text style={styles.ocrCardDesc}>Upload transcripts or grade sheets for automatic course & SGPA calculation</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const markdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  heading1: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  heading2: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  heading3: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  table: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  tr: {
    flexDirection: 'row',
  },
  th: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontWeight: '700',
    color: '#F8FAFC',
    fontSize: 11,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  td: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.textPrimary,
    fontSize: 11,
    borderWidth: 0.5,
    borderColor: '#334155',
  },
  blockquote: {
    backgroundColor: 'rgba(16, 163, 127, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginVertical: 4,
    borderRadius: 4,
  },
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  logoImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  greetingText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },

  /* Live Briefing Widgets Section */
  sectionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flex: 1,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionSubtitleText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  syncNowBtn: {
    backgroundColor: 'rgba(16, 163, 127, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  syncNowBtnActive: {
    opacity: 0.8,
  },
  syncBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  syncNowBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  widgetsGrid: {
    gap: 12,
  },
  widgetCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
  },
  widgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  widgetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widgetIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  widgetTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  widgetSchedule: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chevronText: {
    color: colors.textMuted,
    fontSize: 10,
    marginLeft: 4,
  },

  expandedBodyContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },

  widgetContentBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  widgetScrollBox: {
    maxHeight: 220,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  emptySyncBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  emptySyncBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },

  widgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  lastSyncedText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  footerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBtnText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
  },
  chatActionBtn: {
    backgroundColor: 'rgba(16, 163, 127, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 163, 127, 0.3)',
  },
  chatActionBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },

  /* OCR Quick Action Card */
  ocrSectionContainer: {
    width: '100%',
    marginTop: 4,
  },
  ocrQuickCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    width: '100%',
  },
  ocrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 163, 127, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ocrCardIcon: {
    fontSize: 18,
  },
  ocrTextContainer: {
    flex: 1,
  },
  ocrCardTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  ocrCardDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});

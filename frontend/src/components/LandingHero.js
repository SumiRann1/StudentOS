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
import { triggerJobOnDemand, fetchDashboardBriefings, fetchNextClass } from '../services/schedulerApi';
import { storage } from '../services/storage';

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

export default function ClaudeLandingHero({
  userName,
  onSelectPrompt,
  onOpenOcrModal,
}) {
  const [greeting, setGreeting] = useState('Good morning');
  const [nextClassInfo, setNextClassInfo] = useState(null);
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
    loadLastAutomatedResults();
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
   * On App startup, loads the pre-calculated briefings, badges, and next-class info
   * directly from the FastAPI backend without running client-side heuristics.
   */
  const loadLastAutomatedResults = async () => {
    try {
      const studentName = userName || 'Student';
      const briefings = await fetchDashboardBriefings(studentName);

      if (briefings && briefings.success) {
        if (briefings.greeting) {
          setGreeting(briefings.greeting);
        }

        if (briefings.next_class) {
          setNextClassInfo(briefings.next_class);
        }

        if (briefings.widgets) {
          setWidgets((prev) => ({
            ...prev,
            ...briefings.widgets,
          }));
          saveWidgetsState(briefings.widgets);
        }
        return;
      }

      // Fallback: Try local storage cache
      const saved = await storage.getItem('student_os_automation_widgets');
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (parsed && typeof parsed === 'object') {
          setWidgets((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch (e) {
      console.warn('Failed to load last automated results on startup:', e);
    }
  };

  const handleSyncAllWidgets = async () => {
    if (isSyncingAll || syncingWidgetId) return;
    setIsSyncingAll(true);

    try {
      await Promise.all([
        triggerJobOnDemand('email').catch(() => null),
        triggerJobOnDemand('classroom').catch(() => null),
        triggerJobOnDemand('timetable').catch(() => null),
      ]);

      const studentName = userName || 'Student';
      const briefings = await fetchDashboardBriefings(studentName);

      if (briefings && briefings.success) {
        if (briefings.next_class) {
          setNextClassInfo(briefings.next_class);
        }
        if (briefings.widgets) {
          setWidgets(briefings.widgets);
          saveWidgetsState(briefings.widgets);
        }
      }
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

  const emailBadge = widgets.email?.badge || 'Live';
  const classroomBadge = widgets.classroom?.badge || 'Live';
  const timetableBadge = widgets.timetable?.badge || 'Live';

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* App Logo, Warm Greeting & Date */}
      <View style={styles.headerContainer}>
        <View style={styles.logoBadgeContainer}>
          <View style={styles.logoGlowRing} />
          <View style={styles.logoBadge}>
            <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
          </View>
        </View>

        <Text style={styles.greetingText}>{greeting}, {displayName}</Text>
        <Text style={styles.subtitleText}>Your AI-Powered Academic Command Center</Text>

        {/* Quick Academic Overview Live Stats Strip */}
        <View style={styles.quickStatsRow}>
          <TouchableOpacity
            style={styles.statChip}
            onPress={() => onSelectPrompt && onSelectPrompt(widgets.email.prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.statChipIcon}>✉️</Text>
            <View style={styles.statChipTextGroup}>
              <Text style={styles.statChipLabel}>Emails</Text>
              <Text style={[styles.statChipValue, { color: '#10A37F' }]}>{emailBadge}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statChip}
            onPress={() => onSelectPrompt && onSelectPrompt(widgets.classroom.prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.statChipIcon}>📚</Text>
            <View style={styles.statChipTextGroup}>
              <Text style={styles.statChipLabel}>Classroom</Text>
              <Text style={[styles.statChipValue, { color: '#A78BFA' }]}>{classroomBadge}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statChip}
            onPress={() => onSelectPrompt && onSelectPrompt(widgets.timetable.prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.statChipIcon}>📅</Text>
            <View style={styles.statChipTextGroup}>
              <Text style={styles.statChipLabel}>Schedule</Text>
              <Text style={[styles.statChipValue, { color: '#38BDF8' }]}>{timetableBadge}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statChip}
            onPress={() => onOpenOcrModal && onOpenOcrModal()}
            activeOpacity={0.7}
          >
            <Text style={styles.statChipIcon}>📊</Text>
            <View style={styles.statChipTextGroup}>
              <Text style={styles.statChipLabel}>Grade & GPA</Text>
              <Text style={[styles.statChipValue, { color: '#F59E0B' }]}>OCR Upload</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔴 Live Next Class Status Banner */}
      {nextClassInfo && (
        <View style={styles.nextClassCard}>
          {nextClassInfo.status === 'ongoing' && nextClassInfo.current_class ? (
            <View style={styles.nextClassRow}>
              <View style={[styles.statusPulseDot, { backgroundColor: '#EF4444' }]} />
              <View style={styles.nextClassTextGroup}>
                <Text style={styles.nextClassHeaderTag}>🔴 ONGOING CLASS RIGHT NOW</Text>
                <Text style={styles.nextClassTitleText}>
                  {nextClassInfo.current_class.courseCode} — {nextClassInfo.current_class.courseName}
                </Text>
                <Text style={styles.nextClassDetailsText}>
                  📍 Venue: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{nextClassInfo.current_class.venue}</Text>  |  ⏰ {nextClassInfo.current_class.time}  |  ⏳ Ends in <Text style={{ color: '#EF4444', fontWeight: '800' }}>{nextClassInfo.current_class.ends_in_mins} mins</Text>
                </Text>
              </View>
            </View>
          ) : nextClassInfo.status === 'upcoming' && nextClassInfo.next_class ? (
            <View style={styles.nextClassRow}>
              <View style={[styles.statusPulseDot, { backgroundColor: '#F59E0B' }]} />
              <View style={styles.nextClassTextGroup}>
                <Text style={styles.nextClassHeaderTag}>⏳ UPCOMING CLASS TODAY</Text>
                <Text style={styles.nextClassTitleText}>
                  {nextClassInfo.next_class.courseCode} — {nextClassInfo.next_class.courseName}
                </Text>
                <Text style={styles.nextClassDetailsText}>
                  📍 Venue: <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{nextClassInfo.next_class.venue}</Text>  |  ⏰ {nextClassInfo.next_class.time}  |  ⌛ Starts in <Text style={{ color: '#F59E0B', fontWeight: '800' }}>{nextClassInfo.next_class.starts_in_mins} mins</Text>
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.nextClassRow}>
              <View style={[styles.statusPulseDot, { backgroundColor: '#10A37F' }]} />
              <View style={styles.nextClassTextGroup}>
                <Text style={styles.nextClassHeaderTag}>🎉 DAY CLASSES COMPLETED</Text>
                <Text style={styles.nextClassDetailsText}>
                  All scheduled lectures for today are finished. Active hours today: <Text style={{ color: '#10A37F', fontWeight: '800' }}>{nextClassInfo.active_hours || 0} hrs</Text>.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ⚡ Live Briefing Widgets Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.sectionTitle}>⚡ Live Briefing Widgets</Text>
            <Text style={styles.sectionSubtitleText}>Automated daily briefings updated on demand</Text>
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
                <Text style={styles.syncNowBtnText}>Sync All</Text>
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
            const displayBadge = widget.badge || 'Live';

            // Accent border style mapping per widget
            const accentBorderColor =
              widget.id === 'email' ? '#10A37F' : widget.id === 'classroom' ? '#8B5CF6' : '#38BDF8';

            return (
              <View
                key={widget.id}
                style={[
                  styles.widgetCard,
                  { borderTopColor: accentBorderColor, borderTopWidth: 3 },
                ]}
              >
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
                    <View style={[styles.badgePill, { borderColor: widget.badgeColor, backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <Text style={[styles.badgePillText, { color: widget.badgeColor }]}>{displayBadge}</Text>
                    </View>

                    {/* Chevron expand indicator */}
                    <View style={styles.chevronBox}>
                      <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expandable Scrollable Body */}
                {isExpanded && (
                  <View style={styles.expandedBodyContainer}>
                    <View style={styles.widgetContentBox}>
                      {isWidgetSyncing ? (
                        <View style={styles.loadingBox}>
                          <ActivityIndicator size="small" color={accentBorderColor} />
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
                            style={[styles.emptySyncBtn, { borderColor: accentBorderColor }]}
                            onPress={() => handleSyncSingleWidget(widget.id)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.emptySyncBtnText, { color: accentBorderColor }]}>Sync {widget.title}</Text>
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
                          style={[styles.chatActionBtn, { borderColor: `${accentBorderColor}50` }]}
                          onPress={() => {
                            if (onSelectPrompt) {
                              onSelectPrompt(widget.prompt);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chatActionBtnText, { color: accentBorderColor }]}>💬 Ask AI</Text>
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
    maxWidth: 780,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 26,
    width: '100%',
  },
  logoBadgeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoGlowRing: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 163, 127, 0.25)',
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#1F242D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 163, 127, 0.5)',
  },
  logoImg: {
    width: 34,
    height: 34,
    borderRadius: 8,
  },
  greetingText: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 18,
  },

  /* Quick Academic Stats Row */
  quickStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 33, 33, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: 125,
  },
  statChipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statChipTextGroup: {
    flexDirection: 'column',
  },
  statChipLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statChipValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },

  /* Live Briefing Widgets Section */
  sectionContainer: {
    width: '100%',
    marginBottom: 24,
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
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionSubtitleText: {
    color: colors.textMuted,
    fontSize: 12,
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
    gap: 14,
  },
  widgetCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
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
    fontSize: 22,
    marginRight: 12,
  },
  widgetTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  widgetSchedule: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronText: {
    color: colors.textMuted,
    fontSize: 9,
  },

  expandedBodyContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 14,
  },

  widgetContentBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  widgetScrollBox: {
    maxHeight: 240,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  emptySyncBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptySyncBtnText: {
    fontSize: 12,
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
    fontSize: 11,
  },
  footerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconBtnText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
  },
  chatActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Live Next Class Banner */
  nextClassCard: {
    width: '100%',
    backgroundColor: '#1E242D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  nextClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  nextClassTextGroup: {
    flex: 1,
  },
  nextClassHeaderTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  nextClassTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nextClassDetailsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
    lineHeight: 18,
  },
});

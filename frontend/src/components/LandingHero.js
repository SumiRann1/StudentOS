import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import {
  triggerJobOnDemand,
  fetchDashboardBriefings,
  fetchNextClass,
  fetchUpcomingDeadlines,
} from '../services/schedulerApi';
import { storage } from '../services/storage';

const INITIAL_WIDGETS = {
  email: {
    id: 'email',
    icon: '✉️',
    title: 'Email Digest',
    badge: 'Live',
    badgeColor: '#10B981',
    schedule: 'Daily 1:00 AM IST',
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
    schedule: 'Daily 2:00 AM IST',
    prompt: 'What are all my upcoming pending assignment deadlines across my courses?',
    rawMarkdown: '',
    lastSynced: 'Not synced yet',
  },
  timetable: {
    id: 'timetable',
    icon: '📅',
    title: "Today's Schedule",
    badge: 'Live',
    badgeColor: '#06B6D4',
    schedule: 'Daily 3:00 AM IST',
    prompt: 'What is my complete timetable and class schedule for today?',
    rawMarkdown: '',
    lastSynced: 'Not synced yet',
  },
};

// Helper: Parse raw markdown email text into structured items
const parseEmailItems = (markdownText) => {
  if (!markdownText) return [];
  const items = [];
  const blocks = markdownText.split('- **');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const subjectEnd = block.indexOf('**');
    if (subjectEnd === -1) continue;
    const subject = block.substring(0, subjectEnd).trim();

    let link = '';
    const linkMatch = block.match(/\[Open Email ↗\]\((.*?)\)/);
    if (linkMatch) link = linkMatch[1];

    let sender = '';
    const senderMatch = block.match(/\*From\*:\s*`([^`]+)`/);
    if (senderMatch) sender = senderMatch[1];

    let snippet = '';
    const snippetMatch = block.match(/>\s*(.*)/);
    if (snippetMatch) snippet = snippetMatch[1];

    items.push({ subject, sender, snippet, link });
  }
  return items;
};

// Helper: Extract header title from timetable markdown
const extractTimetableHeaderTitle = (markdownText) => {
  if (!markdownText) return null;
  const match = markdownText.match(/### 📅 (.*)/);
  if (match) return `📅 ${match[1].trim()}`;
  return null;
};

// Helper: Parse raw markdown timetable schedule text into structured items
const parseTimetableItems = (markdownText) => {
  if (!markdownText) return [];
  const items = [];
  const lines = markdownText.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('- **')) {
      const match = line.match(/- \*\*([^*]+)\*\*: \*\*([^*]+)\*\*(?: \(([^)]+)\))?(?: — \*Venue\*: `([^`]+)`)?/);
      if (match) {
        items.push({
          time: match[1],
          course: match[2],
          type: match[3] || 'Lecture',
          venue: match[4] || 'TBA',
        });
      } else {
        const plainText = line.replace('- **', '').replace('**', '').trim();
        items.push({
          time: 'Schedule Slot',
          course: plainText,
          type: 'Lecture',
          venue: 'TBA',
        });
      }
    }
  }
  return items;
};


export default function ClaudeLandingHero({
  userName,
  onSelectPrompt,
  onOpenOcrModal,
}) {
  const { colors } = useTheme();
  const [greeting, setGreeting] = useState('Good morning');
  const [nextClassInfo, setNextClassInfo] = useState(null);
  const [deadlinesList, setDeadlinesList] = useState([]);
  const [widgets, setWidgets] = useState(INITIAL_WIDGETS);

  // Per-category expand/collapse states (default: 3 items visible)
  const [showAllDeadlines, setShowAllDeadlines] = useState(false);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [showAllTimetable, setShowAllTimetable] = useState(false);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingWidgetId, setSyncingWidgetId] = useState(null);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(false);

  useEffect(() => {
    loadLastAutomatedResults();
    loadStructuredDeadlines();

    // 30-second live class countdown ticker
    const timer = setInterval(() => {
      refreshNextClassInfo();
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  const refreshNextClassInfo = async () => {
    try {
      const classData = await fetchNextClass();
      if (classData) {
        setNextClassInfo(classData);
      }
    } catch (e) {
      console.warn('Failed to refresh next class info:', e);
    }
  };

  const loadStructuredDeadlines = async () => {
    setIsLoadingDeadlines(true);
    try {
      const data = await fetchUpcomingDeadlines(15);
      if (data && data.deadlines) {
        setDeadlinesList(data.deadlines);
      }
    } catch (e) {
      console.warn('Failed to fetch structured deadlines:', e);
    } finally {
      setIsLoadingDeadlines(false);
    }
  };

  const saveWidgetsState = async (updatedWidgets) => {
    try {
      await storage.setItem('student_os_automation_widgets', updatedWidgets);
    } catch (e) {
      console.warn('Failed to save widget state:', e);
    }
  };

  const loadLastAutomatedResults = async () => {
    try {
      const studentName = userName || 'Student';
      const briefings = await fetchDashboardBriefings(studentName);

      if (briefings) {
        if (briefings.greeting) {
          setGreeting(briefings.greeting);
        }

        if (briefings.next_class) {
          setNextClassInfo(briefings.next_class);
        }

        const dataBriefings = briefings.briefings || briefings.widgets;
        if (dataBriefings) {
          setWidgets((prev) => ({
            ...prev,
            ...dataBriefings,
          }));
          saveWidgetsState(dataBriefings);
          return;
        }
      }

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
      const studentName = userName || 'Student';
      await Promise.all([
        triggerJobOnDemand('email', studentName).catch(() => null),
        triggerJobOnDemand('classroom', studentName).catch(() => null),
        triggerJobOnDemand('timetable', studentName).catch(() => null),
      ]);

      const briefings = await fetchDashboardBriefings(studentName);
      if (briefings) {
        if (briefings.next_class) {
          setNextClassInfo(briefings.next_class);
        }
        const dataBriefings = briefings.briefings || briefings.widgets;
        if (dataBriefings) {
          setWidgets(dataBriefings);
          saveWidgetsState(dataBriefings);
        }
      }

      await loadStructuredDeadlines();
    } catch (e) {
      console.warn('Failed to sync all widgets:', e);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncSingleCategory = async (jobId) => {
    if (isSyncingAll || syncingWidgetId) return;
    setSyncingWidgetId(jobId);

    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const studentName = userName || 'Student';

    try {
      const res = await triggerJobOnDemand(jobId, studentName);
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
      if (jobId === 'classroom') {
        await loadStructuredDeadlines();
      }
    } catch (e) {
      console.warn(`Failed to sync ${jobId}:`, e);
    } finally {
      setSyncingWidgetId(null);
    }
  };

  const displayName = userName ? userName.trim().split(' ')[0] : 'Student';

  const emailItems = parseEmailItems(widgets.email?.rawMarkdown);
  const timetableItems = parseTimetableItems(widgets.timetable?.rawMarkdown);

  const isAfterEvening = new Date().getHours() >= 17;
  const timetableTitle = extractTimetableHeaderTitle(widgets.timetable?.rawMarkdown) ||
    (isAfterEvening ? "📅 Tomorrow's Timetable Schedule" : "📅 Today's Timetable Schedule");
  const timetableSubtitle = isAfterEvening ? "Upcoming lecture slots & room venues for tomorrow" : "Active lecture slots & room venues";

  const displayedDeadlines = showAllDeadlines ? deadlinesList : deadlinesList.slice(0, 3);
  const displayedEmails = showAllEmails ? emailItems : emailItems.slice(0, 3);
  const displayedTimetable = showAllTimetable ? timetableItems : timetableItems.slice(0, 3);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* 🌟 Top Spotlight Header */}
      <View style={styles.topSpotlightHeader}>
        <View style={styles.userGreetingRow}>
          <View style={styles.avatarGlowContainer}>
            <View style={[styles.avatarRing, { backgroundColor: colors.primaryGlow }]} />
            <View style={[styles.avatarCircle, { borderColor: colors.primary, backgroundColor: colors.cardBackground }]}>
              <Image source={require('../../assets/app-logo.png')} style={styles.avatarImg} />
            </View>
          </View>

          <View style={styles.greetingTextContainer}>
            <View style={styles.greetingTagRow}>
              <Text style={[styles.greetingTagText, { color: colors.primary }]}>{greeting.toUpperCase()}</Text>
              <View style={[styles.livePulseDot, { backgroundColor: colors.emerald }]} />
            </View>
            <Text style={[styles.userNameHeader, { color: colors.textPrimary }]}>{displayName}'s Command Center</Text>
          </View>
        </View>

        {/* Sync All Button Header Row */}
        <View style={styles.topSyncHeaderRow}>
          <Text style={[styles.workspaceSubtitleText, { color: colors.textSecondary }]}>Live Academic Schedule & Deadlines Feed</Text>

          <TouchableOpacity
            style={[styles.syncAllButton, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }, isSyncingAll && styles.syncAllButtonActive]}
            onPress={handleSyncAllWidgets}
            disabled={isSyncingAll || !!syncingWidgetId}
            activeOpacity={0.75}
          >
            {isSyncingAll ? (
              <View style={styles.syncRow}>
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={[styles.syncBtnText, { color: colors.textPrimary }]}>Syncing All...</Text>
              </View>
            ) : (
              <View style={styles.syncRow}>
                <Text style={styles.syncIcon}>🔄</Text>
                <Text style={[styles.syncBtnText, { color: colors.textPrimary }]}>Sync All Feed</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 📊 Academic Stats Bar */}
        <View style={[styles.statsBarRow, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorder }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statBoxNumber, { color: colors.primary }]}>{deadlinesList.length}</Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Pending Deadlines</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={[styles.statBoxNumber, { color: colors.emerald }]}>{emailItems.length}</Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Priority Unread Mails</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <Text style={[styles.statBoxNumber, { color: colors.cyan }]}>
              {nextClassInfo?.active_hours || 0}h
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Active Class Hours</Text>
          </View>
        </View>
      </View>

      {/* 🔴 Live Next Class Spotlight Card */}
      {nextClassInfo && (
        <View style={[styles.nextClassSpotlightCard, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorder }]}>
          {nextClassInfo.status === 'ongoing' && nextClassInfo.current_class ? (
            <View style={styles.spotlightRow}>
              <View style={[styles.spotlightStatusDot, { backgroundColor: colors.rose }]} />
              <View style={styles.spotlightBody}>
                <View style={styles.spotlightTagRow}>
                  <Text style={[styles.spotlightTagText, { color: colors.rose }]}>LIVE LECTURE IN PROGRESS</Text>
                </View>

                <Text style={[styles.spotlightCourseTitle, { color: colors.textPrimary }]}>
                  {nextClassInfo.current_class.courseCode} — {nextClassInfo.current_class.courseName}
                </Text>

                <View style={styles.spotlightMetaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipIcon}>📍</Text>
                    <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{nextClassInfo.current_class.venue}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipIcon}>⏰</Text>
                    <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{nextClassInfo.current_class.time}</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.35)' }]}>
                    <Text style={styles.metaChipIcon}>⏳</Text>
                    <Text style={[styles.metaChipText, { color: colors.rose, fontWeight: '700' }]}>
                      Ends in {nextClassInfo.current_class.ends_in_mins} mins
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : nextClassInfo.status === 'upcoming' && nextClassInfo.next_class ? (
            <View style={styles.spotlightRow}>
              <View style={[styles.spotlightStatusDot, { backgroundColor: colors.amber }]} />
              <View style={styles.spotlightBody}>
                <View style={styles.spotlightTagRow}>
                  <Text style={[styles.spotlightTagText, { color: colors.amber }]}>UPCOMING LECTURE TODAY</Text>
                </View>

                <Text style={[styles.spotlightCourseTitle, { color: colors.textPrimary }]}>
                  {nextClassInfo.next_class.courseCode} — {nextClassInfo.next_class.courseName}
                </Text>

                <View style={styles.spotlightMetaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipIcon}>📍</Text>
                    <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{nextClassInfo.next_class.venue}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipIcon}>⏰</Text>
                    <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{nextClassInfo.next_class.time}</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
                    <Text style={styles.metaChipIcon}>⌛</Text>
                    <Text style={[styles.metaChipText, { color: colors.amber, fontWeight: '700' }]}>
                      Starts in {nextClassInfo.next_class.starts_in_mins} mins
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.spotlightRow}>
              <View style={[styles.spotlightStatusDot, { backgroundColor: colors.emerald }]} />
              <View style={styles.spotlightBody}>
                <View style={styles.spotlightTagRow}>
                  <Text style={[styles.spotlightTagText, { color: colors.emerald }]}>CLASSES FINISHED FOR TODAY</Text>
                </View>
                <Text style={[styles.spotlightCourseTitle, { color: colors.textPrimary }]}>All scheduled lectures are complete</Text>
                <Text style={[styles.spotlightSubtext, { color: colors.textSecondary }]}>
                  Active lecture duration today: <Text style={{ color: colors.emerald, fontWeight: '800' }}>{nextClassInfo.active_hours || 0} hours</Text>
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Category 1: Classroom Deadlines */}
      <View style={styles.categorySection}>
        <View style={styles.categoryHeaderRow}>
          <View>
            <Text style={[styles.categoryTitleText, { color: colors.textPrimary }]}>Deadlines Timeline</Text>
            <Text style={[styles.categorySubtitleText, { color: colors.textSecondary }]}>Google Classroom coursework</Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshCategoryBtn, { borderColor: colors.cardBorder }]}
            onPress={() => handleSyncSingleCategory('classroom')}
            disabled={syncingWidgetId === 'classroom' || isLoadingDeadlines}
          >
            {syncingWidgetId === 'classroom' || isLoadingDeadlines ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.refreshIconText, { color: colors.primary }]}>SYNC</Text>
            )}
          </TouchableOpacity>
        </View>

        {deadlinesList.length > 0 ? (
          <View style={styles.cardsFeedContainer}>
            {displayedDeadlines.map((item, idx) => (
              <View key={item.id || idx} style={[styles.itemCard, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.urgencyPulseDot, { backgroundColor: item.urgency === 'today' ? colors.rose : item.urgency === 'tomorrow' ? colors.amber : colors.emerald }]} />
                  <View style={styles.cardBodyContent}>
                    <Text style={[styles.courseTagText, { color: colors.cyan }]}>{item.courseName}</Text>
                    <Text style={[styles.itemMainTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                  </View>
                </View>

                <View style={styles.cardFooterRow}>
                  <Text style={[styles.metaDueText, { color: colors.textSecondary }]}>Due: {item.due}</Text>
                  {item.alternateLink ? (
                    <TouchableOpacity onPress={() => Linking.openURL(item.alternateLink)}>
                      <Text style={[styles.openLinkBtnText, { color: colors.primary }]}>Open ↗</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}

            {/* Expand / Collapse Button */}
            {deadlinesList.length > 3 && (
              <TouchableOpacity
                style={[styles.viewMoreBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                onPress={() => setShowAllDeadlines(!showAllDeadlines)}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewMoreBtnText, { color: colors.primary }]}>
                  {showAllDeadlines
                    ? 'View Less ▲'
                    : `View More (${deadlinesList.length - 3} remaining) ▼`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCardBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Pending Deadlines</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>You are all caught up on your Google Classroom assignments.</Text>
          </View>
        )}
      </View>

      {/* Category 2: Priority Unread Emails */}
      <View style={styles.categorySection}>
        <View style={styles.categoryHeaderRow}>
          <View>
            <Text style={[styles.categoryTitleText, { color: colors.textPrimary }]}>Priority Unread Mails</Text>
            <Text style={[styles.categorySubtitleText, { color: colors.textSecondary }]}>Recent professor & department notices</Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshCategoryBtn, { borderColor: colors.cardBorder }]}
            onPress={() => handleSyncSingleCategory('email')}
            disabled={syncingWidgetId === 'email'}
          >
            {syncingWidgetId === 'email' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.refreshIconText, { color: colors.primary }]}>SYNC</Text>
            )}
          </TouchableOpacity>
        </View>

        {emailItems.length > 0 ? (
          <View style={styles.cardsFeedContainer}>
            {displayedEmails.map((item, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardBodyContent}>
                    <Text style={[styles.itemMainTitle, { color: colors.textPrimary }]}>{item.subject}</Text>
                    {item.sender ? <Text style={[styles.emailSenderText, { color: colors.textSecondary }]}>From: {item.sender}</Text> : null}
                    {item.snippet ? <Text style={[styles.emailSnippetText, { color: colors.textMuted }]} numberOfLines={2}>"{item.snippet}"</Text> : null}
                  </View>
                </View>

                {item.link ? (
                  <View style={styles.cardFooterRow}>
                    <Text style={[styles.metaDueText, { color: colors.textSecondary }]}>Gmail Unread Notice</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(item.link)}>
                      <Text style={[styles.openLinkBtnText, { color: colors.primary }]}>Open Email ↗</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))}

            {/* Expand / Collapse Button */}
            {emailItems.length > 3 && (
              <TouchableOpacity
                style={[styles.viewMoreBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                onPress={() => setShowAllEmails(!showAllEmails)}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewMoreBtnText, { color: colors.primary }]}>
                  {showAllEmails
                    ? 'View Less ▲'
                    : `View More (${emailItems.length - 3} remaining) ▼`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCardBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Unread Emails</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>All priority emails from your inbox are read.</Text>
          </View>
        )}
      </View>

      {/* Category 3: Today's Timetable Schedule */}
      <View style={styles.categorySection}>
        <View style={styles.categoryHeaderRow}>
          <View>
            <Text style={[styles.categoryTitleText, { color: colors.textPrimary }]}>{timetableTitle}</Text>
            <Text style={[styles.categorySubtitleText, { color: colors.textSecondary }]}>{timetableSubtitle}</Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshCategoryBtn, { borderColor: colors.cardBorder }]}
            onPress={() => handleSyncSingleCategory('timetable')}
            disabled={syncingWidgetId === 'timetable'}
          >
            {syncingWidgetId === 'timetable' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.refreshIconText, { color: colors.primary }]}>SYNC</Text>
            )}
          </TouchableOpacity>
        </View>

        {timetableItems.length > 0 ? (
          <View style={styles.cardsFeedContainer}>
            {displayedTimetable.map((item, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: colors.cardBackgroundTranslucent, borderColor: colors.cardBorder }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardBodyContent}>
                    <Text style={[styles.courseTagText, { color: colors.cyan }]}>{item.time}</Text>
                    <Text style={[styles.itemMainTitle, { color: colors.textPrimary }]}>{item.course}</Text>
                  </View>
                </View>

                <View style={styles.cardFooterRow}>
                  <Text style={[styles.metaDueText, { color: colors.textSecondary }]}>Venue: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{item.venue}</Text></Text>
                  <View style={styles.typeBadgePill}>
                    <Text style={styles.typeBadgeText}>{item.type}</Text>
                  </View>
                </View>
              </View>
            ))}

            {/* Expand / Collapse Button */}
            {timetableItems.length > 3 && (
              <TouchableOpacity
                style={[styles.viewMoreBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
                onPress={() => setShowAllTimetable(!showAllTimetable)}
                activeOpacity={0.8}
              >
                <Text style={[styles.viewMoreBtnText, { color: colors.primary }]}>
                  {showAllTimetable
                    ? 'View Less ▲'
                    : `View More (${timetableItems.length - 3} remaining) ▼`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={[styles.emptyCardBox, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Classes Scheduled!</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Enjoy your day off or holiday.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  
  /* Top Spotlight Header */
  topSpotlightHeader: {
    marginBottom: 24,
    width: '100%',
  },
  userGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarGlowContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 54,
    height: 54,
    borderRadius: 18,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  greetingTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  userNameHeader: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  topSyncHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  workspaceSubtitleText: {
    fontSize: 13.5,
    fontWeight: '600',
    flexShrink: 1,
    letterSpacing: 0.2,
  },
  syncAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 0,
  },
  syncAllButtonActive: {
    opacity: 0.8,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* 📊 Stats Bar Row */
  statsBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }
      : {}),
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxNumber: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  statBoxLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  /* Live Next Class Spotlight Card */
  nextClassSpotlightCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 26,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }
      : {}),
  },
  spotlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  spotlightStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  spotlightBody: {
    flex: 1,
  },
  spotlightTagRow: {
    marginBottom: 4,
  },
  spotlightTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  spotlightCourseTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  spotlightSubtext: {
    fontSize: 13,
    fontWeight: '500',
  },
  spotlightMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  metaChipIcon: {
    fontSize: 12,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  /* Category Sections */
  categorySection: {
    width: '100%',
    marginBottom: 24,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitleText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  categorySubtitleText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  refreshCategoryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
  },
  refreshIconText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  cardsFeedContainer: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  urgencyPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    marginRight: 12,
  },
  emailIconText: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  timetableIconText: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 2,
  },
  cardBodyContent: {
    flex: 1,
  },
  courseTagText: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  itemMainTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  emailSenderText: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  emailSnippetText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    marginTop: 4,
  },

  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaDueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openLinkBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  typeBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  typeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  /* View More Button */
  viewMoreBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  viewMoreBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  emptyCardBox: {
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
  },
});

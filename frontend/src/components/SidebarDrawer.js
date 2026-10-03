import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { pinThread, unpinThread, deleteThread } from '../services/chatStream';
import { fetchSchedulerJobs } from '../services/schedulerApi';

const getKolkataTime = () => {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch (e) {
    return new Date().toLocaleTimeString();
  }
};

const AUTOMATION_LIST = [
  { id: 'email', icon: '✉️', title: 'Email Digest', time: '1:00 AM IST' },
  { id: 'classroom', icon: '📚', title: 'Classroom Sync', time: '2:00 AM IST' },
  { id: 'timetable', icon: '📅', title: "Today's Schedule", time: '3:00 AM IST' },
];

export default function SidebarDrawer({
  visible,
  onClose,
  isOnline,
  onNewChat,
  onOpenSetup,
  onLogout,
  userProfile,
  userSession,
  recentChats = [],
  onSelectChat,
  activeThreadId,
  onRefreshThreads,
  onTriggerAutomation,
  runningJob,
}) {
  const { colors, themeKey, setThemeKey, themePresets } = useTheme();

  const [currentTime, setCurrentTime] = useState(() => getKolkataTime());
  const [schedulerJobs, setSchedulerJobs] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (onRefreshThreads) {
        onRefreshThreads();
      }
      setCurrentTime(getKolkataTime());
      loadSchedulerStatus();
      const timer = setInterval(() => {
        setCurrentTime(getKolkataTime());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [visible]);

  const loadSchedulerStatus = async () => {
    try {
      const data = await fetchSchedulerJobs();
      if (data) {
        setSchedulerJobs(data);
      }
    } catch (e) {
      console.warn('Failed to load scheduler jobs:', e);
    }
  };

  const handleNewChatPress = () => {
    onNewChat();
    onClose();
  };

  const handleSelectChatPress = (chat) => {
    if (onSelectChat) {
      onSelectChat(chat);
    }
    onClose();
  };

  const handleTogglePin = async (chat) => {
    if (!chat || !chat.thread_id) return;
    if (chat.pinned == 1 || chat.pinned === true) {
      await unpinThread(chat.thread_id);
    } else {
      await pinThread(chat.thread_id);
    }
    if (onRefreshThreads) onRefreshThreads();
  };

  const handleDeleteChat = async (chat) => {
    if (!chat || !chat.thread_id) return;
    await deleteThread(chat.thread_id);
    if (onRefreshThreads) onRefreshThreads();
  };

  const handleSetupPress = () => {
    onOpenSetup();
    onClose();
  };

  const handleLogoutPress = () => {
    onClose();
    if (onLogout) onLogout();
  };

  const userDisplayName = userProfile?.full_name || userProfile?.name || userSession?.userName;
  const userEmail = userProfile?.email || userSession?.email;

  // Search Filter
  const filteredChats = searchQuery.trim()
    ? recentChats.filter((c) => (c.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : recentChats;

  // Pinned vs Unpinned Categorization by Date
  const pinnedChats = filteredChats.filter((c) => c.pinned == 1 || c.pinned === true);
  const unpinnedChats = filteredChats.filter((c) => !(c.pinned == 1 || c.pinned === true));

  // Date Grouping Helper
  const now = new Date();
  const todayChats = [];
  const pastWeekChats = [];
  const olderChats = [];

  unpinnedChats.forEach((chat) => {
    const timestamp = chat.timestamp || chat.updated_at || chat.created_at;
    if (!timestamp) {
      todayChats.push(chat);
      return;
    }
    const date = new Date(timestamp);
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      todayChats.push(chat);
    } else if (diffDays <= 7) {
      pastWeekChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  });

  const renderChatItem = (chat) => {
    const isActive = activeThreadId === chat.thread_id;
    const isPinned = chat.pinned == 1 || chat.pinned === true;

    return (
      <View
        key={chat.thread_id || chat.timestamp}
        style={[
          styles.recentChatItem,
          isActive && {
            backgroundColor: colors.primaryGlow,
            borderWidth: 1,
            borderColor: colors.primary,
          },
        ]}
      >
        <TouchableOpacity style={styles.chatTitleTouch} onPress={() => handleSelectChatPress(chat)} activeOpacity={0.75}>
          <Text style={styles.recentChatIcon}>{isPinned ? '📌' : '💬'}</Text>
          <Text
            style={[
              styles.recentChatTitle,
              { color: isActive ? colors.textPrimary : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {chat.title || 'Untitled Chat'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.pinActionBtn} onPress={() => handleTogglePin(chat)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.actionBtnText}>{isPinned ? '📍' : '📌'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteActionBtn} onPress={() => handleDeleteChat(chat)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.actionBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Sidebar Panel (Left Aligned) */}
        <View style={[styles.drawerPanel, { backgroundColor: colors.drawerBg, borderRightColor: colors.cardBorder }]}>
          
          {/* 1. Header Dock */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoRow}>
              <View style={[styles.logoRing, { borderColor: colors.primaryGlow, backgroundColor: colors.cardBackground }]}>
                <Image source={require('../../assets/app-logo.png')} style={styles.drawerLogoImg} />
              </View>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={[styles.logoTitle, { color: colors.textPrimary }]}>Student OS</Text>
                  <View style={[styles.versionPill, { backgroundColor: colors.primaryGlow }]}>
                    <Text style={[styles.versionText, { color: colors.primary }]}>v1.0</Text>
                  </View>
                </View>
                <Text style={[styles.brandSubtext, { color: colors.textMuted }]}>Academic Workspace</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* 2. Primary Actions: + New Chat & Search Input */}
          <TouchableOpacity
            style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
            onPress={handleNewChatPress}
            activeOpacity={0.85}
          >
            <Text style={styles.newChatIcon}>+</Text>
            <Text style={styles.newChatText}>New Chat Thread</Text>
          </TouchableOpacity>

          <View style={[styles.searchBarContainer, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search chat history..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                <Text style={[styles.clearSearchText, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 3. Main Scrollable Navigation Area */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>📌 PINNED CHATS</Text>
                {pinnedChats.map(renderChatItem)}
              </View>
            )}

            {/* Today Chats */}
            {todayChats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>📅 TODAY</Text>
                {todayChats.map(renderChatItem)}
              </View>
            )}

            {/* Past 7 Days */}
            {pastWeekChats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>🕒 PREVIOUS 7 DAYS</Text>
                {pastWeekChats.map(renderChatItem)}
              </View>
            )}

            {/* Older Chats */}
            {olderChats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>🗄️ OLDER CHATS</Text>
                {olderChats.map(renderChatItem)}
              </View>
            )}

            {/* Fallback Empty State */}
            {filteredChats.length === 0 && (
              <View style={styles.emptyStateContainer}>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>No chat threads found</Text>
              </View>
            )}

            {/* ⚡ Daily Automations Micro Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>⚡ DAILY AUTOMATIONS</Text>
              {AUTOMATION_LIST.map((auto) => {
                const isRunning = runningJob === auto.id;
                return (
                  <TouchableOpacity
                    key={auto.id}
                    style={[styles.autoRow, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
                    disabled={!!runningJob}
                    onPress={() => {
                      onClose();
                      if (onTriggerAutomation) {
                        onTriggerAutomation(auto.id);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.autoIcon}>{auto.icon}</Text>
                    <View style={styles.autoInfo}>
                      <Text style={[styles.autoTitle, { color: colors.textPrimary }]}>{auto.title}</Text>
                      <Text style={[styles.autoTime, { color: colors.textMuted }]}>{auto.time}</Text>
                    </View>
                    {isRunning ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <View style={[styles.autoTriggerBadge, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                        <Text style={[styles.autoTriggerText, { color: colors.primary }]}>Run</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 🎨 Theme Picker Accordion Toggle */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeaderAccordion}
                onPress={() => setShowThemePicker((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>
                  🎨 THEME: {themePresets[themeKey]?.name || 'Default'}
                </Text>
                <Text style={[styles.accordionIcon, { color: colors.textMuted }]}>
                  {showThemePicker ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {showThemePicker && (
                <View style={styles.themeGrid}>
                  {Object.keys(themePresets).map((key) => {
                    const preset = themePresets[key];
                    const isSelected = themeKey === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.themeCardItem,
                          { borderColor: isSelected ? colors.primary : colors.cardBorder },
                          isSelected && { backgroundColor: colors.primaryGlow },
                        ]}
                        onPress={() => setThemeKey(key)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.themeSwatchRow}>
                          <View style={[styles.swatchDot, { backgroundColor: preset.background }]} />
                          <View style={[styles.swatchDot, { backgroundColor: preset.primary }]} />
                          <View style={[styles.swatchDot, { backgroundColor: preset.secondary }]} />
                          {isSelected && <Text style={[styles.selectedCheck, { color: colors.primary }]}>✓</Text>}
                        </View>
                        <Text style={[styles.themeCardName, { color: isSelected ? colors.textPrimary : colors.textSecondary }]}>
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Service Integrations Option */}
            <TouchableOpacity style={[styles.menuItem, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]} onPress={handleSetupPress} activeOpacity={0.8}>
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>Integrations & Service Health</Text>
            </TouchableOpacity>

          </ScrollView>

          {/* 4. Sticky User Profile & System Status Footer */}
          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            <View style={styles.footerStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.statusOnline : colors.statusConnecting }]} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                {isOnline ? 'Online' : 'Connecting...'} • {currentTime}
              </Text>
            </View>

            <View style={[styles.userProfileBox, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
              <View style={[styles.userAvatarCircle, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
                <Text style={styles.userAvatarIcon}>👤</Text>
              </View>
              <View style={styles.userInfoCol}>
                <Text style={[styles.userNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {userDisplayName || 'Student'}
                </Text>
                {userEmail && (
                  <Text style={[styles.userEmailText, { color: colors.textMuted }]} numberOfLines={1}>
                    {userEmail}
                  </Text>
                )}
              </View>
              {onLogout && (
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogoutPress} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.logoutIcon}>🚪</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Backdrop overlay (Right Side) */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  backdrop: {
    flex: 1,
  },
  drawerPanel: {
    width: 310,
    maxWidth: '85%',
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36) : 22,
    paddingBottom: 16,
    borderRightWidth: 1,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '20px 0 50px rgba(0, 0, 0, 0.7)',
        }
      : {}),
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRing: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  drawerLogoImg: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  versionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  brandSubtext: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    marginBottom: 12,
  },
  newChatIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    padding: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  recentChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  chatTitleTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  recentChatIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  recentChatTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinActionBtn: {
    padding: 3,
  },
  deleteActionBtn: {
    padding: 3,
  },
  actionBtnText: {
    fontSize: 11,
  },
  emptyStateContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  autoIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  autoInfo: {
    flex: 1,
  },
  autoTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  autoTime: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  autoTriggerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  autoTriggerText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  sectionHeaderAccordion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 6,
  },
  accordionIcon: {
    fontSize: 10,
  },
  themeGrid: {
    gap: 6,
    marginTop: 4,
  },
  themeCardItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeSwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  swatchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedCheck: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  themeCardName: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  menuItemIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  userAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  userAvatarIcon: {
    fontSize: 14,
  },
  userInfoCol: {
    flex: 1,
  },
  userNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userEmailText: {
    fontSize: 10,
    marginTop: 1,
  },
  logoutBtn: {
    padding: 6,
  },
  logoutIcon: {
    fontSize: 14,
  },
});

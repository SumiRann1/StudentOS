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
  { id: 'classroom', icon: '📚', title: 'Classroom Pending', time: '2:00 AM IST' },
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

  const filteredChats = searchQuery.trim()
    ? recentChats.filter((c) => (c.title || '').toLowerCase().includes(searchQuery.toLowerCase().trim()))
    : recentChats;

  const pinnedChats = filteredChats.filter((c) => c.pinned == 1 || c.pinned === true);
  const unpinnedChats = filteredChats.filter((c) => !(c.pinned == 1 || c.pinned === true));

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
        <TouchableOpacity style={styles.chatTitleTouch} onPress={() => handleSelectChatPress(chat)}>
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
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoRow}>
              <View style={[styles.logoRing, { borderColor: colors.primaryGlow, backgroundColor: colors.cardBackground }]}>
                <Image source={require('../../assets/app-logo.png')} style={styles.drawerLogoImg} />
              </View>
              <Text style={[styles.logoTitle, { color: colors.textPrimary }]}>Student OS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* New Chat Button */}
          <TouchableOpacity
            style={[styles.newChatBtn, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
            onPress={handleNewChatPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.newChatIcon, { color: colors.primary }]}>+</Text>
            <Text style={[styles.newChatText, { color: colors.textPrimary }]}>New Chat</Text>
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={[styles.searchBarContainer, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search chat history..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Scroll Area */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* 🎨 Interactive Design System Theme Picker */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Theme & Appearance</Text>
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
            </View>

            {/* ⚡ Daily Automations Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Daily Automations</Text>
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
                  >
                    <Text style={styles.autoIcon}>{auto.icon}</Text>
                    <View style={styles.autoInfo}>
                      <Text style={[styles.autoTitle, { color: colors.textPrimary }]}>{auto.title}</Text>
                      <Text style={[styles.autoTime, { color: colors.primary }]}>{auto.time}</Text>
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

            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Pinned Chats</Text>
                {pinnedChats.map(renderChatItem)}
              </View>
            )}

            {/* Recent Chats Section */}
            {unpinnedChats.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Recent Chats</Text>
                {unpinnedChats.map(renderChatItem)}
              </View>
            )}

            {/* System Status & Time Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>System Status</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.statusOnline : colors.statusConnecting }]} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>{isOnline ? 'Backend Connected' : 'Connecting...'}</Text>
              </View>
              {schedulerJobs && schedulerJobs.job_count !== undefined && (
                <Text style={[styles.schedulerCountText, { color: colors.textMuted }]}>
                  {schedulerJobs.job_count} Background Cron Jobs Active
                </Text>
              )}
              <View style={[styles.timeRow, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.timeText, { color: colors.primary }]}>{currentTime}</Text>
              </View>
            </View>

            {/* Navigation Menu */}
            <View style={styles.menuSection}>
              <TouchableOpacity style={styles.menuItem} onPress={handleSetupPress}>
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <Text style={[styles.menuItemText, { color: colors.textPrimary }]}>Service Integrations & OAuth</Text>
              </TouchableOpacity>

              {onLogout && (
                <TouchableOpacity style={styles.menuItem} onPress={handleLogoutPress}>
                  <Text style={styles.menuItemIcon}>🚪</Text>
                  <Text style={[styles.menuItemText, { color: colors.error }]}>Sign Out</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {/* User Profile Footer */}
          <View style={styles.footer}>
            {(userDisplayName || userEmail) && (
              <View style={[styles.userProfileBox, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.userNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                  👤 {userDisplayName || 'Student'}
                </Text>
                {userEmail && (
                  <Text style={[styles.userEmailText, { color: colors.textMuted }]} numberOfLines={1}>
                    {userEmail}
                  </Text>
                )}
              </View>
            )}
            <Text style={[styles.footerText, { color: colors.textMuted }]}>Student OS Workspace</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdrop: {
    flex: 1,
  },
  drawerPanel: {
    width: 300,
    maxWidth: '85%',
    height: '100%',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36) : 24,
    paddingBottom: 20,
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
    marginBottom: 18,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRing: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 10,
  },
  drawerLogoImg: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  logoTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  newChatIcon: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 10,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  themeGrid: {
    gap: 8,
    marginTop: 4,
  },
  themeCardItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeSwatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  swatchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedCheck: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 'auto',
  },
  themeCardName: {
    fontSize: 12,
    fontWeight: '600',
  },
  recentChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  chatTitleTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  recentChatIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  recentChatTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinActionBtn: {
    padding: 4,
  },
  deleteActionBtn: {
    padding: 4,
  },
  actionBtnText: {
    fontSize: 12,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
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
    fontSize: 15,
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
  },
  autoTriggerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  autoTriggerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  schedulerCountText: {
    fontSize: 11,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  menuSection: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuItemIcon: {
    fontSize: 15,
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  userProfileBox: {
    marginBottom: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  userNameText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmailText: {
    fontSize: 10,
  },
  footerText: {
    fontSize: 10,
    textAlign: 'center',
  },
});

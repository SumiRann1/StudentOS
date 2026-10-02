import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

export default function Header({
  onOpenDrawer,
  chatTopic = 'Student OS',
  isOnline = true,
  onNewChat,
  onOpenSetup,
}) {
  const { colors, themeKey, setThemeKey, themePresets } = useTheme();

  const handleCycleTheme = () => {
    const keys = Object.keys(themePresets);
    const currentIndex = keys.indexOf(themeKey);
    const nextIndex = (currentIndex + 1) % keys.length;
    setThemeKey(keys[nextIndex]);
  };

  const currentTheme = themePresets[themeKey] || themePresets.appleSpaceGrey;
  const themeShortName = currentTheme.name.split(' ')[0] || 'Theme';

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.headerBg, borderBottomColor: colors.cardBorder }]}>
      <View style={styles.leftGroup}>
        {/* Burger Drawer Menu Button */}
        {onOpenDrawer && (
          <TouchableOpacity
            style={[styles.drawerButton, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
            onPress={onOpenDrawer}
            activeOpacity={0.7}
          >
            <Text style={[styles.burgerIcon, { color: colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
        )}

        {/* Brand App Logo Ring */}
        <View style={styles.brandGroup}>
          <View style={[styles.logoRing, { borderColor: colors.primaryGlow, backgroundColor: colors.cardBackground }]}>
            <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
          </View>
        </View>

        {/* Active Chat Topic Pill */}
        <View style={[styles.topicContainer, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnline ? colors.statusOnline : colors.statusConnecting },
            ]}
          />
          <Text style={[styles.topicText, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
            {chatTopic}
          </Text>
        </View>
      </View>

      <View style={styles.rightGroup}>
        {/* New Chat Quick Action */}
        {onNewChat && (
          <TouchableOpacity
            style={[styles.newChatHeaderBtn, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
            onPress={onNewChat}
            activeOpacity={0.75}
          >
            <Text style={[styles.newChatPlus, { color: colors.primary }]}>+</Text>
            <Text style={[styles.newChatLabel, { color: colors.textPrimary }]}>New Chat</Text>
          </TouchableOpacity>
        )}

        {/* Settings / Setup Action */}
        {onOpenSetup && (
          <TouchableOpacity
            style={[styles.setupIconBtn, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
            onPress={onOpenSetup}
            activeOpacity={0.75}
          >
            <Text style={[styles.setupIcon, { color: colors.textSecondary }]}>Settings</Text>
          </TouchableOpacity>
        )}

        {/* Quick Theme Cycle Switcher Badge */}
        <TouchableOpacity
          style={[styles.proBadge, { backgroundColor: colors.toolBadgeBg, borderColor: colors.toolBadgeBorder }]}
          onPress={handleCycleTheme}
          activeOpacity={0.7}
        >
          <View style={[styles.proDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.proBadgeText, { color: colors.primary }]}>{themeShortName}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }
      : {}),
    zIndex: 200,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    gap: 10,
    marginRight: 10,
  },
  drawerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  burgerIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  logoRing: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  logoImg: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  topicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
    maxWidth: 240,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
    flexShrink: 0,
  },
  topicText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  newChatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    flexShrink: 0,
  },
  newChatPlus: {
    fontSize: 14,
    fontWeight: '700',
  },
  newChatLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  setupIconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  setupIcon: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    flexShrink: 0,
  },
  proDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function Header({
  onOpenDrawer,
  chatTopic = 'Student OS',
  isOnline = true,
  onNewChat,
  onOpenSetup,
  onOpenOcr,
}) {
  const { colors, themeKey, setThemeKey, themePresets } = useTheme();
  const { width } = useWindowDimensions();

  const isMobile = width < 640;
  const isSmallMobile = width < 440;

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
      {/* Left Group: Drawer + Brand Logo + Topic Status */}
      <View style={styles.leftGroup}>
        {/* Burger Drawer Menu Button */}
        {onOpenDrawer && (
          <TouchableOpacity
            style={[styles.btnBase, styles.iconOnlySquare, { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground }]}
            onPress={onOpenDrawer}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnIcon, { color: colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
        )}

        {/* Brand App Logo Ring */}
        <View style={[styles.btnBase, styles.iconOnlySquare, { borderColor: colors.primaryGlow, backgroundColor: colors.cardBackground }]}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
        </View>

        {/* Active Chat Topic & Connection Status Pill */}
        {!isSmallMobile && (
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
        )}
      </View>

      {/* Right Group: Action Hub */}
      <View style={styles.rightGroup}>
        {/* New Chat Quick Action */}
        {onNewChat && (
          <TouchableOpacity
            style={[
              styles.btnBase,
              { backgroundColor: colors.primaryGlow, borderColor: colors.primary },
              isMobile ? styles.iconOnlySquare : styles.btnWithText,
            ]}
            onPress={onNewChat}
            activeOpacity={0.75}
          >
            <Text style={[styles.btnIcon, { color: colors.primary }]}>＋</Text>
            {!isMobile && <Text style={[styles.btnLabel, { color: colors.textPrimary }]}>New Chat</Text>}
          </TouchableOpacity>
        )}

        {/* Quick OCR Scanner Action */}
        {onOpenOcr && (
          <TouchableOpacity
            style={[
              styles.btnBase,
              { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
              isMobile ? styles.iconOnlySquare : styles.btnWithText,
            ]}
            onPress={onOpenOcr}
            activeOpacity={0.75}
          >
            <Text style={[styles.btnIcon, { color: colors.textSecondary }]}>📷</Text>
            {!isMobile && <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>OCR</Text>}
          </TouchableOpacity>
        )}

        {/* Settings / Setup Action */}
        {onOpenSetup && (
          <TouchableOpacity
            style={[
              styles.btnBase,
              { borderColor: colors.cardBorder, backgroundColor: colors.cardBackground },
              isMobile ? styles.iconOnlySquare : styles.btnWithText,
            ]}
            onPress={onOpenSetup}
            activeOpacity={0.75}
          >
            <Text style={[styles.btnIcon, { color: colors.textSecondary }]}>⚙️</Text>
            {!isMobile && <Text style={[styles.btnLabel, { color: colors.textSecondary }]}>Setup</Text>}
          </TouchableOpacity>
        )}

        {/* Quick Theme Cycle Switcher Badge */}
        <TouchableOpacity
          style={[
            styles.btnBase,
            { backgroundColor: colors.toolBadgeBg, borderColor: colors.toolBadgeBorder },
            isMobile ? styles.iconOnlySquare : styles.btnWithText,
          ]}
          onPress={handleCycleTheme}
          activeOpacity={0.7}
        >
          <View style={[styles.themeColorDot, { backgroundColor: colors.primary }]} />
          {!isMobile && <Text style={[styles.btnLabel, { color: colors.primary }]}>{themeShortName}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }
      : {}),
    zIndex: 200,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
    gap: 8,
    marginRight: 8,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },

  /* Base Button Styling (Exact 36px Height Uniformity) */
  btnBase: {
    height: 36,
    minHeight: 36,
    maxHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconOnlySquare: {
    width: 36,
    minWidth: 36,
    maxWidth: 36,
    paddingHorizontal: 0,
  },
  btnWithText: {
    paddingHorizontal: 12,
    gap: 6,
  },
  btnIcon: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* App Logo inside 36x36px Square */
  logoImg: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },

  /* Active Topic Status Pill (36px Height) */
  topicContainer: {
    height: 36,
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    flexShrink: 1,
    maxWidth: 220,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    flexShrink: 0,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  themeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

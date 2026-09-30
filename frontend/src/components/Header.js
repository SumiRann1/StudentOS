import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Header({ onOpenDrawer, chatTopic = 'Student OS', isOnline = true }) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {/* Top-Left Minimal Burger Button */}
        {onOpenDrawer && (
          <TouchableOpacity style={styles.iconButton} onPress={onOpenDrawer} activeOpacity={0.75}>
            <Text style={styles.burgerIcon}>☰</Text>
          </TouchableOpacity>
        )}

        {/* Dynamic Chat Topic Badge Container */}
        <View style={styles.topicBadgeContainer}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.statusOnline : colors.statusConnecting }]} />
          <Text style={styles.chatTopicText} numberOfLines={1} ellipsizeMode="tail">
            {chatTopic}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.v5Badge}>
          <Text style={styles.v5BadgeText}>v5.0 Pro</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  burgerIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  topicBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxWidth: '75%',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
  },
  chatTopicText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  v5Badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  v5BadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
});

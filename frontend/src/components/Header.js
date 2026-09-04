import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Header({ onOpenDrawer, chatTopic = 'Student OS' }) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {/* Top-Left Minimal Burger Button */}
        {onOpenDrawer && (
          <TouchableOpacity style={styles.iconButton} onPress={onOpenDrawer} activeOpacity={0.7}>
            <Text style={styles.burgerIcon}>☰</Text>
          </TouchableOpacity>
        )}

        {/* Dynamic Chat Topic Title */}
        <Text style={styles.chatTopicText} numberOfLines={1} ellipsizeMode="tail">
          {chatTopic}
        </Text>
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
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 16,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  burgerIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  chatTopicText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
});

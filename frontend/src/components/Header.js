import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image } from 'react-native';
import { colors } from '../theme/colors';

export default function Header({ onNewChat, onOpenDrawer }) {
  return (
    <View style={styles.header}>
      {/* Left Section: Burger Drawer Button & Model Selector Pill */}
      <View style={styles.leftSection}>
        {onOpenDrawer && (
          <TouchableOpacity style={styles.iconTile} onPress={onOpenDrawer} activeOpacity={0.7}>
            <Text style={styles.burgerIcon}>☰</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.modelPill} onPress={onOpenDrawer} activeOpacity={0.8}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImg} />
          <Text style={styles.modelTitle}>Student OS</Text>
          <Text style={styles.chevronIcon}>💭</Text>
        </TouchableOpacity>
      </View>

      {/* Right Section: New Chat Action Tile */}
      <View style={styles.rightSection}>
        {onNewChat && (
          <TouchableOpacity style={styles.iconTile} onPress={onNewChat} activeOpacity={0.7}>
            <Text style={styles.newChatIcon}></Text>
          </TouchableOpacity>
        )}
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 30) : 10,
    paddingBottom: 10,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconTile: {
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
    fontSize: 16,
    fontWeight: '600',
  },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  logoImg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    marginRight: 8,
  },
  sparkleBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(16, 163, 127, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sparkleIcon: {
    fontSize: 11,
  },
  modelTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginRight: 4,
  },
  modelBadge: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginRight: 6,
  },
  chevronIcon: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatIcon: {
    fontSize: 15,
  },
});

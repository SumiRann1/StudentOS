import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { colors } from '../theme/colors';

export default function Header({ isOnline, onOpenSetup }) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <Text style={styles.logoIcon}>🎓</Text>
        <View>
          <Text style={styles.title}>Student OS</Text>
          <Text style={styles.subtitle}>AI Classroom & Timetable Agent</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.secondary : colors.warning }]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Connecting'}</Text>
        </View>

        <TouchableOpacity style={styles.setupButton} onPress={onOpenSetup}>
          <Text style={styles.setupButtonText}>⚙️ Setup</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 28) : 12,
    paddingBottom: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  logoIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 10,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  setupButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

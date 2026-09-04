import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, StatusBar, Animated, Image } from 'react-native';
import { colors } from '../theme/colors';

export default function SidebarDrawer({ visible, onClose, isOnline, onNewChat, onOpenSetup }) {
  const handleNewChatPress = () => {
    onNewChat();
    onClose();
  };

  const handleSetupPress = () => {
    onOpenSetup();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Backdrop overlay touch to dismiss */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* Sidebar Content Panel */}
        <View style={styles.drawerPanel}>
          {/* Top Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.logoRow}>
              <Image source={require('../../assets/app-logo.png')} style={styles.drawerLogoImg} />
              <Text style={styles.logoTitle}>Student OS</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action: New Chat Button (ChatGPT Style) */}
          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChatPress}>
            <Text style={styles.newChatIcon}>+</Text>
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>

          {/* Status Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Status</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.statusOnline : colors.statusConnecting }]} />
              <Text style={styles.statusText}>{isOnline ? 'Backend Server Connected' : 'Connecting to Server...'}</Text>
            </View>
          </View>

          {/* Navigation Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={handleNewChatPress}>
              <Text style={styles.menuItemIcon}>💬</Text>
              <Text style={styles.menuItemText}>Current Session</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleSetupPress}>
              <Text style={styles.menuItemIcon}>⚙️</Text>
              <Text style={styles.menuItemText}>Service Credentials & OAuth</Text>
            </TouchableOpacity>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Student OS v3.6 • AI Assistant</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  backdrop: {
    flex: 1,
  },
  drawerPanel: {
    width: 280,
    maxWidth: '80%',
    height: '100%',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 12 : 36) : 20,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderRightColor: colors.cardBorder,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerLogoImg: {
    width: 26,
    height: 26,
    borderRadius: 7,
    marginRight: 10,
  },
  logoTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 18,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  newChatIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  newChatText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  menuSection: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  menuItemText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
});

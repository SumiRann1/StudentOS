import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fetchSetupStatus } from '../services/setupApi';
import { startOAuthLogin } from '../services/authApi';

export default function SetupModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (visible) {
      loadStatus();
    }
  }, [visible]);

  const loadStatus = async () => {
    setLoading(true);
    const data = await fetchSetupStatus();
    setStatus(data);
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setFeedback(null);
    try {
      await startOAuthLogin('google');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Google Sign-In failed' });
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.drawerBg, borderColor: colors.cardBorderHover }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>⚙️</Text>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Integrations & Service Health</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>ACTIVE SERVICE STATUS</Text>

            {loading && !status ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <View style={styles.statusCards}>
                {/* Classroom */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>📚 Google Classroom</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status?.classroom?.token_exists ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                    <Text style={[styles.statusLine, { color: status?.classroom?.token_exists ? colors.emerald : colors.error }]}>
                      {status?.classroom?.token_exists ? '● Active & Syncing' : '○ Login Required'}
                    </Text>
                  </View>
                </View>

                {/* Email */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>✉️ Gmail Service</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status?.email?.token_exists ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                    <Text style={[styles.statusLine, { color: status?.email?.token_exists ? colors.emerald : colors.error }]}>
                      {status?.email?.token_exists ? '● Active & Syncing' : '○ Login Required'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.sectionHeader, { color: colors.primary }]}>ACCOUNT AUTHENTICATION</Text>
            <Text style={[styles.helpText, { color: colors.textSecondary }]}>
              Sign in with your Google account to enable instant background synchronization for Classroom assignments, Gmail notices, and academic tools.
            </Text>

            <TouchableOpacity style={[styles.googleAuthBtn, { backgroundColor: colors.primary }]} onPress={handleGoogleSignIn} activeOpacity={0.85}>
              <Text style={styles.googleAuthBtnText}>Connect Google Account 🚀</Text>
            </TouchableOpacity>

            {feedback && (
              <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>{feedback.message}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    maxHeight: '85%',
    padding: 22,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        }
      : {}),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
  },
  scrollBody: {
    paddingVertical: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 10,
  },
  statusCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusLine: {
    fontSize: 11,
    fontWeight: '700',
  },
  googleAuthBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
  },
  googleAuthBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14.5,
    letterSpacing: 0.3,
  },
  helpText: {
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 6,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  feedbackText: {
    fontSize: 12,
  },
});


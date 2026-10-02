import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { fetchSetupStatus, saveSetupData, triggerServiceAuth } from '../services/setupApi';
import { startOAuthLogin } from '../services/authApi';

export default function SetupModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState('classroom');
  const [credentialsJson, setCredentialsJson] = useState('');
  const [tokenJson, setTokenJson] = useState('');
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

  const handleAuthenticate = async () => {
    setFeedback(null);
    setLoading(true);
    try {
      const res = await triggerServiceAuth(selectedService);
      setFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      await loadStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Authentication trigger failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFeedback(null);
    try {
      await startOAuthLogin('google');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Google Sign-In failed' });
    }
  };

  const handleSave = async () => {
    setFeedback(null);
    let creds = null;
    let tok = null;

    try {
      if (credentialsJson.trim()) {
        creds = JSON.parse(credentialsJson);
      }
      if (tokenJson.trim()) {
        tok = JSON.parse(tokenJson);
      }

      if (!creds && !tok) {
        setFeedback({ type: 'error', message: 'Please paste credentials or token JSON.' });
        return;
      }

      setLoading(true);
      const res = await saveSetupData(selectedService, creds, tok);
      setFeedback({ type: 'success', message: res.message });
      setCredentialsJson('');
      setTokenJson('');
      await loadStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Invalid JSON format' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.drawerBg, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Service Integrations & OAuth</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>Service Credentials Status</Text>

            {loading && !status ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.statusCards}>
                {/* Classroom */}
                <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>📚 Google Classroom</Text>
                  <Text style={[styles.statusLine, { color: colors.textSecondary }]}>
                    Credentials: {status?.classroom?.credentials_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                  <Text style={[styles.statusLine, { color: colors.textSecondary }]}>
                    OAuth Token: {status?.classroom?.token_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                </View>

                {/* Email */}
                <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>✉️ Gmail Service</Text>
                  <Text style={[styles.statusLine, { color: colors.textSecondary }]}>
                    Credentials: {status?.email?.credentials_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                  <Text style={[styles.statusLine, { color: colors.textSecondary }]}>
                    OAuth Token: {status?.email?.token_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionHeader, { color: colors.primary }]}>User Account</Text>
            <TouchableOpacity style={styles.googleAuthBtn} onPress={handleGoogleSignIn}>
              <Text style={styles.googleAuthBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Service Selector */}
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>Configure & Authenticate</Text>
            <View style={[styles.serviceSelector, { backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={[styles.serviceTab, selectedService === 'classroom' && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedService('classroom')}
              >
                <Text style={[styles.serviceTabText, { color: selectedService === 'classroom' ? '#FFFFFF' : colors.textMuted }]}>
                  Classroom
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.serviceTab, selectedService === 'email' && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedService('email')}
              >
                <Text style={[styles.serviceTabText, { color: selectedService === 'email' ? '#FFFFFF' : colors.textMuted }]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.authBtn, { backgroundColor: colors.primary }]} onPress={handleAuthenticate} disabled={loading}>
              <Text style={styles.authBtnText}>
                Authenticate {selectedService === 'classroom' ? 'Classroom' : 'Email'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.helpText, { color: colors.textMuted }]}>
              Alternatively, run in terminal:{' '}
              <Text style={[styles.codeText, { color: colors.secondary }]}>python scripts/authenticate_oauth.py --service {selectedService}</Text>
            </Text>

            {/* Input fields */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Credentials JSON:</Text>
            <TextInput
              style={[styles.jsonInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              placeholder='Paste content of oauth credentials.json...'
              placeholderTextColor={colors.textMuted}
              multiline
              value={credentialsJson}
              onChangeText={setCredentialsJson}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Token JSON (Optional):</Text>
            <TextInput
              style={[styles.jsonInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              placeholder='Paste content of oauth token.json...'
              placeholderTextColor={colors.textMuted}
              multiline
              value={tokenJson}
              onChangeText={setTokenJson}
            />

            {feedback && (
              <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>{feedback.message}</Text>
              </View>
            )}

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Configuration'}</Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 36) : 20,
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 16,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
  },
  scrollBody: {
    paddingVertical: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  statusCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusLine: {
    fontSize: 10,
    marginTop: 2,
  },
  serviceSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  serviceTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  serviceTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  jsonInput: {
    borderRadius: 8,
    padding: 10,
    height: 70,
    fontSize: 11,
    borderWidth: 1,
    marginBottom: 10,
  },
  feedbackBox: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  feedbackError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  feedbackText: {
    fontSize: 11,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  authBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  authBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  googleAuthBtn: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  googleAuthBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  helpText: {
    fontSize: 10,
    marginBottom: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

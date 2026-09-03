import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { colors } from '../theme/colors';
import { fetchSetupStatus, saveSetupData } from '../services/setupApi';

export default function SetupModal({ visible, onClose }) {
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚙️ Service Setup & OAuth</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            <Text style={styles.sectionHeader}>Service Credentials Status</Text>

            {loading && !status ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
            ) : (
              <View style={styles.statusCards}>
                {/* Classroom */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📚 Google Classroom</Text>
                  <Text style={styles.statusLine}>
                    Credentials: {status?.classroom?.credentials_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                  <Text style={styles.statusLine}>
                    OAuth Token: {status?.classroom?.token_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                </View>

                {/* Email */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>✉️ Gmail Service</Text>
                  <Text style={styles.statusLine}>
                    Credentials: {status?.email?.credentials_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                  <Text style={styles.statusLine}>
                    OAuth Token: {status?.email?.token_exists ? '✅ Configured' : '❌ Missing'}
                  </Text>
                </View>
              </View>
            )}

            {/* Service Selector */}
            <Text style={styles.sectionHeader}>Configure OAuth Files</Text>
            <View style={styles.serviceSelector}>
              <TouchableOpacity
                style={[styles.serviceTab, selectedService === 'classroom' && styles.serviceTabActive]}
                onPress={() => setSelectedService('classroom')}
              >
                <Text style={[styles.serviceTabText, selectedService === 'classroom' && styles.serviceTabTextActive]}>
                  Classroom
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.serviceTab, selectedService === 'email' && styles.serviceTabActive]}
                onPress={() => setSelectedService('email')}
              >
                <Text style={[styles.serviceTabText, selectedService === 'email' && styles.serviceTabTextActive]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input fields */}
            <Text style={styles.inputLabel}>Credentials JSON:</Text>
            <TextInput
              style={styles.jsonInput}
              placeholder='Paste content of oauth credentials.json...'
              placeholderTextColor={colors.textMuted}
              multiline
              value={credentialsJson}
              onChangeText={setCredentialsJson}
            />

            <Text style={styles.inputLabel}>Token JSON (Optional):</Text>
            <TextInput
              style={styles.jsonInput}
              placeholder='Paste content of oauth token.json...'
              placeholderTextColor={colors.textMuted}
              multiline
              value={tokenJson}
              onChangeText={setTokenJson}
            />

            {feedback && (
              <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
                <Text style={styles.feedbackText}>{feedback.message}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
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
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 18,
  },
  scrollBody: {
    paddingVertical: 12,
  },
  sectionHeader: {
    color: colors.primary,
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
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusLine: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  serviceSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
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
  serviceTabActive: {
    backgroundColor: colors.primary,
  },
  serviceTabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  serviceTabTextActive: {
    color: '#FFFFFF',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  jsonInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: 8,
    padding: 10,
    height: 70,
    fontSize: 11,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: colors.textPrimary,
    fontSize: 11,
  },
  saveBtn: {
    backgroundColor: colors.secondary,
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
});

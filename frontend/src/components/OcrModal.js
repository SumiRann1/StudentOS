import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../config/api';

const COLUMN_WIDTHS = [110, 180, 80, 80, 100, 130];

const markdownRules = {
  table: (node, children, parent, styles) => (
    <ScrollView
      key={node.key}
      horizontal
      showsHorizontalScrollIndicator={true}
      style={{ marginVertical: 8, width: '100%' }}
      contentContainerStyle={{ minWidth: '100%' }}
    >
      <View style={styles.table}>{children}</View>
    </ScrollView>
  ),
  tr: (node, children, parent, styles) => (
    <View key={node.key} style={styles.tr}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        const cellWidth = COLUMN_WIDTHS[index] || 110;
        return React.cloneElement(child, {
          style: [child.props.style, { width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }],
        });
      })}
    </View>
  ),
};

export default function OcrModal({ visible, onClose, userName }) {
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedMimeType, setSelectedMimeType] = useState('image/jpeg');
  const [previewUri, setPreviewUri] = useState(null);
  const [base64Data, setBase64Data] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  
  // Step Wizard State (Steps 1, 2, 3)
  const [activeStep, setActiveStep] = useState(1);

  const fileInputRef = useRef(null);

  const handleSelectFileClick = async () => {
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // Mobile (Expo Go / React Native)
      try {
        const ImagePicker = require('expo-image-picker');
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
          setErrorMsg('Permission to access photo gallery is required!');
          return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          base64: true,
        });

        if (!pickerResult.canceled && pickerResult.assets?.[0]) {
          const asset = pickerResult.assets[0];
          setPreviewUri(asset.uri);
          
          const filename = asset.fileName || asset.uri.split('/').pop() || 'uploaded_image.jpg';
          const ext = filename.split('.').pop().toLowerCase();
          const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg');

          setSelectedFileName(filename);
          setSelectedMimeType(mimeType);

          if (asset.base64) {
            setBase64Data(asset.base64);
          } else {
            setBase64Data(asset.uri);
          }

          setErrorMsg(null);
          setOcrResult('');
          setActiveStep(1);
        }
      } catch (err) {
        setErrorMsg('To select images on mobile, install expo-image-picker: npx expo install expo-image-picker');
      }
    }
  };

  const handleFileChange = (event) => {
    const file = event.target?.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setSelectedMimeType(file.type || 'image/jpeg');
      setErrorMsg(null);
      setOcrResult('');
      setActiveStep(1);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        setPreviewUri(result);
        setBase64Data(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRunOcr = async () => {
    if (!base64Data) {
      setErrorMsg('Please select an image file first.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setOcrResult('');

    try {
      const response = await fetch(`${API_BASE_URL}/grader/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: base64Data,
          user_name: userName || 'Student',
          content_type: selectedMimeType,
          filename: selectedFileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.answered_text || data.extracted_text || 'No response generated.';
      setOcrResult(answer);
      setActiveStep(1);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to analyze transcript and calculate GPA.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFileName('');
    setSelectedMimeType('image/jpeg');
    setPreviewUri(null);
    setBase64Data(null);
    setOcrResult('');
    setErrorMsg(null);
    setActiveStep(1);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Helper to parse 3 distinct sections from LLM response
  const parseSections = (markdownText) => {
    if (!markdownText) return [];

    const rawParts = markdownText
      .split(/---SECTION_\d+---/g)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawParts.length >= 3) {
      return [
        { id: 1, title: 'Summary & GPA', icon: '🏆', content: rawParts[0] },
        { id: 2, title: 'Course Table', icon: '📋', content: rawParts[1] },
        { id: 3, title: 'Calculation', icon: '🧮', content: rawParts[2] },
      ];
    }

    // Fallback if delimiters were missing
    return [
      { id: 1, title: 'Summary & GPA', icon: '🏆', content: markdownText },
      { id: 2, title: 'Course Table', icon: '📋', content: markdownText },
      { id: 3, title: 'Calculation', icon: '🧮', content: markdownText },
    ];
  };

  const sections = parseSections(ocrResult);
  const currentSection = sections.find((s) => s.id === activeStep) || sections[0];

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {ocrResult ? '📊 Grade & GPA Report' : '🎓 Academic Grade & GPA Calculator'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION 1: UPLOAD SCREEN (Shown before calculation) */}
          {!ocrResult && (
            <ScrollView contentContainerStyle={styles.scrollBody}>
              <Text style={styles.subtitle}>
                Upload a photo of your transcript or grade sheet to automatically extract courses, calculate GPA/SGPA, and view a step-by-step breakdown.
              </Text>

              {/* Hidden File Input for Web */}
              {Platform.OS === 'web' && (
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              )}

              {/* Select Image Button */}
              <TouchableOpacity style={styles.uploadBox} onPress={handleSelectFileClick} activeOpacity={0.7}>
                <Text style={styles.uploadIcon}>📷</Text>
                <Text style={styles.uploadText}>
                  {selectedFileName ? `Selected: ${selectedFileName}` : 'Click to select an image from your device'}
                </Text>
              </TouchableOpacity>

              {/* Image Preview */}
              {previewUri && (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
                </View>
              )}

              {/* Action Buttons */}
              {base64Data && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.submitBtn]}
                    onPress={handleRunOcr}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.actionBtnText}>⚡ Calculate Grade & GPA</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, styles.resetBtn]} onPress={handleReset} disabled={loading}>
                    <Text style={styles.resetBtnText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error Message */}
              {errorMsg && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* SECTION 2: FOCUSED 3-STEP REPORT VIEW (Shown after calculation) */}
          {ocrResult && (
            <View style={styles.reportContainer}>
              {/* Step Tab Bar */}
              <View style={styles.tabContainer}>
                {sections.map((sec) => (
                  <TouchableOpacity
                    key={sec.id}
                    style={[styles.tabChip, activeStep === sec.id && styles.tabChipActive]}
                    onPress={() => setActiveStep(sec.id)}
                  >
                    <Text style={[styles.tabChipText, activeStep === sec.id && styles.tabChipTextActive]}>
                      {sec.icon} Step {sec.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Current Step Content Card (Controlled Height) */}
              <View style={styles.stepCard}>
                <ScrollView style={styles.stepContentScroll} contentContainerStyle={styles.stepContentInner}>
                  <Markdown style={markdownStyles} rules={markdownRules}>
                    {currentSection ? currentSection.content : ''}
                  </Markdown>
                </ScrollView>
              </View>

              {/* Step Navigation Controls & Footer */}
              <View style={styles.footerContainer}>
                <View style={styles.navRow}>
                  <TouchableOpacity
                    style={[styles.navBtn, activeStep === 1 && styles.navBtnDisabled]}
                    onPress={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                    disabled={activeStep === 1}
                  >
                    <Text style={[styles.navBtnText, activeStep === 1 && styles.navBtnTextDisabled]}>
                      ← Previous
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.stepBadgeText}>
                    Step {activeStep} of {sections.length}
                  </Text>

                  {activeStep < sections.length ? (
                    <TouchableOpacity
                      style={[styles.navBtn, styles.navBtnPrimary]}
                      onPress={() => setActiveStep((prev) => Math.min(sections.length, prev + 1))}
                    >
                      <Text style={styles.navBtnPrimaryText}>Next Step ➔</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.navBtn, styles.navBtnSuccess]} onPress={handleClose}>
                      <Text style={styles.navBtnPrimaryText}>Done ✓</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* New Upload Reset Button */}
                <TouchableOpacity style={styles.reUploadBtn} onPress={handleReset}>
                  <Text style={styles.reUploadBtnText}>📷 Upload Another Image</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const markdownStyles = {
  body: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  heading1: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 8,
  },
  heading2: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  heading3: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  strong: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  table: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    marginVertical: 8,
    backgroundColor: colors.background,
  },
  tr: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  th: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: '700',
    color: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#334155',
    justifyContent: 'center',
  },
  td: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    borderWidth: 0.5,
    borderColor: '#334155',
    justifyContent: 'center',
  },
  blockquote: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 8,
    borderRadius: 4,
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
    paddingTop: Platform.OS === 'android' ? 36 : 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    padding: 20,
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
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 20,
  },
  scrollBody: {
    paddingVertical: 14,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginBottom: 14,
  },
  uploadIcon: {
    fontSize: 30,
    marginBottom: 6,
  },
  uploadText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewContainer: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  resetBtn: {
    paddingHorizontal: 16,
    backgroundColor: '#3A3A3A',
  },
  resetBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  reportContainer: {
    paddingVertical: 14,
    flexDirection: 'column',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    height: 290,
  },
  stepContentScroll: {
    flex: 1,
  },
  stepContentInner: {
    paddingBottom: 10,
  },
  footerContainer: {
    marginTop: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  navBtnTextDisabled: {
    color: colors.textMuted,
  },
  navBtnPrimary: {
    backgroundColor: colors.primary,
  },
  navBtnSuccess: {
    backgroundColor: '#10B981',
  },
  navBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  stepBadgeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  reUploadBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  reUploadBtnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

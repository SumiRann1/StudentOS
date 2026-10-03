import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const PROMPT_SUGGESTIONS = [
  { icon: '📅', text: 'What is on my timetable today?' },
  { icon: '📚', text: 'List my Google Classroom assignments' },
  { icon: '✉️', text: 'Check unread student emails' },
  { icon: '📝', text: 'Help me plan my study schedule' },
  { icon: '📊', text: 'Analyze transcript for GPA requirements' },
];

export default function ChatInput({
  query,
  setQuery,
  onSend,
  disabled,
  onFocus,
  showChips = true,
  onOpenOcr,
}) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const canSend = query.trim().length > 0 && !disabled;

  return (
    <View style={[styles.inputDockContainer, { backgroundColor: colors.background }]}>
      {/* Quick Suggestion Chips */}
      {showChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScrollContainer}
        >
          {PROMPT_SUGGESTIONS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.chipPill,
                {
                  backgroundColor: colors.cardBackgroundTranslucent,
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={() => setQuery(item.text)}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <Text style={styles.chipIcon}>{item.icon}</Text>
              <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Floating Pill Input Box */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.pillDock,
          {
            backgroundColor: colors.cardBackgroundTranslucent,
            borderColor: isFocused ? colors.primary : colors.cardBorderHover,
            ...(Platform.OS === 'web' && isFocused ? { boxShadow: `0 0 16px ${colors.primaryGlow}` } : {}),
          },
        ]}
      >
        {/* Quick OCR Attachment Action */}
        {onOpenOcr && (
          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorderHover }]}
            onPress={onOpenOcr}
            disabled={disabled}
            activeOpacity={0.75}
          >
            <Text style={styles.attachIcon}>📷</Text>
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.textInput, { color: colors.textPrimary }]}
          placeholder="Ask Student OS..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            setIsFocused(true);
            if (onFocus) onFocus();
          }}
          onBlur={() => setIsFocused(false)}
          multiline
          maxLength={1000}
          editable={!disabled}
          underlineColorAndroid="transparent"
        />

        <TouchableOpacity
          style={[
            styles.sendBtn,
            canSend
              ? { backgroundColor: colors.primary }
              : { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
          ]}
          onPress={onSend}
          disabled={!canSend}
          activeOpacity={0.8}
        >
          <Text style={[styles.sendIconText, { color: canSend ? '#FFFFFF' : colors.textMuted }]}>
            ↑
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Footer Branding Disclaimer */}
      <Text style={[styles.disclaimerLabel, { color: colors.textMuted }]}>
        Student OS • Unified Academic Workspace
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputDockContainer: {
    width: '100%',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 18 : 12,
    alignItems: 'center',
    zIndex: 150,
  },
  chipsScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  chipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillDock: {
    width: '94%',
    maxWidth: 840,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 54,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }
      : {}),
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
  },
  attachIcon: {
    fontSize: 15,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
    paddingRight: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIconText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: -2,
  },
  disclaimerLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});


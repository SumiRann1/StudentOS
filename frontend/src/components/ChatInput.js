import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const PROMPT_SUGGESTIONS = [
  { icon: '📅', text: 'What is on my timetable today?' },
  { icon: '📚', text: 'List my Google Classroom assignments' },
  { icon: '✉️', text: 'Check unread student emails' },
  { icon: '📝', text: 'Help me plan my study schedule' },
  { icon: '📊', text: 'Analyze grade requirements for my target GPA' },
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
            borderColor: isFocused ? colors.primary : colors.cardBorder,
          },
        ]}
      >
        {/* Quick OCR Attachment Action */}
        {onOpenOcr && (
          <TouchableOpacity
            style={[styles.attachBtn, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
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
              : { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  pillDock: {
    width: '92%',
    maxWidth: 820,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 54,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }
      : {}),
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
    fontWeight: '700',
    marginTop: -2,
  },
  disclaimerLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});

import React from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const PROMPT_SUGGESTIONS = [
  { icon: '📅', text: 'What is on my timetable today?' },
  { icon: '📚', text: 'List my Google Classroom assignments' },
  { icon: '✉️', text: 'Check unread student emails' },
  { icon: '📝', text: 'Help me plan my study schedule' },
];

export default function ChatInput({ query, setQuery, onSend, disabled, onFocus, showChips = true }) {
  const canSend = query.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      {/* Quick Suggestion Chips */}
      {showChips && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.chipsContainer}
        >
          {PROMPT_SUGGESTIONS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.chip}
              onPress={() => setQuery(item.text)}
              disabled={disabled}
            >
              <Text style={styles.chipIcon}>{item.icon}</Text>
              <Text style={styles.chipText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Floating Pill Input Bar (ChatGPT Style) */}
      <View style={styles.pillContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message Student OS..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onFocus={onFocus}
          multiline
          maxLength={1000}
          editable={!disabled}
        />

        <TouchableOpacity
          style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!canSend}
        >
          <Text style={[styles.sendIcon, canSend ? styles.sendIconActive : styles.sendIconDisabled]}>
            ↑
          </Text>
        </TouchableOpacity>
      </View>

      {/* ChatGPT Style Disclaimer Footer */}
      <Text style={styles.disclaimerText}>
        Student OS can make mistakes. Verify important academic info.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.background,
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  chipIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  pillContainer: {
    width: '92%',
    maxWidth: 800,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.cardBackground,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 52,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: 10,
    paddingBottom: 10,
    paddingRight: 10,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  sendButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  sendButtonDisabled: {
    backgroundColor: '#343541',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -2,
  },
  sendIconActive: {
    color: '#000000',
  },
  sendIconDisabled: {
    color: '#676767',
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
});

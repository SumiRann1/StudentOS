import React from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const PROMPT_SUGGESTIONS = [
  '📅 What is on my timetable for today?',
  '📚 List my Google Classroom assignments',
  '✉️ Check unread student emails',
  '📝 Help me plan my study schedule',
];

export default function ChatInput({ query, setQuery, onSend, disabled }) {
  return (
    <View style={styles.container}>
      {/* Quick Prompt Suggestion Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.chipsContainer}
      >
        {PROMPT_SUGGESTIONS.map((prompt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.chip}
            onPress={() => setQuery(prompt.replace(/^[^\s]+\s/, ''))}
            disabled={disabled}
          >
            <Text style={styles.chipText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask Student OS anything..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          multiline
          maxLength={1000}
          editable={!disabled}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!query.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={onSend}
          disabled={!query.trim() || disabled}
        >
          <Text style={styles.sendButtonText}>Send ➔</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 8,
    paddingBottom: 16,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 6,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  inputBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sendButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.cardBorder,
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

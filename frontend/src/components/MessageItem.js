import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function MessageItem({ message }) {
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.agentContainer]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        {/* Render tool call execution status badge if agent invoked a tool */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={styles.toolsContainer}>
            {message.toolCalls.map((tool, idx) => (
              <View key={idx} style={styles.toolBadge}>
                <Text style={styles.toolText}>⚡ Executing: {tool.name}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.messageText, isUser ? styles.userText : styles.agentText]}>
          {message.text || (message.isStreaming ? 'Thinking...' : '')}
        </Text>

        {message.isStreaming && (
          <Text style={styles.cursorText}>▌</Text>
        )}
      </View>

      {isUser && (
        <View style={[styles.avatar, styles.userAvatar]}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  agentContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userAvatar: {
    marginRight: 0,
    marginLeft: 8,
    backgroundColor: colors.primaryGlow,
  },
  avatarText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: colors.agentBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  toolsContainer: {
    marginBottom: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  toolBadge: {
    backgroundColor: colors.toolBadgeBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.toolBadgeBorder,
  },
  toolText: {
    color: colors.toolBadgeText,
    fontSize: 10,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: colors.userBubbleText,
  },
  agentText: {
    color: colors.agentBubbleText,
  },
  cursorText: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 2,
  },
});

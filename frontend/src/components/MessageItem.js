import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { colors } from '../theme/colors';

// Animated Blinking Cursor Component (ChatGPT Style)
function BlinkingCursor() {
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0.15,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [cursorOpacity]);

  return (
    <Animated.Text style={[styles.cursorText, { opacity: cursorOpacity }]}>
      {' ▋'}
    </Animated.Text>
  );
}

// Animated Pulsing Thinking Indicator
function ThinkingIndicator() {
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseOpacity]);

  return (
    <View style={styles.thinkingRow}>
      <Animated.View style={[styles.thinkingDot, { opacity: pulseOpacity }]} />
      <Text style={styles.thinkingText}>Thinking...</Text>
    </View>
  );
}

export default function MessageItem({ message }) {
  const isUser = message.sender === 'user';
  const isThinking = message.isStreaming && !message.text;

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.agentWrapper]}>
      {!isUser && (
        <Image source={require('../../assets/app-logo.png')} style={styles.agentAvatarImg} />
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        {/* Render tool call execution status badges */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={styles.toolsContainer}>
            {message.toolCalls.map((tool, idx) => (
              <View key={idx} style={styles.toolBadge}>
                <Text style={styles.toolText}>⚡ {tool.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Message Content or Thinking State */}
        {isThinking ? (
          <ThinkingIndicator />
        ) : (
          <Text style={[styles.messageText, isUser ? styles.userText : styles.agentText]}>
            {message.text}
            {message.isStreaming && <BlinkingCursor />}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  agentWrapper: {
    justifyContent: 'flex-start',
  },
  agentAvatarImg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 12,
    marginTop: 2,
  },
  bubble: {
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: 'transparent',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  toolsContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolBadge: {
    backgroundColor: colors.toolBadgeBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.toolBadgeBorder,
  },
  toolText: {
    color: colors.toolBadgeText,
    fontSize: 11,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  userText: {
    color: colors.userBubbleText,
  },
  agentText: {
    color: colors.agentBubbleText,
  },
  cursorText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  thinkingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

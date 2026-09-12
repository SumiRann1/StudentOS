import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../theme/colors';

const COLUMN_WIDTHS = [125, 210, 115, 140, 140];

// Custom Markdown Rules (Wrap Tables in Horizontal ScrollView with Aligned Columns)
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
        const cellWidth = COLUMN_WIDTHS[index] || 140;
        return React.cloneElement(child, {
          style: [child.props.style, { width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }],
        });
      })}
    </View>
  ),
};

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

  const handleLinkPress = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Couldn't open link:", url, err));
    }
    return true;
  };

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.agentWrapper]}>
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
        ) : isUser ? (
          <Text style={[styles.messageText, styles.userText]}>
            {message.text}
          </Text>
        ) : (
          <View style={styles.agentContentContainer}>
            <Markdown style={markdownStyles} rules={markdownRules} onLinkPress={handleLinkPress}>
              {message.text || ''}
            </Markdown>
            {message.isStreaming && <BlinkingCursor />}
          </View>
        )}
      </View>
    </View>
  );
}

const markdownStyles = {
  body: {
    color: colors.agentBubbleText,
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  heading2: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  strong: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: '#60A5FA',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  code_inline: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#F8FAFC',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 13,
  },
  code_block: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  fence: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    fontSize: 13,
  },
  table: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    marginVertical: 8,
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
    color: colors.agentBubbleText,
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
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
};

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
  bubble: {
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: colors.userBubble,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    maxWidth: '85%',
  },
  agentBubble: {
    backgroundColor: 'transparent',
    paddingVertical: 2,
    paddingHorizontal: 4,
    maxWidth: '100%',
    flex: 1,
  },
  agentContentContainer: {
    width: '100%',
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

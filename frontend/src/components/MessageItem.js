import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Linking } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const COLUMN_WIDTHS = [130, 220, 120, 140, 140];

// Custom Markdown Rules (Wrap Tables in Horizontal ScrollView)
const markdownRules = {
  table: (node, children, parent, styles) => (
    <ScrollView
      key={node.key}
      horizontal
      showsHorizontalScrollIndicator={true}
      style={{ marginVertical: 10, width: '100%' }}
      contentContainerStyle={{ minWidth: '100%' }}
    >
      <View style={styles.table}>
        {React.Children.toArray(children).filter((child) => React.isValidElement(child))}
      </View>
    </ScrollView>
  ),
  tr: (node, children, parent, styles) => (
    <View key={node.key} style={styles.tr}>
      {React.Children.toArray(children)
        .filter((child) => React.isValidElement(child))
        .map((child, index) => {
          const cellWidth = COLUMN_WIDTHS[index] || 140;
          return React.cloneElement(child, {
            style: [child.props.style, { width: cellWidth, minWidth: cellWidth, maxWidth: cellWidth }],
          });
        })}
    </View>
  ),
};

// Animated Blinking Cursor Component
function BlinkingCursor({ primaryColor }) {
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
    <Animated.Text style={[styles.cursorText, { opacity: cursorOpacity, color: primaryColor }]}>
      {' ▋'}
    </Animated.Text>
  );
}

// Animated Pulsing Thinking Indicator
function ThinkingIndicator({ primaryColor, textMutedColor }) {
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
      <Animated.View style={[styles.thinkingDot, { opacity: pulseOpacity, backgroundColor: primaryColor }]} />
      <Text style={[styles.thinkingText, { color: textMutedColor }]}>Thinking...</Text>
    </View>
  );
}

export default function MessageItem({ message }) {
  const { colors } = useTheme();
  const isUser = message.sender === 'user';
  const isThinking = message.isStreaming && !message.text;

  const handleLinkPress = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error("Couldn't open link:", url, err));
    }
    return true;
  };

  const dynamicMarkdownStyles = {
    body: {
      color: colors.agentBubbleText,
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: '700',
      marginTop: 12,
      marginBottom: 8,
    },
    heading2: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: '700',
      marginTop: 10,
      marginBottom: 6,
    },
    heading3: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: '600',
      marginTop: 8,
      marginBottom: 4,
    },
    strong: {
      fontWeight: '700',
      color: colors.textPrimary,
    },
    em: {
      fontStyle: 'italic',
    },
    link: {
      color: colors.cyan || colors.primary,
      fontWeight: '600',
      textDecorationLine: 'underline',
    },
    code_inline: {
      backgroundColor: colors.cardBackground,
      color: colors.textPrimary,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 13,
    },
    code_block: {
      backgroundColor: colors.backgroundSecondary || '#0F172A',
      borderRadius: 10,
      padding: 14,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    fence: {
      backgroundColor: colors.backgroundSecondary || '#0F172A',
      color: colors.textPrimary,
      borderRadius: 10,
      padding: 14,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      fontSize: 13,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 10,
      marginVertical: 10,
      backgroundColor: colors.cardBackground,
    },
    tr: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    th: {
      backgroundColor: colors.cardBackgroundTranslucent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontWeight: '700',
      color: colors.textPrimary,
      fontSize: 12.5,
      borderWidth: 0.5,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
    },
    td: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.agentBubbleText,
      fontSize: 12.5,
      borderWidth: 0.5,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
    },
    blockquote: {
      backgroundColor: colors.primaryGlow,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      marginVertical: 10,
      borderRadius: 6,
    },
    bullet_list: {
      marginVertical: 6,
    },
    ordered_list: {
      marginVertical: 6,
    },
    list_item: {
      marginVertical: 3,
    },
  };

  return (
    <View style={[styles.wrapper, isUser ? styles.userWrapper : styles.agentWrapper]}>
      {/* Agent Avatar Badge */}
      {!isUser && (
        <View style={[styles.agentAvatarContainer, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
          <Text style={styles.avatarIcon}>🤖</Text>
        </View>
      )}

      {/* Bubble Container */}
      <View style={isUser ? [styles.userBubble, { backgroundColor: colors.userBubble, borderColor: colors.userBubbleBorder }] : [styles.bubble, styles.agentBubble]}>
        {/* Render tool call execution status badges */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <View style={styles.toolsContainer}>
            {message.toolCalls.map((tool, idx) => (
              <View key={idx} style={[styles.toolBadge, { backgroundColor: colors.toolBadgeBg, borderColor: colors.toolBadgeBorder }]}>
                <Text style={styles.toolDot}>⚡</Text>
                <Text style={[styles.toolText, { color: colors.toolBadgeText }]}>{tool.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Message Content or Thinking State */}
        {isThinking ? (
          <ThinkingIndicator primaryColor={colors.primary} textMutedColor={colors.textMuted} />
        ) : isUser ? (
          <Text style={[styles.messageText, { color: colors.userBubbleText }]}>
            {message.text}
          </Text>
        ) : (
          <View style={styles.agentContentContainer}>
            <Markdown style={dynamicMarkdownStyles} rules={markdownRules} onLinkPress={handleLinkPress}>
              {message.text || ''}
            </Markdown>
            {message.isStreaming && <BlinkingCursor primaryColor={colors.primary} />}
          </View>
        )}
      </View>

      {/* User Avatar Badge */}
      {isUser && (
        <View style={[styles.userAvatarContainer, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    flexDirection: 'row',
    marginVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  userWrapper: {
    justifyContent: 'flex-end',
    marginLeft: 'auto',
  },
  agentWrapper: {
    justifyContent: 'flex-start',
  },
  agentAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 2,
    flexShrink: 0,
  },
  userAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 2,
    flexShrink: 0,
  },
  avatarIcon: {
    fontSize: 16,
  },
  bubble: {
    flex: 1,
  },
  userBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderTopRightRadius: 4,
    borderWidth: 1,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  agentBubble: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    width: '100%',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  toolDot: {
    fontSize: 11,
  },
  toolText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  cursorText: {
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
    marginRight: 8,
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

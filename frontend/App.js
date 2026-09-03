import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { colors } from './src/theme/colors';
import Header from './src/components/Header';
import MessageItem from './src/components/MessageItem';
import ChatInput from './src/components/ChatInput';
import SetupModal from './src/components/SetupModal';
import { streamAgentResponse } from './src/services/chatStream';
import { fetchSetupStatus } from './src/services/setupApi';

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      sender: 'agent',
      text: '👋 Hi! I am your Student OS Assistant. I can help manage your Google Classroom assignments, timetable, and student emails. What would you like to check today?',
      toolCalls: [],
      isStreaming: false,
    },
  ]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSetupVisible, setIsSetupVisible] = useState(false);
  
  const flatListRef = useRef(null);
  const threadIdRef = useRef(`thread_${Date.now()}`);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    const status = await fetchSetupStatus();
    if (status) {
      setIsOnline(true);
    } else {
      setIsOnline(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleSend = async () => {
    if (!query.trim() || isStreaming) return;

    const userText = query.trim();
    setQuery('');
    
    const userMsgId = `msg_${Date.now()}_user`;
    const agentMsgId = `msg_${Date.now()}_agent`;

    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
      },
      {
        id: agentMsgId,
        sender: 'agent',
        text: '',
        toolCalls: [],
        isStreaming: true,
      },
    ];

    setMessages(newMessages);
    setIsStreaming(true);
    scrollToBottom();

    await streamAgentResponse(userText, threadIdRef.current, {
      onChunk: (chunkText) => {
        setMessages((prevMsgs) => {
          return prevMsgs.map((msg) => {
            if (msg.id === agentMsgId) {
              return {
                ...msg,
                text: msg.text + chunkText,
              };
            }
            return msg;
          });
        });
        scrollToBottom();
      },
      onToolStart: (toolName, toolArgs) => {
        setMessages((prevMsgs) => {
          return prevMsgs.map((msg) => {
            if (msg.id === agentMsgId) {
              const existingTools = msg.toolCalls || [];
              if (!existingTools.some((t) => t.name === toolName)) {
                return {
                  ...msg,
                  toolCalls: [...existingTools, { name: toolName, args: toolArgs }],
                };
              }
            }
            return msg;
          });
        });
      },
      onError: (errMsg) => {
        setMessages((prevMsgs) => {
          return prevMsgs.map((msg) => {
            if (msg.id === agentMsgId) {
              return {
                ...msg,
                text: msg.text + `\n⚠️ Error: ${errMsg}`,
                isStreaming: false,
              };
            }
            return msg;
          });
        });
        setIsStreaming(false);
      },
      onDone: () => {
        setMessages((prevMsgs) => {
          return prevMsgs.map((msg) => {
            if (msg.id === agentMsgId) {
              return {
                ...msg,
                isStreaming: false,
              };
            }
            return msg;
          });
        });
        setIsStreaming(false);
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.cardBackground} />

      {/* Header */}
      <Header
        isOnline={isOnline}
        onOpenSetup={() => setIsSetupVisible(true)}
      />

      {/* Main Chat Stream Container */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageItem message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
        />

        {/* Input Bar & Suggestion Chips */}
        <ChatInput
          query={query}
          setQuery={setQuery}
          onSend={handleSend}
          disabled={isStreaming}
        />
      </KeyboardAvoidingView>

      {/* Credentials & Service Setup Modal */}
      <SetupModal
        visible={isSetupVisible}
        onClose={() => {
          setIsSetupVisible(false);
          checkServerHealth();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 6 : 36) : 0,
  },
  chatContainer: {
    flex: 1,
    width: '100%',
  },
  messageList: {
    width: '100%',
    paddingVertical: 12,
  },
});

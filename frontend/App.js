import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, StatusBar, KeyboardAvoidingView, Platform, Text, TouchableOpacity } from 'react-native';
import { colors } from './src/theme/colors';
import Header from './src/components/Header';
import MessageItem from './src/components/MessageItem';
import ChatInput from './src/components/ChatInput';
import SetupModal from './src/components/SetupModal';
import SidebarDrawer from './src/components/SidebarDrawer';
import { streamAgentResponse } from './src/services/chatStream';
import { fetchSetupStatus } from './src/services/setupApi';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const INITIAL_WELCOME = {
  id: 'welcome_1',
  sender: 'agent',
  text: '👋 Hi! I am your Student OS Assistant. How can I help with your Google Classroom, timetable, or student emails today?',
  toolCalls: [],
  isStreaming: false,
};

export default function App() {
  const [messages, setMessages] = useState([INITIAL_WELCOME]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSetupVisible, setIsSetupVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  
  const flatListRef = useRef(null);
  const threadIdRef = useRef(generateUUID());

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

  const handleNewChat = () => {
    setMessages([INITIAL_WELCOME]);
    setQuery('');
    setIsStreaming(false);
    threadIdRef.current = generateUUID();
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
    
    const userMsgId = generateUUID();
    const agentMsgId = generateUUID();

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
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <Header
        isOnline={isOnline}
        onOpenSetup={() => setIsSetupVisible(true)}
        onNewChat={handleNewChat}
        onOpenDrawer={() => setIsDrawerVisible(true)}
      />

      {/* Main Chat Stream */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.select({ ios: 'padding', android: 'height', default: undefined })}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageItem message={item} />}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={scrollToBottom}
        />

        {/* Input Bar & Suggestion Chips */}
        <ChatInput
          query={query}
          setQuery={setQuery}
          onSend={handleSend}
          disabled={isStreaming}
          onFocus={scrollToBottom}
        />
      </KeyboardAvoidingView>

      {/* ChatGPT Style Burger Menu Sidebar */}
      <SidebarDrawer
        visible={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        isOnline={isOnline}
        onNewChat={handleNewChat}
        onOpenSetup={() => setIsSetupVisible(true)}
      />

      {/* Credentials & Service Setup Modal */}
      <SetupModal
        visible={isSetupVisible}
        onClose={() => {
          setIsSetupVisible(false);
          checkServerHealth();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight + 4 : 28) : 0,
  },
  chatContainer: {
    flex: 1,
    width: '100%',
  },
  messageList: {
    width: '100%',
    paddingVertical: 14,
  },
});

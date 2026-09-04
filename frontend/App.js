import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from './src/theme/colors';
import Header from './src/components/Header';
import MessageItem from './src/components/MessageItem';
import ChatInput from './src/components/ChatInput';
import ClaudeLandingHero from './src/components/ClaudeLandingHero';
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

export default function App() {
  const [messages, setMessages] = useState([]);
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
    setMessages([]);
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

  const handleSend = async (textToSend) => {
    const userText = (typeof textToSend === 'string' ? textToSend : query).trim();
    if (!userText || isStreaming) return;

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

  const firstUserMsg = messages.find((m) => m.sender === 'user');
  const chatTopic = firstUserMsg ? firstUserMsg.text : 'Student OS';

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header with Dynamic Topic */}
      <Header
        chatTopic={chatTopic}
        isOnline={isOnline}
        onOpenSetup={() => setIsSetupVisible(true)}
        onNewChat={handleNewChat}
        onOpenDrawer={() => setIsDrawerVisible(true)}
      />

      {/* Main Content Area */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.select({ ios: 'padding', android: 'height', default: undefined })}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <ClaudeLandingHero onSelectPrompt={(promptText) => handleSend(promptText)} />
        ) : (
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
        )}

        {/* Input Bar */}
        <ChatInput
          query={query}
          setQuery={setQuery}
          onSend={() => handleSend()}
          disabled={isStreaming}
          onFocus={scrollToBottom}
          showChips={messages.length > 0}
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

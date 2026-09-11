import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, StatusBar, KeyboardAvoidingView, Platform, Linking, ActivityIndicator } from 'react-native';
import { colors } from './src/theme/colors';
import Header from './src/components/Header';
import MessageItem from './src/components/MessageItem';
import ChatInput from './src/components/ChatInput';
import ClaudeLandingHero from './src/components/ClaudeLandingHero';
import SetupModal from './src/components/SetupModal';
import SidebarDrawer from './src/components/SidebarDrawer';
import LoginScreen from './src/components/LoginScreen';
import { streamAgentResponse } from './src/services/chatStream';
import { fetchSetupStatus } from './src/services/setupApi';
import { fetchUserProfile } from './src/services/authApi';
import { storage } from './src/services/storage';

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
  const [userSession, setUserSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  
  const flatListRef = useRef(null);
  const threadIdRef = useRef(generateUUID());

  useEffect(() => {
    checkServerHealth();
    restoreUserSession();

    const handleDeepLink = async (event) => {
      if (event.url && event.url.includes('access_token')) {
        console.log('Successfully authenticated via OAuth deep link:', event.url);
        try {
          const queryString = event.url.split('?')[1] || event.url.split('#')[1] || '';
          const params = new URLSearchParams(queryString);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            const sessionData = { accessToken, refreshToken, timestamp: Date.now() };
            await storage.setItem('userSession', sessionData);
            setUserSession(sessionData);
            loadUserProfile(accessToken);
          }
        } catch (e) {
          console.warn('Failed to parse deep link session:', e);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const loadUserProfile = async (token) => {
    if (!token) return;
    try {
      const profile = await fetchUserProfile(token);
      if (profile) {
        setUserProfile(profile);
      }
    } catch (e) {
      console.warn('Failed to fetch user profile:', e);
    }
  };

  const restoreUserSession = async () => {
    try {
      const savedSession = await storage.getItem('userSession');
      if (savedSession) {
        const parsed = typeof savedSession === 'string' ? JSON.parse(savedSession) : savedSession;
        setUserSession(parsed);
        if (parsed?.accessToken) {
          loadUserProfile(parsed.accessToken);
        }
      }
    } catch (e) {
      console.warn('Failed to restore session:', e);
    } finally {
      setIsRestoringSession(false);
    }
  };

  const getUserDisplayName = () => {
    if (userProfile?.full_name) return userProfile.full_name;
    if (userProfile?.name) return userProfile.name;
    if (userSession?.userName) return userSession.userName;
    const email = userProfile?.email || userSession?.email;
    if (email) {
      const rawName = email.split('@')[0];
      const cleanName = rawName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
      if (cleanName) return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    }
    return 'Student';
  };

  const handleLogout = async () => {
    await storage.removeItem('userSession');
    setUserSession(null);
    setUserProfile(null);
  };

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

  if (isRestoringSession) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userSession) {
    return <LoginScreen onLoginSuccess={(sessionData) => setUserSession(sessionData)} />;
  }

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
          <ClaudeLandingHero userName={getUserDisplayName()} onSelectPrompt={(promptText) => handleSend(promptText)} />
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
        onLogout={handleLogout}
        userProfile={userProfile}
        userSession={userSession}
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

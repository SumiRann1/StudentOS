import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, FlatList, StatusBar, KeyboardAvoidingView, Platform, Linking, ActivityIndicator } from 'react-native';
import { colors } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import Header from './src/components/Header';
import MessageItem from './src/components/MessageItem';
import ChatInput from './src/components/ChatInput';
import ClaudeLandingHero from './src/components/LandingHero';
import SetupModal from './src/components/SetupModal';
import OcrModal from './src/components/OcrModal';
import SidebarDrawer from './src/components/SidebarDrawer';
import LoginScreen from './src/components/LoginScreen';
import { streamAgentResponse, fetchChatInfo, fetchUserThreads, fetchThreadMessages } from './src/services/chatStream';
import { fetchSetupStatus } from './src/services/setupApi';
import { fetchUserProfile } from './src/services/authApi';
import { triggerJobOnDemand } from './src/services/schedulerApi';
import { storage } from './src/services/storage';

function StudentOSMain() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isSetupVisible, setIsSetupVisible] = useState(false);
  const [isOcrModalVisible, setIsOcrModalVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [recentChats, setRecentChats] = useState([]);
  const [activeTitle, setActiveTitle] = useState('Student OS');
  
  const flatListRef = useRef(null);
  const threadIdRef = useRef(null);

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

  const loadUserThreadsFromBackend = async () => {
    try {
      const threads = await fetchUserThreads(getUserDisplayName());
      if (Array.isArray(threads)) {
        setRecentChats(threads);
      }
    } catch (e) {
      console.warn('Failed to load user threads from SQLite backend:', e);
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
      await loadUserThreadsFromBackend();
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

  const handleOpenDrawer = () => {
    loadUserThreadsFromBackend();
    setIsDrawerVisible(true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setQuery('');
    setIsStreaming(false);
    threadIdRef.current = null;
    setActiveTitle('Student OS');
  };

  const handleSelectChat = async (chat) => {
    if (!chat || !chat.thread_id) return;
    threadIdRef.current = chat.thread_id;
    setActiveTitle(chat.title || 'Student OS');

    try {
      const dbMsgs = await fetchThreadMessages(chat.thread_id, getUserDisplayName());
      if (Array.isArray(dbMsgs) && dbMsgs.length > 0) {
        const formatted = dbMsgs.map((m, idx) => ({
          id: m.id || `msg_${Date.now()}_${idx}`,
          sender: m.sender,
          text: m.content,
        }));
        setMessages(formatted);
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.warn('Failed to load thread messages from backend SQLite:', e);
      setMessages([]);
    }
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

    // Fetch chat info (AI title & thread_id) directly from backend if starting a brand new thread
    if (!threadIdRef.current) {
      const chatInfo = await fetchChatInfo(userText, getUserDisplayName(), null);
      if (chatInfo && chatInfo.thread_id) {
        threadIdRef.current = chatInfo.thread_id;
        setActiveTitle(chatInfo.title || userText);
        loadUserThreadsFromBackend();
      }
    }

    const userMsgId = `usr_${Date.now()}`;
    const agentMsgId = `agt_${Date.now()}`;

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

    await streamAgentResponse(userText, getUserDisplayName(), threadIdRef.current, {
      onThreadInit: (newThreadId) => {
        if (!threadIdRef.current) {
          threadIdRef.current = newThreadId;
        }
      },
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
        loadUserThreadsFromBackend();
      },
    });
  };

  const [runningJob, setRunningJob] = useState(null);

  const handleTriggerAutomation = async (jobName, customPrompt) => {
    if (runningJob) return;
    setRunningJob(jobName);

    const titles = {
      email: '✉️ Daily Email Digest',
      classroom: '📚 Classroom Deadlines Digest',
      timetable: "📅 Today's Timetable Digest",
    };
    const promptText = customPrompt || `⚡ Triggering ${titles[jobName] || jobName} automation...`;

    const userMsgId = `usr_${Date.now()}`;
    const agentMsgId = `agt_${Date.now()}`;

    const threadPrefix = jobName === 'timetable' ? 'default_tt' : `default_${jobName}`;
    threadIdRef.current = `${threadPrefix}_${getUserDisplayName()}`;
    setActiveTitle(titles[jobName] || `Automation (${jobName})`);

    const newMessages = [
      {
        id: userMsgId,
        sender: 'user',
        text: promptText,
      },
      {
        id: agentMsgId,
        sender: 'agent',
        text: `⚡ Running ${titles[jobName] || jobName} automation in background...`,
        toolCalls: [{ name: `job_${jobName}`, args: { status: 'running' } }],
        isStreaming: true,
      },
    ];

    setMessages(newMessages);
    scrollToBottom();

    try {
      const res = await triggerJobOnDemand(jobName);
      const responseText = res?.response || res?.error || 'Automation completed successfully.';

      setMessages([
        {
          id: userMsgId,
          sender: 'user',
          text: promptText,
        },
        {
          id: agentMsgId,
          sender: 'agent',
          text: responseText,
          toolCalls: [],
          isStreaming: false,
        },
      ]);
    } catch (e) {
      setMessages([
        {
          id: userMsgId,
          sender: 'user',
          text: promptText,
        },
        {
          id: agentMsgId,
          sender: 'agent',
          text: `⚠️ Automation error: ${e.message}`,
          isStreaming: false,
        },
      ]);
    } finally {
      setRunningJob(null);
      loadUserThreadsFromBackend();
    }
  };

  const firstUserMsg = messages.find((m) => m.sender === 'user');
  const chatTopic = activeTitle || (firstUserMsg ? firstUserMsg.text : 'Student OS');

  if (isRestoringSession) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!userSession) {
    return <LoginScreen onLoginSuccess={(sessionData) => setUserSession(sessionData)} />;
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header with Dynamic Topic */}
      <Header
        chatTopic={chatTopic}
        isOnline={isOnline}
        onOpenSetup={() => setIsSetupVisible(true)}
        onNewChat={handleNewChat}
        onOpenDrawer={handleOpenDrawer}
      />

      {/* Main Content Area */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <ClaudeLandingHero
            userName={getUserDisplayName()}
            onSelectPrompt={(promptText) => handleSend(promptText)}
            onOpenOcrModal={() => setIsOcrModalVisible(true)}
            onTriggerAutomation={handleTriggerAutomation}
            runningJob={runningJob}
          />
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
          disabled={isStreaming || !!runningJob}
          onFocus={scrollToBottom}
          showChips={messages.length > 0}
          onOpenOcr={() => setIsOcrModalVisible(true)}
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
        recentChats={recentChats}
        onSelectChat={handleSelectChat}
        activeThreadId={threadIdRef.current}
        onRefreshThreads={loadUserThreadsFromBackend}
        onTriggerAutomation={handleTriggerAutomation}
        runningJob={runningJob}
      />

      {/* Credentials & Service Setup Modal */}
      <SetupModal
        visible={isSetupVisible}
        onClose={() => {
          setIsSetupVisible(false);
          checkServerHealth();
        }}
      />

      {/* Grade & Document OCR Modal */}
      <OcrModal
        visible={isOcrModalVisible}
        onClose={() => setIsOcrModalVisible(false)}
        userName={getUserDisplayName()}
      />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <StudentOSMain />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
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

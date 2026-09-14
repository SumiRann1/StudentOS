import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = {};

/**
 * Universal persistent storage helper for Web and React Native/Expo.
 * Persists session data across app restarts on iOS, Android, and Web.
 */
export const storage = {
  setItem: async (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringValue);
      }
      await AsyncStorage.setItem(key, stringValue);
    } catch (e) {
      try {
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        memoryStore[key] = stringValue;
      } catch (err) {
        memoryStore[key] = null;
      }
    }
  },

  getItem: async (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
      const asyncVal = await AsyncStorage.getItem(key);
      if (asyncVal !== null) return asyncVal;
      return memoryStore[key] || null;
    } catch (e) {
      return memoryStore[key] || null;
    }
  },

  removeItem: async (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      await AsyncStorage.removeItem(key);
      delete memoryStore[key];
    } catch (e) {
      delete memoryStore[key];
    }
  },
};

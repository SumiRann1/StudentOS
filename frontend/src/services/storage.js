import { Platform } from 'react-native';

const memoryStore = {};

/**
 * Universal persistent storage helper for Web and React Native/Expo.
 */
export const storage = {
  setItem: async (key, value) => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, stringValue);
      } else {
        memoryStore[key] = stringValue;
      }
    } catch (e) {
      console.warn('Storage setItem failed:', e);
      memoryStore[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
  },

  getItem: async (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
      return memoryStore[key] || null;
    } catch (e) {
      console.warn('Storage getItem failed:', e);
      return memoryStore[key] || null;
    }
  },

  removeItem: async (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      delete memoryStore[key];
    } catch (e) {
      console.warn('Storage removeItem failed:', e);
      delete memoryStore[key];
    }
  },
};

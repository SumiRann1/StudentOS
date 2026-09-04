import { Platform } from 'react-native';

// Host IP address for mobile devices running Expo Go on the local Wi-Fi network.
// Change this to your computer's IP address if running on a physical mobile phone.
export const DEV_HOST_IP = '10.95.135.38';
export const DEV_PORT = '8000';

export const getApiBaseUrl = () => {
  // If explicitly provided via environment variable
  // if (process.env.EXPO_PUBLIC_API_URL) {
  //   return process.env.EXPO_PUBLIC_API_URL;
  // }

  // On Web browser, localhost connects directly to the host machine
  if (Platform.OS === 'web') {
    return `http://localhost:${DEV_PORT}`;
  }

  // On Mobile Expo Go / Emulator, connect via Host machine Wi-Fi IP
  return `http://${DEV_HOST_IP}:${DEV_PORT}`;
};

export const API_BASE_URL = getApiBaseUrl();

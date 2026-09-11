import { Linking, Platform } from 'react-native';
import { API_BASE_URL, DEV_HOST_IP } from '../config/api';

/**
 * Request OAuth Authorization URL from FastAPI backend.
 * @param {string} provider - e.g. 'google'
 * @param {string} [redirectTo] - optional custom redirect URL (e.g. deep link or web URL)
 * @returns {Promise<{url: string, provider: string}>}
 */
export const getOAuthUrl = async (provider = 'google', redirectTo = null) => {
  try {
    const bodyPayload = { provider };
    if (redirectTo) {
      bodyPayload.redirect_to = redirectTo;
    }

    const response = await fetch(`${API_BASE_URL}/auth/oauth/url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status} failed to fetch OAuth URL`);
    }

    return await response.json();
  } catch (error) {
    console.error('getOAuthUrl error:', error);
    throw error;
  }
};

/**
 * Fetch current user profile using access token.
 * @param {string} token - Bearer access token
 * @returns {Promise<{id: string, email: string, created_at: string}>}
 */
export const fetchUserProfile = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} failed to fetch user profile`);
    }

    return await response.json();
  } catch (error) {
    console.error('fetchUserProfile error:', error);
    throw error;
  }
};

/**
 * Helper to get default app redirect URL.
 * Supports Web, Expo Go (exp://), and Standalone builds (studentos://).
 */
export const getAppRedirectUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  if (__DEV__) {
    return `exp://${DEV_HOST_IP}:8081/--/auth-callback`;
  }
  return 'studentos://auth-callback';
};

/**
 * Initiates the Google/OAuth login flow by retrieving the authorization URL and opening it.
 * @param {string} [provider='google']
 * @param {string} [customRedirectTo]
 */
export const startOAuthLogin = async (provider = 'google', customRedirectTo = null) => {
  try {
    const redirectTo = customRedirectTo || getAppRedirectUrl();
    const data = await getOAuthUrl(provider, redirectTo);
    if (data && data.url) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = data.url;
      } else {
        await Linking.openURL(data.url);
      }
    }
  } catch (error) {
    console.error('startOAuthLogin error:', error);
    throw error;
  }
};

import { API_BASE_URL } from '../config/api';

/**
 * Fetch credential & token status for Classroom and Email services.
 */
export async function fetchSetupStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/setup/status`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch setup status:', error);
    return null;
  }
}

/**
 * Save JSON credentials/token object for a service.
 */
export async function saveSetupData(service, credentials, token) {
  try {
    const res = await fetch(`${API_BASE_URL}/setup/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service,
        credentials: credentials || null,
        token: token || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to save setup data');
    }
    return await res.json();
  } catch (error) {
    console.error('Error saving setup data:', error);
    throw error;
  }
}

/**
 * Trigger OAuth authentication or verification for a service.
 */
export async function triggerServiceAuth(service) {
  try {
    const res = await fetch(`${API_BASE_URL}/setup/auth/${service}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to authenticate service');
    }
    return await res.json();
  } catch (error) {
    console.error('Error authenticating service:', error);
    throw error;
  }
}


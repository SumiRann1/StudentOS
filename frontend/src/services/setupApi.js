import { API_BASE_URL } from '../config/api';

/**
 * Fetch token status for Classroom and Email services.
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

import { API_BASE_URL } from '../config/api';

/**
 * Fetch all active APScheduler daily jobs and next run times.
 */
export const fetchSchedulerJobs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/scheduler`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch scheduler jobs:', error);
    return null;
  }
};

/**
 * Trigger an automation job on-demand immediately.
 * @param {string} jobName - 'email', 'classroom', or 'timetable'
 */
export const triggerJobOnDemand = async (jobName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/scheduler/test/${jobName}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`Failed to trigger job '${jobName}':`, error);
    return { status: 'error', error: error.message || 'Network error' };
  }
};

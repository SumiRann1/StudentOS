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

/**
 * Fetch pre-calculated dashboard briefings, badges, and next class info from backend.
 * @param {string} userName
 */
export const fetchDashboardBriefings = async (userName = 'Student') => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/briefings?user_name=${encodeURIComponent(userName)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch dashboard briefings:', error);
    return null;
  }
};

/**
 * Fetch live next class countdown info from backend.
 */
export const fetchNextClass = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/timetable/next-class`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch next class info:', error);
    return null;
  }
};

/**
 * Fetch structured upcoming Google Classroom assignment deadlines from backend.
 * @param {number} maxResults
 */
export const fetchUpcomingDeadlines = async (maxResults = 10) => {
  try {
    const response = await fetch(`${API_BASE_URL}/classroom/upcoming-deadlines?max_results=${maxResults}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn('Failed to fetch upcoming deadlines:', error);
    return null;
  }
};

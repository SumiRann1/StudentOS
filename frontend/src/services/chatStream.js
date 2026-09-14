import { API_BASE_URL } from '../config/api';

/**
 * Stream agent response from FastAPI /chat/stream endpoint.
 * 
 * @param {string} query - The user question or prompt
 * @param {string} threadId - Session ID for agent state persistence
 * @param {string} userName - The name of the user
 * @param {object} callbacks - Event callbacks: onChunk, onToolStart, onError, onDone
 */
export async function streamAgentResponse(query, userName, threadId, callbacks) {
  const { onChunk, onToolStart, onThreadInit, onError, onDone } = callbacks || {};
  const endpoint = `${API_BASE_URL}/chat/stream`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        query: query,
        user_name: userName || 'Student',
        thread_id: threadId || null,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText || 'Failed to connect to backend stream'}`);
    }

    // Check if body reader is available (Fetch API / ReadableStream)
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep unfinished line fragment in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            if (onDone) onDone();
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if ((parsed.type === 'new_thread' || parsed.type === 'thread_init') && parsed.thread_id) {
              if (onThreadInit) onThreadInit(parsed.thread_id);
            } else if (parsed.type === 'content' && parsed.content) {
              if (onChunk) onChunk(parsed.content, parsed.node);
            } else if (parsed.type === 'tool_call') {
              if (onToolStart) onToolStart(parsed.name, parsed.args);
            } else if (parsed.type === 'error') {
              if (onError) onError(parsed.error);
            }
          } catch (e) {
            // Ignore non-JSON heartbeat lines
          }
        }
      }
    } else {
      // Fallback for environments where body.getReader() is unsupported
      const text = await response.text();
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if ((parsed.type === 'new_thread' || parsed.type === 'thread_init') && parsed.thread_id) {
              if (onThreadInit) onThreadInit(parsed.thread_id);
            } else if (parsed.type === 'content' && parsed.content) {
              if (onChunk) onChunk(parsed.content, parsed.node);
            } else if (parsed.type === 'tool_call') {
              if (onToolStart) onToolStart(parsed.name, parsed.args);
            }
          } catch (e) {}
        }
      }
    }

    if (onDone) onDone();
  } catch (error) {
    console.error('Error streaming agent response:', error);
    if (onError) onError(error.message || 'Connection error');
  }
}

/**
 * Fetch AI title and thread ID from FastAPI /chat/get_chat_info endpoint.
 * 
 * @param {string} query - The initial user message/prompt
 * @param {string} userName - User display name
 * @param {string} [threadId] - Optional existing thread ID
 * @returns {Promise<{thread_id: string, title: string} | null>}
 */
export async function fetchChatInfo(query, userName, threadId) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/get_chat_info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        user_name: userName || 'Student',
        thread_id: threadId || null,
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('fetchChatInfo error:', err);
    return null;
  }
}

/**
 * Fetch recent chat threads for a user from FastAPI backend SQLite DB.
 * 
 * @param {string} userName
 * @returns {Promise<Array<{thread_id: string, title: string, created_at: string, updated_at: string}>>}
 */
export async function fetchUserThreads(userName) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/get_user_threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_name: userName || 'Student',
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.response || [];
  } catch (err) {
    console.error('fetchUserThreads error:', err);
    return [];
  }
}

/**
 * Fetch message history for a thread from FastAPI backend SQLite DB.
 * 
 * @param {string} threadId
 * @param {string} userName
 * @returns {Promise<Array<{id: string, thread_id: string, sender: string, content: string, timestamp: string}>>}
 */
export async function fetchThreadMessages(threadId, userName) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/get_thread_messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        thread_id: threadId,
        user_name: userName || 'Student',
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.response || [];
  } catch (err) {
    console.error('fetchThreadMessages error:', err);
    return [];
  }
}


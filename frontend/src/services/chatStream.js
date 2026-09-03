import { API_BASE_URL } from '../config/api';

/**
 * Stream agent response from FastAPI /chat/stream endpoint.
 * 
 * @param {string} query - The user question or prompt
 * @param {string} threadId - Session ID for agent state persistence
 * @param {object} callbacks - Event callbacks: onChunk, onToolStart, onError, onDone
 */
export async function streamAgentResponse(query, threadId, callbacks) {
  const { onChunk, onToolStart, onError, onDone } = callbacks;
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
        thread_id: threadId || 'default_thread',
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
            if (parsed.type === 'content' && parsed.content) {
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
            if (parsed.type === 'content' && parsed.content) {
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

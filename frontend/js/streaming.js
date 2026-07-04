/**
 * Streaming — SSE streaming handler
 */

export async function streamChat({ messages, model, signal, onChunk, onDone, onError }) {
  try {
    const endpoint = localStorage.getItem('zynex_api_endpoint') || '/api/chat';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `Server error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete last line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content
                       || json.content
                       || json.text
                       || '';
            if (delta) {
              fullContent += delta;
              onChunk(fullContent);
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data !== '[DONE]') {
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content
                         || json.content
                         || json.text
                         || '';
              if (delta) {
                fullContent += delta;
                onChunk(fullContent);
              }
            } catch {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }
    }

    onDone(fullContent);
  } catch (err) {
    onError(err);
  }
}
/**
 * Streaming — Server-Sent Events handler for chat completions.
 */

const CHAT_ENDPOINT = '/api/chat';

function parseSseLine(line) {
  if (!line.startsWith('data:')) return null;
  const raw = line.slice(5).trim();
  if (!raw) return null;
  if (raw === '[DONE]') return { done: true };
  try {
    return { json: JSON.parse(raw) };
  } catch {
    return null;
  }
}

function extractDelta(json) {
  return (
    json?.choices?.[0]?.delta?.content ||
    json?.choices?.[0]?.message?.content ||
    json?.content ||
    json?.text ||
    ''
  );
}

export async function streamChat({ messages, model, signal, onChunk, onDone, onError }) {
  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(
        errorBody.detail || errorBody.message || `Server error ${response.status}`
      );
    }
    if (!response.body) {
      throw new Error('This browser cannot read streaming responses.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';
    let finished = false;
    let streamError = '';

    const handleLine = (line) => {
      const parsed = parseSseLine(line.replace(/\r$/, ''));
      if (!parsed) return;
      if (parsed.done) {
        finished = true;
        return;
      }
      if (parsed.json?.error) {
        streamError = String(parsed.json.error);
        return;
      }
      const delta = extractDelta(parsed.json);
      if (delta) {
        fullContent += delta;
        onChunk(fullContent);
      }
    };

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        handleLine(line);
        if (finished || streamError) break;
      }
    }

    // Flush any final line that arrived without a trailing newline.
    if (buffer.trim()) handleLine(buffer.trim());

    if (streamError) {
      throw new Error(streamError);
    }
    if (!finished && !fullContent) {
      throw new Error('The server closed the stream without sending an answer.');
    }

    onDone(fullContent);
  } catch (error) {
    onError(error);
  }
}

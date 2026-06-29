import { getApiUrl, getApiKey } from '../api';
import type { RealtimeEvent } from '../types';

function parseSseChunk(chunk: string): RealtimeEvent | null {
  const dataLine = chunk
    .split('\n')
    .find((line) => line.startsWith('data:'));

  if (!dataLine) return null;

  try {
    return JSON.parse(dataLine.slice(5).trim()) as RealtimeEvent;
  } catch {
    return null;
  }
}

export async function connectRealtimeStream(
  token: string,
  onEvent: (event: RealtimeEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`${getApiUrl()}/realtime/stream`, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${token}`,
      'x-api-key': getApiKey(),
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Realtime connection failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Realtime stream is not available');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const event = parseSseChunk(part);
      if (event && event.type !== 'heartbeat') {
        onEvent(event);
      }
    }
  }
}

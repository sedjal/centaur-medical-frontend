const baseURL = process.env.VUE_APP_API_URL || '/api';

export type StreamConnectionState = 'connected' | 'connecting' | 'disconnected';

export function notificationsStreamUrl(): string {
  const root = String(baseURL || '/api').replace(/\/$/, '');
  return `${root}/notifications/stream`;
}

export interface NotificationStreamHandle {
  close: () => void;
}

export interface NotificationStreamOpenOptions {
  url: string;
  token: string;
  onOpen: () => void;
  onEvent: (event: string, data: string) => void;
  onError: () => void;
}

export type NotificationStreamOpen = (options: NotificationStreamOpenOptions) => NotificationStreamHandle;

function parseSseChunk(block: string): { event: string; data: string } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
  }
  if (!dataLines.length) return null;
  return { event, data: dataLines.join('\n') };
}

async function consumeSseBody(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: string) => void,
  signal: AbortSignal
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let sep = buf.indexOf('\n\n');
      while (sep >= 0) {
        const raw = buf.slice(0, sep).replace(/\r/g, '');
        buf = buf.slice(sep + 2);
        const parsed = parseSseChunk(raw);
        if (parsed) onEvent(parsed.event, parsed.data);
        sep = buf.indexOf('\n\n');
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
}

/** SSE via fetch + Bearer — le JWT ne doit jamais apparaître dans l’URL. */
export function openFetchNotificationStream(options: NotificationStreamOpenOptions): NotificationStreamHandle {
  const ac = new AbortController();
  let stopped = false;

  const run = async () => {
    if (typeof fetch === 'undefined') {
      options.onError();
      return;
    }
    const res = await fetch(options.url, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${options.token}`,
      },
      cache: 'no-store',
      signal: ac.signal,
    });
    if (stopped) return;
    if (!res.ok || !res.body) {
      options.onError();
      return;
    }
    options.onOpen();
    await consumeSseBody(res.body, options.onEvent, ac.signal);
    if (!stopped) options.onError();
  };

  void run().catch(() => {
    if (!stopped && !ac.signal.aborted) options.onError();
  });

  return {
    close() {
      stopped = true;
      ac.abort();
    },
  };
}

let streamOpen: NotificationStreamOpen | undefined = openFetchNotificationStream;

export function getNotificationStreamOpen(): NotificationStreamOpen | undefined {
  return streamOpen;
}

export function __setNotificationStreamOpen(impl: NotificationStreamOpen | undefined): void {
  streamOpen = impl;
}

/** Tests: coupe le fetch natif (jsdom) pour éviter des reconnexions fantômes. */
export function __disableNativeNotificationStream(): void {
  streamOpen = undefined;
}

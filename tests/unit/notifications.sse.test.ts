/**
 * UNIT — SSE notifications (fetch + Bearer, JWT hors URL)
 */
import '../setup-dom';
import test from 'tape';
import {
  notificationsStreamUrl,
  __disableNativeNotificationStream,
} from '../../src/api/notifications.stream';
import {
  connectNotificationStream,
  teardownNotificationStream,
  useNotifications,
  __resetNotificationStreamForTests,
} from '../../src/composables/useNotifications';
import { createFakeNotificationStream } from '../helpers/fake-notification-stream';
import api from '../../src/services/api';

const streams = createFakeNotificationStream();
const originalAdapter = api.defaults.adapter;

function okAdapter(data: unknown) {
  return (async (config: { url?: string }) => ({
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    data,
  })) as typeof api.defaults.adapter;
}

test('notificationsStream: URL sans access_token', (t) => {
  t.equal(notificationsStreamUrl().includes('access_token'), false);
  t.match(notificationsStreamUrl(), /\/notifications\/stream$/);
  t.end();
});

test('openFetchNotificationStream: Authorization Bearer, pas de token en query', async (t) => {
  const { openFetchNotificationStream } = await import('../../src/api/notifications.stream');
  const origFetch = globalThis.fetch;
  const seen: Array<{ url: string; auth?: string }> = [];
  globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string> | undefined;
    seen.push({ url: String(url), auth: headers?.Authorization });
    return { ok: false, body: null } as Response;
  }) as typeof fetch;
  try {
    const handle = openFetchNotificationStream({
      url: '/api/notifications/stream',
      token: 'secret-jwt',
      onOpen() {},
      onEvent() {},
      onError() {},
    });
    await new Promise((r) => setTimeout(r, 15));
    t.equal(seen.length, 1);
    t.equal(seen[0].url.includes('access_token'), false);
    t.equal(seen[0].auth, 'Bearer secret-jwt');
    handle.close();
  } finally {
    globalThis.fetch = origFetch;
    t.end();
  }
});

test('notificationsStream: pas de crash si stream indisponible', (t) => {
  __resetNotificationStreamForTests();
  __disableNativeNotificationStream();
  localStorage.setItem('centaur_token', 'tok');
  t.doesNotThrow(() => connectNotificationStream());
  const { connectionState } = useNotifications();
  t.equal(connectionState.value, 'disconnected');
  teardownNotificationStream();
  t.end();
});

test('useNotifications: SSE created met à jour unreadCount + revision, JWT en header seulement', async (t) => {
  __resetNotificationStreamForTests();
  streams.install();
  localStorage.setItem('centaur_token', 'access-jwt');
  api.defaults.adapter = okAdapter({ items: [], total: 4 });

  const { unreadCount, streamRevision, connectionState, connect, disconnect } = useNotifications();
  connect();
  await new Promise((r) => setTimeout(r, 10));
  t.equal(streams.instances.length, 1);
  t.match(streams.instances[0].url, /\/notifications\/stream$/);
  t.equal(streams.instances[0].url.includes('access_token'), false);
  t.equal(streams.instances[0].token, 'access-jwt');
  t.equal(connectionState.value, 'connected');
  t.equal(unreadCount.value, 0, 'premier open: pas de GET unread');

  const rev = streamRevision.value;
  streams.instances[0].emitCreated({
    notificationId: 'n-live',
    type: 'PRESCRIPTION',
    unreadCount: 7,
  });
  t.equal(unreadCount.value, 7);
  t.equal(streamRevision.value, rev + 1);

  disconnect();
  t.equal(streams.instances[0].closed, true);
  __disableNativeNotificationStream();
  api.defaults.adapter = originalAdapter;
  __resetNotificationStreamForTests();
  t.end();
});

test('useNotifications: payload SSE invalide ignoré', (t) => {
  __resetNotificationStreamForTests();
  streams.install();
  localStorage.setItem('centaur_token', 'access-jwt');
  const { unreadCount, connect } = useNotifications();
  unreadCount.value = 2;
  connect();
  streams.instances[0].emitCreated({ hello: 'nope' });
  t.equal(unreadCount.value, 2);
  teardownNotificationStream();
  __disableNativeNotificationStream();
  t.end();
});

test('useNotifications: reconnexion resync GET /notifications', async (t) => {
  __resetNotificationStreamForTests();
  streams.install();
  localStorage.setItem('centaur_token', 'access-jwt');
  let calls = 0;
  api.defaults.adapter = (async () => {
    calls += 1;
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
      data: { items: [], total: calls },
    };
  }) as typeof api.defaults.adapter;

  const { connectionState, connect } = useNotifications();
  connect();
  await new Promise((r) => setTimeout(r, 10));
  t.equal(connectionState.value, 'connected');
  t.equal(calls, 0, 'pas de GET au premier branchement');
  streams.instances[0].fail();
  t.equal(connectionState.value, 'disconnected');
  streams.instances[0].reopen();
  await new Promise((r) => setTimeout(r, 10));
  t.equal(connectionState.value, 'connected');
  t.ok(calls >= 1, 'GET après reconnexion');
  teardownNotificationStream();
  __disableNativeNotificationStream();
  api.defaults.adapter = originalAdapter;
  t.end();
});

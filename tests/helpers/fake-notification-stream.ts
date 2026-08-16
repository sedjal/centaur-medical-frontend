import {
  __setNotificationStreamOpen,
  type NotificationStreamHandle,
  type NotificationStreamOpen,
} from '../../src/api/notifications.stream';

export type FakeNotificationStream = NotificationStreamHandle & {
  url: string;
  token: string;
  closed: boolean;
  emitCreated: (payload: object) => void;
  fail: () => void;
  reopen: () => void;
};

export function createFakeNotificationStream() {
  const instances: FakeNotificationStream[] = [];

  const open: NotificationStreamOpen = (opts) => {
    const handle: FakeNotificationStream = {
      url: opts.url,
      token: opts.token,
      closed: false,
      close() {
        this.closed = true;
      },
      emitCreated(payload: object) {
        opts.onEvent('notification.created', JSON.stringify(payload));
      },
      fail() {
        opts.onError();
      },
      reopen() {
        opts.onOpen();
      },
    };
    instances.push(handle);
    queueMicrotask(() => {
      if (!handle.closed) opts.onOpen();
    });
    return handle;
  };

  return {
    instances,
    install() {
      instances.length = 0;
      __setNotificationStreamOpen(open);
    },
  };
}

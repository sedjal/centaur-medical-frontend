/**
 * jsdom partagé — unit + intégration (localStorage, hash router, Vue).
 */
process.env.NODE_ENV = 'test';

import { JSDOM } from 'jsdom';
import { __disableNativeNotificationStream } from '../src/api/notifications.stream';

__disableNativeNotificationStream();

const g = globalThis as Record<string, unknown>;

if (!g.__centaurDom) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/#/login',
    pretendToBeVisual: true,
  });

  g.__centaurDom = dom;
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.location = dom.window.location;
  g.history = dom.window.history;
  g.self = dom.window;
  g.localStorage = dom.window.localStorage;
  g.sessionStorage = dom.window.sessionStorage;
  g.HTMLElement = dom.window.HTMLElement;
  g.SVGElement = dom.window.SVGElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.Event = dom.window.Event;
  g.CustomEvent = dom.window.CustomEvent;
  g.KeyboardEvent = dom.window.KeyboardEvent;
  g.MouseEvent = dom.window.MouseEvent;
  g.MutationObserver = dom.window.MutationObserver;
  g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
  g.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

const dom = g.__centaurDom as InstanceType<typeof JSDOM>;

export function setHash(path: string): void {
  dom.window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

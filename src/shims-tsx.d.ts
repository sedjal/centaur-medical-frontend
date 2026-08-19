/// <reference types="webpack-env" />

declare module '*.css';

declare module 'jsdom' {
  export class JSDOM {
    constructor(
      html?: string,
      options?: {
        url?: string;
        pretendToBeVisual?: boolean;
        [key: string]: unknown;
      }
    );
    window: Window & typeof globalThis;
  }
}

import type { VNode } from 'vue';

declare global {
  namespace JSX {
    interface Element extends VNode {}
    interface IntrinsicElements {
      [elem: string]: unknown;
    }
  }
}

export {};

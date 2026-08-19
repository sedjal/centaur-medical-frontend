/// <reference types="webpack-env" />

declare module '*.css';

interface Html2PdfOptions {
  margin?: number;
  filename?: string;
  image?: { type?: string; quality?: number };
  html2canvas?: { scale?: number; useCORS?: boolean; logging?: boolean };
  jsPDF?: { unit?: string; format?: string; orientation?: string };
}

interface Html2PdfChain {
  set(options: Html2PdfOptions): Html2PdfChain;
  from(element: Element): Html2PdfChain;
  save(): Promise<void>;
}

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
  interface Window {
    html2pdf?: () => Html2PdfChain;
  }

  namespace JSX {
    interface Element extends VNode {}
    interface IntrinsicElements {
      [elem: string]: unknown;
    }
  }
}

export {};

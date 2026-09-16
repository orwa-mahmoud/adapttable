import "@testing-library/jest-dom/vitest";

import { configure } from "@testing-library/react";
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

if (typeof globalThis.matchMedia !== "function") {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  });
}

// Chakra v3 overlays (Popover / Drawer) position via Ark's zag + floating-ui,
// which observe element size to keep the floating card anchored. jsdom ships
// neither observer, so polyfill them with inert stubs — the tests assert DOM
// presence and behaviour, not pixel placement.
const noop = (): undefined => undefined;

globalThis.ResizeObserver ??= class {
  observe(): void {
    noop();
  }
  unobserve(): void {
    noop();
  }
  disconnect(): void {
    noop();
  }
};

globalThis.IntersectionObserver ??= class implements IntersectionObserver {
  readonly root: Document | Element | null = null;
  readonly rootMargin: string = "";
  readonly scrollMargin: string = "";
  readonly thresholds: readonly number[] = [];
  constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit
  ) {
    noop();
  }
  observe(): void {
    noop();
  }
  unobserve(): void {
    noop();
  }
  disconnect(): void {
    noop();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

if (typeof Element.prototype.scrollTo !== "function") {
  Element.prototype.scrollTo = noop;
}

// Testing Library waits one second for an element to appear or disappear.
// That default assumes an idle machine; these suites run ten workers deep and
// a kit's own exit animation can outlast it under that load — a scheduling
// deadline expiring, not a component failing to close.
configure({ asyncUtilTimeout: 5000 });

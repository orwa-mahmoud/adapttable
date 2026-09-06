import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

// jsdom doesn't implement matchMedia; Mantine and AdaptTable's media hooks
// read it. Provide a non-matching stub so components render in their
// desktop layout by default.
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

// jsdom lacks ResizeObserver, which some Mantine components reference.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {
      /* no-op */
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
  };
}

// jsdom lacks scrollIntoView.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

// Testing Library waits one second for an element to appear or disappear.
// That default assumes an idle machine; these suites run ten workers deep and
// a kit's own exit animation can outlast it under that load — a scheduling
// deadline expiring, not a component failing to close.
configure({ asyncUtilTimeout: 5000 });

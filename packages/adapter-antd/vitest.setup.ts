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

// antd's responsive observers need ResizeObserver, which jsdom lacks.
if (typeof globalThis.ResizeObserver !== "function") {
  globalThis.ResizeObserver = class {
    observe(): void {
      /* no-op in jsdom */
    }
    unobserve(): void {
      /* no-op in jsdom */
    }
    disconnect(): void {
      /* no-op in jsdom */
    }
  };
}

// jsdom throws on `getComputedStyle(el, pseudoElt)`; antd measures with a
// pseudo-element argument. Drop it so jsdom returns the base style instead
// of logging "Not implemented".
const realGetComputedStyle = globalThis.getComputedStyle.bind(globalThis);
globalThis.getComputedStyle = (element: Element) =>
  realGetComputedStyle(element);

// Testing Library waits one second for an element to appear or disappear.
// That default assumes an idle machine; these suites run ten workers deep and
// a kit's own exit animation can outlast it under that load — a scheduling
// deadline expiring, not a component failing to close.
configure({ asyncUtilTimeout: 5000 });

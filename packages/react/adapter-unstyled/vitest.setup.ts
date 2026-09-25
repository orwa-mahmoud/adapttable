import "@testing-library/jest-dom/vitest";

import { configure } from "@testing-library/react";
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

// jsdom lacks matchMedia; provide a non-matching stub (desktop layout).
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

// Testing Library waits one second for an element to appear or disappear.
// That default assumes an idle machine; these suites run ten workers deep and
// a kit's own exit animation can outlast it under that load — a scheduling
// deadline expiring, not a component failing to close.
configure({ asyncUtilTimeout: 5000 });

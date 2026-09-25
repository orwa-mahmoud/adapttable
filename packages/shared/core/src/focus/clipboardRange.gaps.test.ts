/**
 * Reading the clipboard is a permissioned browser API that is simply absent in
 * some environments and rejects in others, and a paste that throws would take
 * the table's key handler down with it. Either way the answer is the same: no
 * text, and nothing pasted.
 */
import { afterEach, describe, expect, it } from "vitest";

import { readClipboardText } from "./clipboardRange";

const original = globalThis.navigator?.clipboard;

function withClipboard(clipboard: unknown) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: clipboard,
    configurable: true,
  });
}

afterEach(() => {
  withClipboard(original);
});

describe("readClipboardText", () => {
  it("returns the clipboard's text when the browser allows it", async () => {
    withClipboard({ readText: () => Promise.resolve("a\tb") });
    await expect(readClipboardText()).resolves.toBe("a\tb");
  });

  it("returns nothing where the API is absent", async () => {
    withClipboard(undefined);
    await expect(readClipboardText()).resolves.toBeNull();
    withClipboard({});
    await expect(readClipboardText()).resolves.toBeNull();
  });

  it("returns nothing when the read is refused", async () => {
    withClipboard({
      readText: () => Promise.reject(new Error("NotAllowedError")),
    });
    await expect(readClipboardText()).resolves.toBeNull();
  });
});

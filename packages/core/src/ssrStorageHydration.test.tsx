/**
 * SSR contract for storage-backed state: the server (which has no
 * localStorage) and the client's FIRST render must produce identical
 * markup even when the store is populated — persisted layouts and saved
 * views hydrate in an effect after mount, never in an initializer.
 */
import { act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useColumnLayoutStorageState } from "./columns/useColumnLayoutStorageState";
import { createMemoryAdapter } from "./url/adapter";
import { useSavedViews } from "./url/useSavedViews";
import * as env from "./utils/env";

const adapter = createMemoryAdapter("");

function Probe() {
  const { layout } = useColumnLayoutStorageState({ storageKey: "hydr-cols" });
  const { views } = useSavedViews({
    storageKey: "hydr-views",
    urlAdapter: adapter,
  });
  return (
    <div>
      {layout.hidden.join(",")}|{views.length}
    </div>
  );
}

afterEach(() => {
  globalThis.localStorage.removeItem("hydr-cols");
  globalThis.localStorage.removeItem("hydr-views");
});

describe("storage-backed state under SSR", () => {
  it("hydrates a populated store without a mismatch warning", async () => {
    globalThis.localStorage.setItem(
      "hydr-cols",
      JSON.stringify({ hidden: ["email"], order: [], pinned: {}, widths: {} })
    );
    globalThis.localStorage.setItem(
      "hydr-views",
      JSON.stringify([{ name: "v", search: "q=1" }])
    );

    // The REAL server has no storage — render the server HTML blind, then
    // hydrate in the browser where the store is populated. The old
    // initializer-read made these two first renders differ.
    const ssrSpy = vi.spyOn(env, "safeLocalStorage").mockReturnValue(undefined);
    const html = renderToString(<Probe />);
    ssrSpy.mockRestore();
    const host = document.createElement("div");
    host.innerHTML = html;
    document.body.appendChild(host);

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(host, <Probe />);
        await Promise.resolve();
      });
      expect(consoleError).not.toHaveBeenCalled();
      // And after mount the persisted values ARE live.
      expect(host.textContent).toBe("email|1");
      await act(async () => {
        root?.unmount();
        await Promise.resolve();
      });
    } finally {
      consoleError.mockRestore();
      host.remove();
    }
  });

  it("renders normally when the localStorage getter itself throws", async () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: storage blocked");
      },
    });
    try {
      const { renderHook } = await import("@testing-library/react");
      const view = renderHook(() =>
        useColumnLayoutStorageState({ storageKey: "blocked" })
      );
      act(() =>
        view.result.current.onLayoutChange({
          hidden: ["email"],
          order: [],
          pinned: {},
          widths: {},
        })
      );
      // State still works fully in memory.
      expect(view.result.current.layout.hidden).toEqual(["email"]);

      const views = renderHook(() =>
        useSavedViews({ storageKey: "blocked-views", urlAdapter: adapter })
      );
      act(() => views.result.current.save("v"));
      expect(views.result.current.views).toHaveLength(1);
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});

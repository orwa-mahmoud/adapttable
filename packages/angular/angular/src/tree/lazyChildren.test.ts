/**
 * Lazy children as a signal: the spinner while a node fetches, the
 * fetch-once rule, failures and a retry, and a fetch that lands too late.
 */
import { createEnvironmentInjector, EnvironmentInjector } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  injectLazyChildren,
  type LazyChildrenInjectOptions,
} from "./lazyChildren";

interface Node {
  id: string;
  loaded?: boolean;
}

const lazyWith = (options: Partial<LazyChildrenInjectOptions<Node>>) =>
  TestBed.runInInjectionContext(() =>
    injectLazyChildren<Node>({
      hasLoadedChildren: (row) => row.loaded === true,
      getRowId: (row) => row.id,
      ...options,
    })
  );

/** A fetch the test settles by hand. */
function deferred() {
  let resolve!: () => void;
  let reject!: () => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("injectLazyChildren", () => {
  it("does nothing without a handler", () => {
    const state = lazyWith({});
    state().loadIfNeeded({ id: "a" });
    expect(state().loadingIds.size).toBe(0);
  });

  it("marks a node while its children are fetched, and clears it after", async () => {
    const fetch = deferred();
    const state = lazyWith({ onLoadChildren: () => fetch.promise });
    state().loadIfNeeded({ id: "a" });
    expect(state().loadingIds.has("a")).toBe(true);
    fetch.resolve();
    await fetch.promise;
    await Promise.resolve();
    expect(state().loadingIds.has("a")).toBe(false);
  });

  it("never asks for children it already has, and asks once however often", () => {
    const onLoadChildren = vi.fn(() => new Promise<void>(() => undefined));
    const state = lazyWith({ onLoadChildren });
    state().loadIfNeeded({ id: "a", loaded: true });
    expect(onLoadChildren).not.toHaveBeenCalled();
    state().loadIfNeeded({ id: "b" });
    state().loadIfNeeded({ id: "b" });
    expect(onLoadChildren).toHaveBeenCalledTimes(1);
  });

  it("records a rejection, reports it, and allows another attempt", async () => {
    const onLoadFailed = vi.fn();
    const onLoadChildren = vi.fn(() => Promise.reject(new Error("offline")));
    const state = lazyWith({ onLoadChildren, onLoadFailed });
    state().loadIfNeeded({ id: "a" });
    await vi.waitFor(() => {
      expect(state().failedIds.has("a")).toBe(true);
    });
    expect(state().loadingIds.has("a")).toBe(false);
    expect(onLoadFailed).toHaveBeenCalledWith({ id: "a" }, "a");
    state().loadIfNeeded({ id: "a" });
    expect(onLoadChildren).toHaveBeenCalledTimes(2);
    expect(state().failedIds.has("a")).toBe(false);
  });

  it("ignores a fetch that lands after its injector is gone", async () => {
    const parent = TestBed.inject(EnvironmentInjector);
    const child = createEnvironmentInjector([], parent);
    const fetch = deferred();
    const onLoadFailed = vi.fn();
    const state = injectLazyChildren<Node>({
      onLoadChildren: () => fetch.promise,
      onLoadFailed,
      hasLoadedChildren: () => false,
      getRowId: (row) => row.id,
      injector: child,
    });
    state().loadIfNeeded({ id: "a" });
    child.destroy();
    fetch.reject();
    await expect(fetch.promise).rejects.toBeUndefined();
    await Promise.resolve();
    expect(onLoadFailed).not.toHaveBeenCalled();
  });
});

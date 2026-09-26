/**
 * The find controller against a memory URL: the open/query/walk state, the
 * debounced URL write, and adopting a query the URL brings in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/historyAdapter";
import {
  clampMatchIndex,
  createFindController,
  FIND_URL_WRITE_DEBOUNCE_MS,
  readFindQuery,
} from "./findController";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("readFindQuery", () => {
  it("reads the trimmed query, namespaced or not", () => {
    expect(readFindQuery("find=%20ada%20")).toBe("ada");
    expect(readFindQuery("lab.find=bea", "lab")).toBe("bea");
    expect(readFindQuery("q=x")).toBe("");
  });
});

describe("clampMatchIndex", () => {
  it("clamps to the hits there are", () => {
    expect(clampMatchIndex(3, 0)).toBe(-1);
    expect(clampMatchIndex(-1, 4)).toBe(0);
    expect(clampMatchIndex(9, 4)).toBe(3);
    expect(clampMatchIndex(2, 4)).toBe(2);
  });
});

describe("createFindController", () => {
  it("opens on a query the URL carries", () => {
    const adapter = createMemoryAdapter("find=ada");
    const find = createFindController({ enabled: true, adapter });
    expect(find.getSnapshot()).toEqual({
      open: true,
      query: "ada",
      index: 0,
      pending: null,
    });
  });

  it("ignores the URL while disabled", () => {
    const adapter = createMemoryAdapter("find=ada");
    const find = createFindController({ enabled: false, adapter });
    expect(find.getSnapshot()).toMatchObject({ open: false, query: "" });
    find.setQuery("bea");
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    expect(adapter.getSearch()).toBe("find=ada");
    find.syncFromUrl();
    expect(find.getSnapshot().query).toBe("bea");
  });

  it("writes the query to the URL after the debounce, replacing history", () => {
    const adapter = createMemoryAdapter("");
    const setSearch = vi.spyOn(adapter, "setSearch");
    const find = createFindController({ enabled: true, adapter });
    find.openBar();
    find.setQuery("a");
    find.setQuery(" ada ");
    expect(find.getSnapshot()).toMatchObject({
      open: true,
      query: " ada ",
      index: 0,
      pending: "ada",
    });
    expect(setSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    expect(setSearch).toHaveBeenCalledTimes(1);
    expect(setSearch).toHaveBeenCalledWith(expect.any(String), { push: false });
    expect(readFindQuery(adapter.getSearch())).toBe("ada");
    expect(find.getSnapshot().pending).toBeNull();
  });

  it("namespaces the URL param", () => {
    const adapter = createMemoryAdapter("");
    const find = createFindController({
      enabled: true,
      adapter,
      urlKey: "lab",
    });
    find.openBar();
    find.setQuery("ada");
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    expect(readFindQuery(adapter.getSearch(), "lab")).toBe("ada");
    expect(readFindQuery(adapter.getSearch())).toBe("");
  });

  it("keeps a query typed into a closed bar out of the URL", () => {
    const adapter = createMemoryAdapter("");
    const find = createFindController({ enabled: true, adapter });
    find.setQuery("ada");
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    expect(adapter.getSearch()).toBe("");
    expect(find.getSnapshot().pending).toBeNull();
  });

  it("clears the query and the param when the bar closes", () => {
    const adapter = createMemoryAdapter("find=ada");
    const find = createFindController({ enabled: true, adapter });
    find.setOpen(false);
    expect(find.getSnapshot()).toMatchObject({
      open: false,
      query: "",
      index: -1,
    });
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    expect(readFindQuery(adapter.getSearch())).toBe("");
  });

  it("steps through the hits, wrapping", () => {
    const find = createFindController({
      enabled: true,
      adapter: createMemoryAdapter("find=a"),
    });
    find.step(1, 3);
    find.step(1, 3);
    expect(find.getSnapshot().index).toBe(2);
    find.step(1, 3);
    expect(find.getSnapshot().index).toBe(0);
    find.step(-1, 3);
    expect(find.getSnapshot().index).toBe(2);
    find.step(1, 0);
    expect(find.getSnapshot().index).toBe(-1);
  });

  it("adopts a query the URL brings in", () => {
    const adapter = createMemoryAdapter("");
    const find = createFindController({ enabled: true, adapter });
    adapter.setSearch("find=bea");
    find.syncFromUrl();
    expect(find.getSnapshot()).toMatchObject({
      open: true,
      query: "bea",
      index: 0,
    });
    adapter.setSearch("");
    find.syncFromUrl();
    expect(find.getSnapshot()).toMatchObject({
      open: false,
      query: "",
      index: -1,
    });
  });

  it("reopens on a URL query it already holds", () => {
    const adapter = createMemoryAdapter("find=ada");
    const find = createFindController({ enabled: true, adapter });
    find.configure({ enabled: true, adapter });
    // The bar was closed by hand, but the URL still names the query.
    const snapshot = find.getSnapshot();
    find.syncFromUrl();
    expect(find.getSnapshot()).toBe(snapshot);
    find.setOpen(false);
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    adapter.setSearch("find=ada");
    find.syncFromUrl();
    expect(find.getSnapshot().open).toBe(true);
    find.setOpen(false);
    find.setQuery("ada");
    find.syncFromUrl();
    expect(find.getSnapshot().open).toBe(false);
  });

  it("reopens when the URL catches up with the typed query", () => {
    const adapter = createMemoryAdapter("");
    const find = createFindController({ enabled: true, adapter });
    find.setQuery("ada");
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    adapter.setSearch("find=ada");
    find.syncFromUrl();
    expect(find.getSnapshot()).toMatchObject({ open: true, query: "ada" });
  });

  it("does not adopt the URL while a typed query waits", () => {
    const adapter = createMemoryAdapter("");
    const find = createFindController({ enabled: true, adapter });
    find.openBar();
    find.setQuery("ada");
    adapter.setSearch("find=zed");
    find.syncFromUrl();
    expect(find.getSnapshot().query).toBe("ada");
  });

  it("writes a waiting query on teardown", () => {
    const adapter = createMemoryAdapter("");
    const find = createFindController({ enabled: true, adapter });
    const disconnect = find.connect();
    disconnect();
    expect(adapter.getSearch()).toBe("");
    const again = find.connect();
    find.openBar();
    find.setQuery("ada");
    again();
    expect(readFindQuery(adapter.getSearch())).toBe("ada");
    const written = adapter.getSearch();
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
    expect(adapter.getSearch()).toBe(written);
  });

  it("notifies once per action and stops after unsubscribing", () => {
    const find = createFindController({
      enabled: true,
      adapter: createMemoryAdapter(""),
    });
    const listener = vi.fn();
    const stop = find.subscribe(listener);
    find.openBar();
    expect(listener).toHaveBeenCalledTimes(1);
    find.openBar();
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    find.setQuery("x");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

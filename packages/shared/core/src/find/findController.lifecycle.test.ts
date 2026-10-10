import { afterEach, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/historyAdapter";
import {
  createFindController,
  FIND_URL_WRITE_DEBOUNCE_MS,
} from "./findController";
afterEach(() => vi.useRealTimers());
it("clears pending on disconnect so a reconnect can adopt a Saved View", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter();
  const find = createFindController({ enabled: true, adapter });
  const disconnect = find.connect();
  find.openBar();
  find.setQuery("draft");
  disconnect();
  expect(new URLSearchParams(adapter.getSearch()).get("find")).toBe("draft");
  expect(find.getSnapshot().pending).toBeNull();
  const again = find.connect();
  adapter.setSearch("find=saved");
  find.syncFromUrl();
  expect(find.getSnapshot().query).toBe("saved");
  again();
});
it("flushes a pending query to its original adapter before replacement", () => {
  vi.useFakeTimers();
  const first = createMemoryAdapter();
  const next = createMemoryAdapter("find=next");
  const find = createFindController({ enabled: true, adapter: first });
  find.openBar();
  find.setQuery("draft");
  find.configure({ enabled: true, adapter: next });
  find.syncFromUrl();
  vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
  expect(new URLSearchParams(first.getSearch()).get("find")).toBe("draft");
  expect(next.getSearch()).toBe("find=next");
  expect(find.getSnapshot().query).toBe("next");
});
it("flushes a pending query to its original namespace before replacement", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter("second.find=saved");
  const find = createFindController({
    enabled: true,
    adapter,
    urlKey: "first",
  });
  find.openBar();
  find.setQuery("draft");
  find.configure({ enabled: true, adapter, urlKey: "second" });
  find.syncFromUrl();
  vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
  expect(new URLSearchParams(adapter.getSearch()).get("first.find")).toBe(
    "draft"
  );
  expect(new URLSearchParams(adapter.getSearch()).get("second.find")).toBe(
    "saved"
  );
  expect(find.getSnapshot().query).toBe("saved");
});
it("keeps configure free of URL writes and notifications, then flushes in syncFromUrl", () => {
  vi.useFakeTimers();
  const first = createMemoryAdapter();
  const next = createMemoryAdapter();
  const write = vi.spyOn(first, "setSearch");
  const find = createFindController({ enabled: true, adapter: first });
  find.openBar();
  find.setQuery("draft");
  const notify = vi.fn();
  find.subscribe(notify);
  find.configure({ enabled: true, adapter: next });
  expect(write).not.toHaveBeenCalled();
  expect(notify).not.toHaveBeenCalled();
  find.syncFromUrl();
  expect(new URLSearchParams(first.getSearch()).get("find")).toBe("draft");
  expect(find.getSnapshot().query).toBe("");
});
it("preserves pending destinations when a new query arrives before URL synchronization", () => {
  vi.useFakeTimers();
  const first = createMemoryAdapter();
  const next = createMemoryAdapter();
  const find = createFindController({ enabled: true, adapter: first });
  find.openBar();
  find.setQuery("first");
  find.configure({ enabled: true, adapter: next });
  find.setQuery("next");
  find.flush();
  find.flush();
  expect(new URLSearchParams(first.getSearch()).get("find")).toBe("first");
  expect(new URLSearchParams(next.getSearch()).get("find")).toBe("next");
  const write = vi.spyOn(next, "setSearch");
  vi.runAllTimers();
  expect(write).not.toHaveBeenCalled();
});
it("a debounce that beats synchronization writes only its captured destination", () => {
  vi.useFakeTimers();
  const first = createMemoryAdapter();
  const next = createMemoryAdapter("find=saved");
  const find = createFindController({ enabled: true, adapter: first });
  find.openBar();
  find.setQuery("draft");
  find.configure({ enabled: true, adapter: next });
  vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
  expect(new URLSearchParams(first.getSearch()).get("find")).toBe("draft");
  expect(next.getSearch()).toBe("find=saved");
  find.syncFromUrl();
  expect(find.getSnapshot().query).toBe("saved");
});
it("disabled synchronization flushes the prior destination before returning", () => {
  vi.useFakeTimers();
  const first = createMemoryAdapter();
  const next = createMemoryAdapter("find=saved");
  const find = createFindController({ enabled: true, adapter: first });
  find.openBar();
  find.setQuery("draft");
  find.configure({ enabled: false, adapter: next });
  find.syncFromUrl();
  expect(new URLSearchParams(first.getSearch()).get("find")).toBe("draft");
  expect(next.getSearch()).toBe("find=saved");
  find.configure({ enabled: true, adapter: next });
  find.syncFromUrl();
  expect(find.getSnapshot().query).toBe("saved");
});
it("releases a flushed write before synchronous URL subscribers run", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter("next.find=saved");
  const find = createFindController({
    enabled: true,
    adapter,
    urlKey: "first",
  });
  adapter.subscribe(find.syncFromUrl);
  find.openBar();
  find.setQuery("draft");
  find.configure({ enabled: true, adapter, urlKey: "next" });
  expect(() => find.syncFromUrl()).not.toThrow();
  expect(find.getSnapshot().query).toBe("saved");
  expect(new URLSearchParams(adapter.getSearch()).get("first.find")).toBe(
    "draft"
  );
});
it("keeps a newer query queued by an adapter subscriber during flush", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter();
  const find = createFindController({ enabled: true, adapter });
  let queued = false;
  adapter.subscribe(() => {
    if (!queued) {
      queued = true;
      find.setQuery("newer");
    }
  });
  find.openBar();
  find.setQuery("older");
  find.flush();
  expect(find.getSnapshot().pending).toBe("newer");
  expect(find.getSnapshot().query).toBe("newer");
  vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS);
  expect(new URLSearchParams(adapter.getSearch()).get("find")).toBe("newer");
});
it("new destination typing wins over synchronous synchronization while the old write flushes", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter("next.find=saved");
  const find = createFindController({
    enabled: true,
    adapter,
    urlKey: "first",
  });
  adapter.subscribe(find.syncFromUrl);
  find.openBar();
  find.setQuery("older");
  find.configure({ enabled: true, adapter, urlKey: "next" });
  find.setQuery("newer");
  expect(find.getSnapshot().query).toBe("newer");
  find.flush();
  expect(new URLSearchParams(adapter.getSearch()).get("next.find")).toBe(
    "newer"
  );
});
it("observes destination changes on a reused mutable options object", () => {
  vi.useFakeTimers();
  const adapter = createMemoryAdapter();
  const next = createMemoryAdapter("find=saved");
  const config = { enabled: true, adapter };
  const find = createFindController(config);
  find.setQuery("local-only");
  config.adapter = next;
  find.configure(config);
  find.syncFromUrl();
  expect(find.getSnapshot().query).toBe("saved");
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  createFilterOptionsLoader,
  createQueryEmitter,
  resolveDataTier,
  warnDataTierMisuse,
} from "./dataTier";
afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

const baseQuery = {
  page: 1,
  limit: 25,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  sortLevels: [],
  filters: {},
};
describe("resolveDataTier", () => {
  it("is the source when one is passed, otherwise the frontend rows", () => {
    expect(resolveDataTier({})).toBe("source");
    expect(resolveDataTier(undefined)).toBe("frontend");
  });
});

describe("warnDataTierMisuse", () => {
  it("names a table handed both tiers, or none", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnDataTierMisuse({}, []);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("both `source` and `data`")
    );
    warnDataTierMisuse(undefined, undefined);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no data tier provided")
    );
    warn.mockClear();
    warnDataTierMisuse(undefined, []);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("createQueryEmitter", () => {
  it("aborts the request a newer query supersedes, and hands back its own abort", () => {
    const listener = vi.fn();
    const emitter = createQueryEmitter();
    const abortFirst = emitter.emit(listener, { ...baseQuery }, "a");
    const first = listener.mock.calls[0]![1] as {
      signal: AbortSignal;
      key: string;
    };
    expect(first.key).toBe("a");
    const abortSecond = emitter.emit(listener, { ...baseQuery, page: 2 }, "b");
    const second = listener.mock.calls[1]![1] as { signal: AbortSignal };
    expect(first.signal.aborted).toBe(true);
    expect(second.signal.aborted).toBe(false);
    abortSecond();
    expect(second.signal.aborted).toBe(true);
    abortFirst();
  });

  it("sends only a key it has not seen, and records keys even without a listener", () => {
    const listener = vi.fn();
    const emitter = createQueryEmitter("mount");
    expect(emitter.emitIfChanged(listener, baseQuery, "mount")).toBeUndefined();
    expect(
      emitter.emitIfChanged(undefined, baseQuery, "silent")
    ).toBeUndefined();
    expect(
      emitter.emitIfChanged(listener, baseQuery, "silent")
    ).toBeUndefined();
    expect(listener).not.toHaveBeenCalled();
    const abort = emitter.emitIfChanged(listener, baseQuery, "next");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(typeof abort).toBe("function");
  });
});

describe("createFilterOptionsLoader", () => {
  it("loads each def's options once, and reports nothing after release", async () => {
    const options = vi.fn(() => Promise.resolve([{ value: "a", label: "A" }]));
    const failing = vi.fn(() => Promise.reject(new Error("offline")));
    const defs = [
      { key: "who", type: "select", options },
      { key: "where", type: "select", options: failing },
      { key: "fixed", type: "select", options: [{ value: "x", label: "X" }] },
    ] as never[];
    const loader = createFilterOptionsLoader();
    const onLoaded = vi.fn();
    loader.load(defs, onLoaded);
    loader.load(defs, onLoaded);
    await Promise.resolve();
    await Promise.resolve();
    expect(options).toHaveBeenCalledTimes(1);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith("who", [{ value: "a", label: "A" }]);
    expect(onLoaded).toHaveBeenCalledTimes(1);

    const later = vi.fn(() => Promise.resolve([]));
    const release = loader.load(
      [{ key: "late", type: "select", options: later }] as never[],
      onLoaded
    );
    release();
    await Promise.resolve();
    await Promise.resolve();
    expect(later).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });
});

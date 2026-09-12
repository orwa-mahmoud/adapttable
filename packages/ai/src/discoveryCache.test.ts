import { describe, expect, it } from "vitest";

import {
  createDiscoveryCache,
  DEFAULT_CACHE_GUIDES,
  DEFAULT_CACHE_VERSIONS,
} from "./discoveryCache";
import type { CapabilityGuide } from "./types";

function guide(key: string): CapabilityGuide {
  return {
    schemaVersion: "adapttable.agent.v1",
    key,
    guide: `How to ${key}.`,
    input: { type: "object", properties: {} },
  } as unknown as CapabilityGuide;
}

describe("reusing an answered guide", () => {
  it("answers a second turn from what the first one asked", () => {
    const cache = createDiscoveryCache();
    cache.remember("conn", "v1", [guide("edit.cells")]);

    expect(cache.read("conn", "v1", "edit.cells")?.key).toBe("edit.cells");
    expect(cache.known("conn", "v1", ["edit.cells", "rows.read"])).toEqual([
      "edit.cells",
    ]);
  });

  it("knows nothing about a guide nobody asked for", () => {
    const cache = createDiscoveryCache();

    expect(cache.read("conn", "v1", "edit.cells")).toBeUndefined();
    expect(cache.known("conn", "v1", ["edit.cells"])).toEqual([]);
  });
});

describe("what makes an answer stale", () => {
  it("stops answering when the contract version moves", () => {
    const cache = createDiscoveryCache();
    cache.remember("conn", "v1", [guide("edit.cells")]);

    // A label, a permission or a capability turning off produces a new
    // version. What was answered describes a table that no longer exists in
    // that shape.
    expect(cache.read("conn", "v2", "edit.cells")).toBeUndefined();
    expect(cache.known("conn", "v2", ["edit.cells"])).toEqual([]);
  });

  it("keeps two connections apart", () => {
    const cache = createDiscoveryCache();
    cache.remember("conn-a", "v1", [guide("edit.cells")]);

    // What one backend was told is not what another was told.
    expect(cache.read("conn-b", "v1", "edit.cells")).toBeUndefined();
  });

  it("forgets one connection, or every one", () => {
    const cache = createDiscoveryCache();
    cache.remember("conn-a", "v1", [guide("a")]);
    cache.remember("conn-b", "v1", [guide("b")]);

    cache.forget("conn-a");
    expect(cache.read("conn-a", "v1", "a")).toBeUndefined();
    expect(cache.read("conn-b", "v1", "b")).toBeDefined();

    cache.forget();
    expect(cache.read("conn-b", "v1", "b")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });
});

describe("staying bounded", () => {
  it("drops the least recently used version past its ceiling", () => {
    const clock = { now: 0 };
    const cache = createDiscoveryCache({
      now: () => clock.now,
      maxVersions: 2,
    });
    cache.remember("conn", "v1", [guide("a")]);
    clock.now = 1;
    cache.remember("conn", "v2", [guide("b")]);
    clock.now = 2;
    // Touching v1 leaves v2 the oldest.
    cache.read("conn", "v1", "a");
    clock.now = 3;
    cache.remember("conn", "v3", [guide("c")]);

    expect(cache.read("conn", "v1", "a")).toBeDefined();
    expect(cache.read("conn", "v3", "c")).toBeDefined();
    expect(cache.read("conn", "v2", "b")).toBeUndefined();
  });

  it("stops taking new guides past its per-version ceiling", () => {
    const cache = createDiscoveryCache({ maxGuides: 2 });
    cache.remember("conn", "v1", [guide("a"), guide("b"), guide("c")]);

    expect(cache.known("conn", "v1", ["a", "b", "c"])).toEqual(["a", "b"]);
  });

  it("still replaces a guide it already holds", () => {
    const cache = createDiscoveryCache({ maxGuides: 2 });
    cache.remember("conn", "v1", [guide("a"), guide("b")]);
    cache.remember("conn", "v1", [{ ...guide("a"), guide: "Updated." }]);

    expect(cache.read("conn", "v1", "a")?.guide).toBe("Updated.");
    expect(cache.known("conn", "v1", ["a", "b"])).toEqual(["a", "b"]);
  });

  it("ships bounds a long conversation cannot leak past", () => {
    expect(DEFAULT_CACHE_VERSIONS).toBe(2);
    expect(DEFAULT_CACHE_GUIDES).toBe(64);
  });
});

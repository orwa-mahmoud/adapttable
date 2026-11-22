import { describe, expect, it, vi } from "vitest";

import { composeMounts, createFeatureMounts } from "./featureMounts";

interface Feature {
  readonly id: string;
  readonly option?: string;
  readonly dependencies?: readonly unknown[];
  readonly mount?: () => void | (() => void);
}

function tracked() {
  const log: string[] = [];
  const mounts = createFeatureMounts<Feature>((id, latest) => {
    log.push(`acquire ${id} ${latest().option ?? ""}`.trim());
    const release = latest().mount?.();
    return () => {
      log.push(`release ${id}`);
      if (typeof release === "function") release();
    };
  });
  return { log, mounts };
}

const resource = (id: string, option?: string, deps?: readonly unknown[]) => ({
  id,
  option,
  dependencies: deps,
  mount: () => undefined,
});

describe("createFeatureMounts", () => {
  it("acquires each feature with a mount once, and skips the rest", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a"), { id: "plain" }, resource("b")]);
    expect(log).toEqual(["acquire a", "acquire b"]);
  });

  it("keeps a resource across an ordinary option change and hands it the latest declaration", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a", "first")]);
    mounts.reconcile([resource("a", "second")]);
    expect(log).toEqual(["acquire a first"]);
    expect(mounts.current("a")?.option).toBe("second");
  });

  it("keeps resources when the features are reordered", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a"), resource("b")]);
    mounts.reconcile([resource("b"), resource("a")]);
    expect(log).toEqual(["acquire a", "acquire b"]);
  });

  it("replaces a resource whose dependencies changed", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a", undefined, [1])]);
    mounts.reconcile([resource("a", undefined, [1])]);
    mounts.reconcile([resource("a", undefined, [2])]);
    expect(log).toEqual(["acquire a", "release a", "acquire a"]);
  });

  it("releases a removed feature exactly once", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a"), resource("b")]);
    mounts.reconcile([resource("b")]);
    mounts.reconcile([resource("b")]);
    mounts.dispose();
    expect(log).toEqual(["acquire a", "acquire b", "release a", "release b"]);
  });

  it("releases a feature that no longer mounts", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a")]);
    mounts.reconcile([{ id: "a" }]);
    expect(log).toEqual(["acquire a", "release a"]);
  });

  it("disposes once, in reverse order, and ignores later reconciles", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("a"), resource("b")]);
    mounts.dispose();
    mounts.dispose();
    mounts.reconcile([resource("c")]);
    expect(log).toEqual(["acquire a", "acquire b", "release b", "release a"]);
  });

  it("rolls back what one pass acquired when a mount fails", () => {
    const { log, mounts } = tracked();
    mounts.reconcile([resource("kept")]);
    const failing = {
      id: "broken",
      mount: () => {
        throw new Error("no connection");
      },
    };
    expect(() =>
      mounts.reconcile([resource("kept"), resource("fresh"), failing])
    ).toThrow("no connection");
    expect(log).toEqual([
      "acquire kept",
      "acquire fresh",
      "acquire broken",
      "release fresh",
    ]);
    mounts.dispose();
    expect(log.at(-1)).toBe("release kept");
  });

  it("runs every release when one throws, and rethrows that error", () => {
    const first = vi.fn(() => {
      throw new Error("first");
    });
    const second = vi.fn();
    const mounts = createFeatureMounts<Feature>((id) =>
      id === "a" ? first : second
    );
    mounts.reconcile([resource("a"), resource("b")]);
    expect(() => {
      mounts.dispose();
    }).toThrow("first");
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("reports several failed releases together", () => {
    const mounts = createFeatureMounts<Feature>((id) => () => {
      throw new Error(id);
    });
    mounts.reconcile([resource("a"), resource("b")]);
    expect(() => {
      mounts.dispose();
    }).toThrow(AggregateError);
  });
});

describe("composeMounts", () => {
  it("runs the present mounts in order and releases them in reverse", () => {
    const log: string[] = [];
    const step = (name: string) => () => {
      log.push(`mount ${name}`);
      return () => log.push(`release ${name}`);
    };
    const mount = composeMounts(step("core"), undefined, step("binding"));
    const release = mount?.(undefined);
    if (typeof release === "function") release();
    expect(log).toEqual([
      "mount core",
      "mount binding",
      "release binding",
      "release core",
    ]);
  });

  it("hands back the one present mount, and nothing for none", () => {
    const only = () => undefined;
    expect(composeMounts(undefined, only)).toBe(only);
    expect(composeMounts(undefined, undefined)).toBeUndefined();
  });

  it("releases the earlier mounts when a later one fails", () => {
    const released = vi.fn();
    const mount = composeMounts(
      () => released,
      () => {
        throw new Error("binding failed");
      }
    );
    expect(() => mount?.(undefined)).toThrow("binding failed");
    expect(released).toHaveBeenCalledTimes(1);
  });
});

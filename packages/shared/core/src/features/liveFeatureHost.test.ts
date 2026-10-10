import { describe, expect, it, vi } from "vitest";

import {
  createFeatureHost,
  disposeFeatureHost,
  EMPTY_FEATURE_HOST,
  LiveFeatureHost,
} from "./liveFeatureHost";

describe("LiveFeatureHost", () => {
  it("collects every registration into the bag the table reads", () => {
    const host = new LiveFeatureHost<{ id: string }>();
    const spec = { type: "rating", operators: [] } as never;
    const editor = (() => null) as never;
    const aggregator = (() => 0) as never;
    const writer = { id: "tsv" } as never;
    const menu = () => undefined;
    const command = { key: "audit", label: "Audit", onSelect: vi.fn() };
    const items = () => [];

    host.registerFilterType(spec);
    host.extendFilterType("text", { label: "Words" } as never);
    host.registerEditor("stars", editor);
    host.registerAggregator("distinct", aggregator);
    host.registerWriter(writer);
    host.registerColumnMenuAction(menu);
    host.registerPanel({ key: "settings" });
    host.registerCommand(command);
    host.registerContextMenuItems(items);

    expect(host.filterTypes).toEqual([spec]);
    expect(host.filterExtends).toEqual([
      { type: "text", patch: { label: "Words" } },
    ]);
    expect(host.editors.get("stars")).toBe(editor);
    expect(host.aggregators.get("distinct")).toBe(aggregator);
    expect(host.writers).toEqual([writer]);
    expect(host.columnMenuActions).toEqual([menu]);
    expect(host.panels).toEqual([{ key: "settings" }]);
    expect(host.commands).toEqual([command]);
    expect(host.contextMenuItems).toEqual([items]);
  });

  it("runs each cleanup once, however often it is disposed", () => {
    const host = new LiveFeatureHost();
    const cleanup = vi.fn();
    host.onDispose(cleanup);
    host.dispose();
    host.dispose();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it.each([new Error("first cleanup failed"), undefined])(
    "runs independent cleanups once and preserves the first failure: %s",
    (failure: unknown) => {
      const host = new LiveFeatureHost();
      const calls: string[] = [];
      const reported: unknown[] = [];
      host.onDispose(() => {
        calls.push("first");
        host.dispose();
        throw failure;
      });
      host.onDispose(() => {
        calls.push("second");
        throw new Error("second cleanup failed");
      });
      host.onDispose(() => calls.push("last"));

      try {
        host.dispose();
      } catch (error) {
        reported.push(error);
      }

      expect(reported).toHaveLength(1);
      expect(reported[0]).toBe(failure);
      expect(calls).toEqual(["first", "second", "last"]);
      expect(() => host.dispose()).not.toThrow();
      expect(calls).toEqual(["first", "second", "last"]);
    }
  );
});

describe("createFeatureHost", () => {
  it("shares the empty host when nothing registers", () => {
    expect(createFeatureHost(undefined)).toBe(EMPTY_FEATURE_HOST);
    expect(createFeatureHost([{}, {}])).toBe(EMPTY_FEATURE_HOST);
  });

  it("runs every setup against one fresh host and keeps its cleanups", () => {
    const cleanup = vi.fn();
    const host = createFeatureHost([
      { setup: (live) => live.registerPanel({ key: "a" }) },
      {
        setup: (live) => {
          live.registerPanel({ key: "b" });
          return cleanup;
        },
      },
    ]);
    expect(host).toBeInstanceOf(LiveFeatureHost);
    expect(host.panels.map((panel) => panel.key)).toEqual(["a", "b"]);

    disposeFeatureHost(host);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("rolls back earlier and partial setups once and skips later setups", () => {
    const failure = new Error("setup failed");
    const registeredCleanup = vi.fn();
    const returnedCleanup = vi.fn();
    const partialCleanup = vi.fn();
    const laterSetup = vi.fn();
    const hosts: LiveFeatureHost[] = [];
    const reported: unknown[] = [];

    try {
      createFeatureHost([
        {
          setup: (host) => {
            hosts.push(host);
            host.onDispose(registeredCleanup);
            return returnedCleanup;
          },
        },
        {
          setup: (host) => {
            host.onDispose(partialCleanup);
            throw failure;
          },
        },
        { setup: laterSetup },
      ]);
    } catch (error) {
      reported.push(error);
    }

    expect(reported).toHaveLength(1);
    expect(reported[0]).toBe(failure);
    expect(registeredCleanup).toHaveBeenCalledTimes(1);
    expect(returnedCleanup).toHaveBeenCalledTimes(1);
    expect(partialCleanup).toHaveBeenCalledTimes(1);
    expect(laterSetup).not.toHaveBeenCalled();
    expect(() => hosts[0]?.dispose()).not.toThrow();
    expect(registeredCleanup).toHaveBeenCalledTimes(1);
    expect(returnedCleanup).toHaveBeenCalledTimes(1);
    expect(partialCleanup).toHaveBeenCalledTimes(1);
  });

  it.each([new Error("setup failed"), undefined])(
    "preserves the setup failure even when rollback fails: %s",
    (failure: unknown) => {
      const cleanupFailure = new Error("cleanup failed");
      const failedCleanup = vi.fn(() => {
        throw cleanupFailure;
      });
      const lastCleanup = vi.fn();
      const hosts: LiveFeatureHost[] = [];
      const reported: unknown[] = [];

      try {
        createFeatureHost([
          {
            setup: (host) => {
              hosts.push(host);
              return failedCleanup;
            },
          },
          {
            setup: (host) => {
              host.onDispose(lastCleanup);
              throw failure;
            },
          },
        ]);
      } catch (error) {
        reported.push(error);
      }

      expect(reported).toHaveLength(1);
      expect(reported[0]).toBe(failure);
      expect(failedCleanup).toHaveBeenCalledTimes(1);
      expect(lastCleanup).toHaveBeenCalledTimes(1);
      expect(() => hosts[0]?.dispose()).not.toThrow();
      expect(failedCleanup).toHaveBeenCalledTimes(1);
      expect(lastCleanup).toHaveBeenCalledTimes(1);
    }
  );
});

describe("disposeFeatureHost", () => {
  it("leaves the shared empty host and foreign hosts alone", () => {
    const dispose = vi.spyOn(LiveFeatureHost.prototype, "dispose");
    disposeFeatureHost(EMPTY_FEATURE_HOST);
    disposeFeatureHost({ ...EMPTY_FEATURE_HOST });
    expect(dispose).not.toHaveBeenCalled();
    dispose.mockRestore();
  });
});

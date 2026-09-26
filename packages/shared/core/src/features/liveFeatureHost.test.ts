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

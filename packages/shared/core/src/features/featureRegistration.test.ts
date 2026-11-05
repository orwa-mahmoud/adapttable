import { describe, expect, it, vi } from "vitest";

import {
  invokeCleanups,
  planFeatureRegistration,
  preferLastById,
  projectFeatureHosts,
} from "./featureRegistration";
import { LiveFeatureHost } from "./liveFeatureHost";

describe("preferLastById", () => {
  it("keeps the last declaration and the earlier ids in winner order", () => {
    const first = { id: "alpha", command: "first" };
    const beta = { id: "beta", command: "beta" };
    const second = { id: "alpha", command: "second" };
    expect(preferLastById([first, beta, second])).toEqual([beta, second]);
  });
});

describe("planFeatureRegistration", () => {
  it("retains the same feature, releases a removed one, and mounts a new one", () => {
    const alpha = { id: "alpha" };
    const beta = { id: "beta" };
    const gamma = { id: "gamma" };
    const plan = planFeatureRegistration(
      [
        { id: "beta", feature: beta },
        { id: "alpha", feature: alpha },
      ],
      [
        { id: "alpha", feature: alpha },
        { id: "gamma", feature: gamma },
      ],
      Object.is
    );
    expect(plan.release).toEqual(["beta"]);
    expect(plan.mount.map((entry) => entry.id)).toEqual(["gamma"]);
  });
});

describe("projectFeatureHosts", () => {
  it("reads the feature hosts in order and lets a later name win", () => {
    const first = new LiveFeatureHost();
    const second = new LiveFeatureHost();
    const early = { key: "audit", label: "Early", onSelect: vi.fn() };
    const later = { key: "audit", label: "Later", onSelect: vi.fn() };
    first.registerCommand(early);
    first.registerPanel({ key: "first" });
    second.registerCommand(later);
    second.registerPanel({ key: "second" });
    const projected = projectFeatureHosts([first, second]);
    expect(projected.commands).toEqual([early, later]);
    expect(projected.panels.map((panel) => panel.key)).toEqual([
      "first",
      "second",
    ]);
    first.dispose();
    expect(projected.commands).toHaveLength(2);
  });
});

describe("invokeCleanups", () => {
  it("runs every cleanup and returns each failure", () => {
    const calls: string[] = [];
    const failures = invokeCleanups([
      () => {
        calls.push("first");
        throw new Error("first");
      },
      () => {
        calls.push("second");
      },
    ]);
    expect(calls).toEqual(["first", "second"]);
    expect(failures).toHaveLength(1);
  });
});

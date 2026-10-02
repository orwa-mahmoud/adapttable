/** Dirty state remains host-confirmed and follows its Angular scope. */
import {
  createEnvironmentInjector,
  EnvironmentInjector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { type DirtyEdits, injectDirtyCells } from "./dirtyCells";

function scope() {
  return createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
}

describe("injectDirtyCells", () => {
  it("tracks each changed cell until the host confirms its cell, row or table", () => {
    const injector = scope();
    const reports: DirtyEdits[] = [];
    const dirty = injectDirtyCells({
      enabled: true,
      onDirtyChange: (state) => {
        reports.push(state);
      },
      injector,
    });
    TestBed.tick();
    expect(reports.map((state) => state.count)).toEqual([0]);
    dirty().mark("1", "name");
    dirty().mark("1", "budget");
    dirty().mark("2", "name");
    TestBed.tick();
    expect(dirty().count).toBe(3);
    expect(dirty().isRowDirty("1")).toBe(true);
    expect(dirty().isDirty("2", "budget")).toBe(false);
    expect(reports.at(-1)!.count).toBe(3);
    const confirm = dirty().confirm;
    reports.at(-1)!.confirm("1", "name");
    expect(dirty().count).toBe(2);
    expect(dirty().confirm).toBe(confirm);
    expect(dirty().isDirty("1", "name")).toBe(false);
    reports.at(-1)!.confirmRow("1");
    expect(dirty().count).toBe(1);
    expect(dirty().isRowDirty("1")).toBe(false);
    reports.at(-1)!.confirmAll();
    TestBed.tick();
    expect(dirty().count).toBe(0);
    expect(reports.at(-1)!.count).toBe(0);
    injector.destroy();
  });

  it("does not invent dirty marks while tracking is disabled", () => {
    const injector = scope();
    const enabled = signal(false);
    const dirty = injectDirtyCells({ enabled, injector });
    dirty().mark("1", "name");
    expect(dirty().count).toBe(0);
    enabled.set(true);
    TestBed.tick();
    dirty().mark("1", "name");
    expect(dirty().isDirty("1", "name")).toBe(true);
    enabled.set(false);
    TestBed.tick();
    dirty().mark("2", "name");
    expect(dirty().count).toBe(1);
    expect(dirty().isDirty("2", "name")).toBe(false);
    injector.destroy();
  });

  it("releases the subscription and host reporting when its scope is destroyed", () => {
    const injector = scope();
    const report = vi.fn();
    const dirty = injectDirtyCells({
      enabled: true,
      onDirtyChange: report,
      injector,
    });
    TestBed.tick();
    dirty().mark("1", "name");
    TestBed.tick();
    expect(report.mock.calls.map(([state]) => state.count)).toEqual([0, 1]);
    injector.destroy();
    dirty().mark("2", "name");
    TestBed.tick();
    expect(report.mock.calls.map(([state]) => state.count)).toEqual([0, 1]);
    expect(dirty().count).toBe(1);
  });
});

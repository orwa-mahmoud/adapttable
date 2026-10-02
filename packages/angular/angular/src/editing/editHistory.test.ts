/** Edit gestures replay through the host and report availability changes. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  injectTableEditHistory,
  type TableEditHistoryProps,
} from "./editHistory";

interface Row {
  name: string;
}
@Component({ template: "" })
class Host {
  readonly saved = vi.fn();
  readonly changed = vi.fn();
  readonly options = signal<TableEditHistoryProps<Row>>({
    editHistory: { depth: 2, onChange: this.changed },
    columns: [{ key: "name" }],
    onCellEdit: this.saved,
  });
  readonly state = injectTableEditHistory(this.options);
}

describe("injectTableEditHistory", () => {
  it("records a cell before the host changes it and replays without recording again", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const row = { name: "Before" };
    expect(host.changed.mock.lastCall?.[0]).toMatchObject({
      canUndo: false,
      canRedo: false,
    });
    host.state().onCellEdit!(row, "name", "After");
    expect(host.saved).toHaveBeenLastCalledWith(row, "name", "After");
    row.name = "After";
    fixture.detectChanges();
    expect(host.changed.mock.lastCall?.[0]).toMatchObject({
      canUndo: true,
      canRedo: false,
    });
    expect(host.state().history.undo()).toBe(1);
    expect(host.saved).toHaveBeenLastCalledWith(row, "name", "Before");
    expect(host.state().history.canRedo).toBe(true);
    expect(host.state().history.redo()).toBe(1);
    expect(host.saved).toHaveBeenLastCalledWith(row, "name", "After");
    host.state().history.clear();
    expect(host.state().history.canUndo).toBe(false);
    expect(host.state().history.canRedo).toBe(false);
  });

  it("forwards writes while disabled without adding an undo entry", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.options.update((options) => ({ ...options, editHistory: false }));
    fixture.detectChanges();
    const row = { name: "Before" };
    host.state().onCellEdit!(row, "name", "After");
    expect(host.saved).toHaveBeenCalledWith(row, "name", "After");
    expect(host.state().history.enabled).toBe(false);
    expect(host.state().history.canUndo).toBe(false);
    expect(host.changed).not.toHaveBeenCalled();
  });
  it("limits gesture depth and follows current columns and host callbacks", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const row = { name: "Before" };
    const next = vi.fn();
    host.options.update((options) => ({
      ...options,
      editHistory: { depth: 1 },
      columns: [{ key: "name", editValue: () => "Custom" }],
      onCellEdit: next,
    }));
    fixture.detectChanges();
    host.state().onCellEdit!(row, "name", "One");
    host.state().onCellEdit!(row, "name", "Two");
    expect(next).toHaveBeenLastCalledWith(row, "name", "Two");
    expect(host.saved).not.toHaveBeenCalled();
    expect(host.state().history.undo()).toBe(1);
    expect(next).toHaveBeenLastCalledWith(row, "name", "Custom");
    expect(host.state().history.undo()).toBe(0);
    host.options.set({ columns: [] });
    fixture.detectChanges();
    expect(host.state().onCellEdit).toBeUndefined();
    expect(host.state().history.enabled).toBe(false);
  });

  it("keeps host controls stable and reports only availability changes", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const initial = host.changed.mock.lastCall![0];
    host.state().onCellEdit!({ name: "One" }, "name", "Two");
    fixture.detectChanges();
    const after = host.changed.mock.lastCall![0];
    expect(after.undo).toBe(initial.undo);
    expect(after.redo).toBe(initial.redo);
    expect(after.clear).toBe(initial.clear);
    expect(host.changed).toHaveBeenCalledTimes(2);
    host.state().onCellEdit!({ name: "Two" }, "name", "Three");
    fixture.detectChanges();
    expect(host.changed).toHaveBeenCalledTimes(2);
  });
});

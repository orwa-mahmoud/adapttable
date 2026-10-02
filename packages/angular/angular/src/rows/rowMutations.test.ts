/** Host-owned row mutations follow the current handlers and localized labels. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectRowMutations, type RowMutationsOptions } from "./rowMutations";

@Component({ template: "" })
class Host {
  readonly added = vi.fn();
  readonly copied = vi.fn();
  readonly removed = vi.fn();
  readonly options = signal<RowMutationsOptions<unknown>>({
    onAddRow: this.added,
    onDuplicateRow: this.copied,
    onDeleteRow: this.removed,
    confirmDeleteRow: true,
    labels: {
      duplicateRow: "Copy",
      deleteRow: "Remove",
      deleteRowConfirm: "Remove this row?",
    },
  });
  readonly mutations = injectRowMutations(this.options);
}

describe("injectRowMutations", () => {
  it("asks the host to add, duplicate and delete with localized confirmation", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const row = { id: "one" };
    const state = host.mutations();
    expect(state.canAdd).toBe(true);
    state.addRow();
    expect(host.added).toHaveBeenCalledOnce();
    expect(state.actions.map((action) => action.label)).toEqual([
      "Copy",
      "Remove",
    ]);
    const copy = state.actions[0]!;
    const remove = state.actions[1]!;
    copy.onClick!(row);
    remove.onClick!(row);
    expect(host.copied).toHaveBeenCalledWith(row);
    expect(host.removed).toHaveBeenCalledWith(row);
    expect(remove.confirm?.title).toBe("Remove");
    expect(remove.confirm!.message(row)).toBe("Remove this row?");
  });
  it("removes unavailable actions and follows replacement handlers without stale callbacks", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const first = host.mutations();
    const next = vi.fn();
    host.options.update((current) => ({
      ...current,
      onAddRow: next,
      onDuplicateRow: undefined,
      confirmDeleteRow: false,
    }));
    first.addRow();
    expect(next).toHaveBeenCalledOnce();
    expect(host.added).not.toHaveBeenCalled();
    expect(host.mutations().actions.map((action) => action.label)).toEqual([
      "Remove",
    ]);
    expect(host.mutations().actions[0]!.confirm).toBeUndefined();
    host.options.set({ labels: host.options().labels });
    expect(host.mutations().canAdd).toBe(false);
    expect(host.mutations().actions).toEqual([]);
    first.addRow();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

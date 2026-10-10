/** Selection follows the result set and the lifetime of its Angular owner. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectRowSelection } from "./selection";

@Component({ template: "" })
class Host {
  readonly allowed = signal(true);
  readonly reset = signal("initial");
  readonly ids = signal<readonly string[] | undefined>(undefined);
  readonly changed = vi.fn();
  readonly selection = injectRowSelection(this.options());

  private options() {
    const allowed = this.allowed;
    return {
      rows: signal([{ id: "one" }, { id: "two" }]),
      rowKey: (row: { id: string }) => row.id,
      selectedIds: this.ids,
      onSelectionChange: this.changed,
      resetKey: this.reset,
      get acrossPages() {
        return allowed();
      },
    };
  }
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance };
}

describe("row selection scope", () => {
  it("revokes all-matching selection with the capability and never restores it implicitly", async () => {
    const { fixture, host } = await mount();
    host.selection.toggleAll();
    host.selection.selectAllMatching();
    expect(host.selection.allMatching()).toBe(true);
    host.allowed.set(false);
    // Reads are safe even before Angular runs the scope cleanup effect.
    expect(host.selection.state().acrossPages).toBe(false);
    expect(host.selection.allMatching()).toBe(false);
    expect(host.selection.state().allMatching).toBe(false);
    await fixture.whenStable();
    expect(host.selection.state().acrossPages).toBe(false);
    expect(host.selection.allMatching()).toBe(false);
    host.selection.selectAllMatching();
    expect(host.selection.allMatching()).toBe(false);
    expect([...host.selection.selectedIds()]).toEqual(["one", "two"]);
    host.allowed.set(true);
    await fixture.whenStable();
    expect(host.selection.allMatching()).toBe(false);
    host.selection.selectAllMatching();
    expect(host.selection.allMatching()).toBe(true);
  });

  it("resets once per new result set and narrows broad scope even with no explicit ids", async () => {
    const { fixture, host } = await mount();
    expect(host.changed).not.toHaveBeenCalled();
    host.selection.toggle("one");
    host.selection.selectAllMatching();
    host.changed.mockClear();
    host.reset.set("filtered");
    await fixture.whenStable();
    expect(host.selection.selectedCount()).toBe(0);
    expect(host.selection.allMatching()).toBe(false);
    expect(host.changed).toHaveBeenCalledExactlyOnceWith([]);
    host.selection.selectAllMatching();
    host.changed.mockClear();
    host.reset.set("another-filter");
    await fixture.whenStable();
    expect(host.selection.allMatching()).toBe(false);
    expect(host.changed).not.toHaveBeenCalled();
  });

  it("requests a controlled reset without replacing host ids or repeating on host updates", async () => {
    const { fixture, host } = await mount();
    host.ids.set(["one"]);
    await fixture.whenStable();
    expect(host.changed).not.toHaveBeenCalled();
    host.reset.set("filtered");
    await fixture.whenStable();
    expect(host.changed).toHaveBeenCalledExactlyOnceWith([]);
    expect([...host.selection.selectedIds()]).toEqual(["one"]);
    host.ids.set(["two"]);
    await fixture.whenStable();
    expect([...host.selection.selectedIds()]).toEqual(["two"]);
    expect(host.changed).toHaveBeenCalledTimes(1);
    host.selection.toggle("one");
    expect(host.changed).toHaveBeenLastCalledWith(["two", "one"]);
    expect([...host.selection.selectedIds()]).toEqual(["two"]);
  });

  it.each([false, true])(
    "narrows all-matching scope before reset effects run (controlled: %s)",
    async (controlled) => {
      const { fixture, host } = await mount();
      if (controlled) host.ids.set(["one"]);
      else host.selection.toggle("one");
      await fixture.whenStable();
      host.selection.selectAllMatching();
      expect(host.selection.allMatching()).toBe(true);
      host.changed.mockClear();
      host.reset.set("new-query");
      expect(host.selection.allMatching()).toBe(false);
      expect(host.selection.state().allMatching).toBe(false);
      expect(host.selection.headerCheckboxAttrs()).toMatchObject({
        checked: false,
        indeterminate: true,
      });
      expect(host.changed).not.toHaveBeenCalled();
      await fixture.whenStable();
      expect(host.selection.allMatching()).toBe(false);
      expect([...host.selection.selectedIds()]).toEqual(
        controlled ? ["one"] : []
      );
      expect(host.changed).toHaveBeenCalledExactlyOnceWith([]);
      await fixture.whenStable();
      expect(host.changed).toHaveBeenCalledTimes(1);
      host.selection.selectAllMatching();
      expect(host.selection.allMatching()).toBe(true);
      expect(host.selection.state().allMatching).toBe(true);
      expect(host.changed).toHaveBeenCalledTimes(1);
    }
  );

  it("keeps its own selection through controlled and uncontrolled handoffs", async () => {
    const { fixture, host } = await mount();
    host.selection.toggle("one");
    host.changed.mockClear();
    host.ids.set(["two"]);
    await fixture.whenStable();
    expect([...host.selection.selectedIds()]).toEqual(["two"]);
    expect(host.changed).not.toHaveBeenCalled();
    host.selection.toggle("one");
    expect(host.changed).toHaveBeenCalledExactlyOnceWith(["two", "one"]);
    expect([...host.selection.selectedIds()]).toEqual(["two"]);
    host.changed.mockClear();
    host.ids.set(undefined);
    await fixture.whenStable();
    expect([...host.selection.selectedIds()]).toEqual(["one"]);
    expect(host.changed).not.toHaveBeenCalled();
    host.ids.set(["two"]);
    await fixture.whenStable();
    host.ids.set(undefined);
    await fixture.whenStable();
    expect([...host.selection.selectedIds()]).toEqual(["one"]);
    expect(host.changed).not.toHaveBeenCalled();
    host.selection.toggle("two");
    expect([...host.selection.selectedIds()]).toEqual(["one", "two"]);
    expect(host.changed).toHaveBeenCalledExactlyOnceWith(["one", "two"]);
  });

  it("makes retained selection controls inert after destruction", async () => {
    const { fixture, host } = await mount();
    host.selection.toggle("one");
    const state = host.selection.state();
    const checkbox = host.selection.headerCheckboxAttrs();
    host.changed.mockClear();
    fixture.destroy();
    state.clear();
    state.toggle("two");
    state.toggleAll();
    state.toggleGroupLeaves(["one", "two"]);
    state.replace(["two"]);
    state.selectAllMatching();
    (checkbox.onChange as () => void)();
    expect(host.changed).not.toHaveBeenCalled();
    expect([...host.selection.selectedIds()]).toEqual(["one"]);
    expect(host.selection.allMatching()).toBe(false);
  });
});

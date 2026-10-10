/** The shared shell supplies source capabilities and result-set identity. */
import type { TableSource } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { ADAPTTABLE_CONTEXT_MENU } from "../actions/tableContextMenu";
import { injectFrontendData } from "../source/frontendData";
import { AdaptDataTableShell } from "./dataTableShell";

interface Row {
  id: string;
  name: string;
}

@Component({
  template: "",
  providers: [
    { provide: ADAPTTABLE_CONTEXT_MENU, useFactory: () => signal(null) },
  ],
})
class Shell extends AdaptDataTableShell<Row> {
  readonly current = this.view;
}

async function mount(controlled?: readonly string[]) {
  const base = TestBed.runInInjectionContext(() =>
    injectFrontendData({
      data: [{ id: "one", name: "Ada" }],
      columns: [{ key: "name" }],
      urlSync: false,
    })
  );
  const source = signal<TableSource<Row>>(base());
  const fixture = TestBed.createComponent(Shell);
  fixture.componentRef.setInput("source", source);
  fixture.componentRef.setInput("columns", [{ key: "name" }]);
  fixture.componentRef.setInput("rowKey", (row: Row) => row.id);
  fixture.componentRef.setInput("urlSync", false);
  fixture.componentRef.setInput("selectable", true);
  fixture.componentRef.setInput("selectedIds", controlled);
  const changed = vi.fn();
  fixture.componentInstance.selectionChange.subscribe(changed);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const selection = fixture.componentInstance.current()!.selection!;
  return { fixture, source, selection, changed };
}

describe("shell selection scope", () => {
  it("honors an explicit page-only capability even when the source has all rows and a total", async () => {
    const { fixture, source, selection } = await mount();
    selection.toggleAll();
    selection.selectAllMatching();
    expect(selection.allMatching()).toBe(true);
    source.update((current) => ({
      ...current,
      capabilities: {
        fullDataset: true,
        grouping: "client",
        selectAcrossPages: false,
        exportScope: "all",
        totalCount: "exact",
      },
    }));
    await fixture.whenStable();
    expect(selection.state().acrossPages).toBe(false);
    expect(selection.allMatching()).toBe(false);
    selection.selectAllMatching();
    expect(selection.allMatching()).toBe(false);
  });

  it.each<Partial<TableSource<Row>>>([
    { search: "Ada" },
    { extra: { team: "Core" } },
    { filterTree: { combinator: "and", conditions: [] } },
    { groupBy: "team" },
  ])(
    "clears stale selection when the result set changes: %j",
    async (patch) => {
      const { fixture, source, selection, changed } = await mount();
      selection.toggleAll();
      selection.selectAllMatching();
      changed.mockClear();
      source.update((current) => ({ ...current, ...patch }));
      await fixture.whenStable();
      expect(selection.selectedCount()).toBe(0);
      expect(selection.allMatching()).toBe(false);
      expect(changed).toHaveBeenCalledExactlyOnceWith([]);
    }
  );

  it("preserves selection across pagination, sorting and equivalent filter objects", async () => {
    const { fixture, source, selection, changed } = await mount();
    source.update((current) => ({
      ...current,
      extra: { team: "Core", city: "London" },
    }));
    await fixture.whenStable();
    selection.toggleAll();
    selection.selectAllMatching();
    changed.mockClear();
    source.update((current) => ({
      ...current,
      page: 2,
      limit: 50,
      sortBy: "name",
      sortDir: "desc",
      extra: { city: "London", team: "Core" },
    }));
    await fixture.whenStable();
    expect([...selection.selectedIds()]).toEqual(["one"]);
    expect(selection.allMatching()).toBe(true);
    expect(changed).not.toHaveBeenCalled();
  });

  it("preserves host-controlled preselection at mount and requests resets without overriding it", async () => {
    const { fixture, source, selection, changed } = await mount(["one"]);
    expect([...selection.selectedIds()]).toEqual(["one"]);
    expect(changed).not.toHaveBeenCalled();
    source.update((current) => ({ ...current, search: "Grace" }));
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledExactlyOnceWith([]);
    expect([...selection.selectedIds()]).toEqual(["one"]);
  });
});

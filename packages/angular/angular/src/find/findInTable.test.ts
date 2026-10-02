/**
 * Find state over the loaded rows: the bar, the walk, and a query the URL
 * already carries.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { Component, inject, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectFindInTable } from "./findInTable";

interface Row {
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { name: "Ada", team: "Core" },
  { name: "Grace", team: "Web" },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
];

@Component({ template: "" })
class Host {
  readonly rows = signal(ROWS);
  readonly columns = signal(COLUMNS);
  readonly enabled = signal(true);
  readonly find = injectFindInTable({
    enabled: this.enabled,
    rows: this.rows,
    columns: this.columns,
    urlSync: false,
    injector: inject(Injector),
  });
}

@Component({ template: "" })
class LinkedHost {
  readonly find = injectFindInTable({
    rows: signal(ROWS),
    columns: signal(COLUMNS),
    urlAdapter: createMemoryAdapter("find=ace"),
    injector: inject(Injector),
  });
}

describe("injectFindInTable", () => {
  it("starts closed and walks the hits it finds", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const find = fixture.componentInstance.find;
    expect(find().open).toBe(false);
    expect(find().openBar).toBeTypeOf("function");
    find().openBar?.();
    fixture.detectChanges();
    expect(find().open).toBe(true);
    find().setQuery("e");
    fixture.detectChanges();
    expect(find().matches.length).toBeGreaterThan(1);
    expect(find().index).toBe(0);
    find().next();
    fixture.detectChanges();
    expect(find().index).toBe(1);
    find().previous();
    fixture.detectChanges();
    expect(find().index).toBe(0);
    find().setOpen(false);
    fixture.detectChanges();
    expect(find().open).toBe(false);
    expect(find().query).toBe("");
    expect(find().matches).toEqual([]);
  });

  it("stays inert while disabled", () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.enabled.set(false);
    fixture.detectChanges();
    const find = fixture.componentInstance.find;
    expect(find().openBar).toBeUndefined();
    find().setOpen(true);
    find().setQuery("Ada");
    fixture.detectChanges();
    expect(find().open).toBe(false);
    expect(find().matches).toEqual([]);
  });

  it("opens on a find query the URL already carries", () => {
    const fixture = TestBed.createComponent(LinkedHost);
    fixture.detectChanges();
    const find = fixture.componentInstance.find;
    expect(find().open).toBe(true);
    expect(find().query).toBe("ace");
    expect(find().current).toEqual({ row: 1, col: 0 });
  });
});

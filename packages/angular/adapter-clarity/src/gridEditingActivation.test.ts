/** A keyboard reader can open the same gated editor as a pointer reader. */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/clarity/cell-navigation";
import { editing } from "@adapttable/clarity/editing";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
  writable: boolean;
}

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="rows()"
    [columns]="columns()"
    [rowKey]="rowKey"
    [features]="features()"
    [forceMobile]="false"
    [urlSync]="false"
  />`,
})
class Host {
  readonly rows = signal<readonly Row[]>([
    { id: "1", name: "Before", writable: true },
  ]);
  readonly columns = signal<readonly ColumnDef<Row>[]>([
    { key: "name", editable: (row) => row.writable },
  ]);
  readonly rowKey = (row: Row) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
}

async function mount(features: readonly AdaptTableFeature[]) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  document.body.append(fixture.nativeElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const cell = () => root.querySelector<HTMLElement>('[role="gridcell"]')!;
  const editor = () =>
    root.querySelector<HTMLInputElement>(
      '[data-adapttable-part="edit-cell-editor"]'
    );
  const activate = (key: string) => {
    cell().focus();
    cell().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };
  return { fixture, cell, editor, activate };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("grid cell editing activation", () => {
  it.each(["Enter", "F2"])(
    "opens and commits the focused cell with %s",
    async (key) => {
      const commit = vi.fn();
      const start = vi.fn();
      const { fixture, editor, activate } = await mount([
        editing<Row>(commit, { onEditStart: start }),
        cellNavigation(),
      ]);
      activate(key);
      await fixture.whenStable();
      expect(editor()?.value).toBe("Before");
      expect(start).toHaveBeenCalledOnce();
      const field = editor()!;
      field.value = "After";
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );
      await fixture.whenStable();
      expect(commit).toHaveBeenCalledExactlyOnceWith(
        fixture.componentInstance.rows()[0],
        "name",
        "After"
      );
      expect(editor()).toBeNull();
      expect(start).toHaveBeenCalledOnce();
    }
  );

  it("reads the latest row and column permission at activation time", async () => {
    const start = vi.fn();
    const { fixture, editor, activate } = await mount([
      editing<Row>(vi.fn(), { onEditStart: start }),
      cellNavigation(),
    ]);
    fixture.componentInstance.rows.set([
      { id: "1", name: "Incoming", writable: false },
    ]);
    await fixture.whenStable();
    activate("F2");
    await fixture.whenStable();
    expect(editor()).toBeNull();
    expect(start).not.toHaveBeenCalled();
    fixture.componentInstance.columns.set([{ key: "name", editable: true }]);
    await fixture.whenStable();
    activate("F2");
    await fixture.whenStable();
    expect(editor()?.value).toBe("Incoming");
    expect(start).toHaveBeenCalledOnce();
  });

  it("leaves read-only tables inert without an editing channel", async () => {
    const { fixture, editor, activate } = await mount([cellNavigation()]);
    activate("Enter");
    await fixture.whenStable();
    expect(editor()).toBeNull();
  });
});

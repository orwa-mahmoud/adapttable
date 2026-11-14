/**
 * Row editing through the unstyled table — one patch per save, on desktop
 * rows and phone cards.
 */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { rowEditing } from "@adapttable/spartan/editing";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { rowEditingTests } from "../../angular/test/kit/suites/rowEditing";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of rowEditingTests(kit)) it(test.name, test.run);

interface Task {
  id: string;
  title: string;
  points: number;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", points: 3 },
  { id: "2", title: "Test", points: 5 },
];

const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title, editable: true },
  {
    key: "points",
    header: "Points",
    accessor: (r) => r.points,
    editable: true,
    editor: "number",
  },
];

function all(name: string): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
    ),
  ];
}

function one(name: string): HTMLElement {
  const found = all(name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
}

function editors(): HTMLInputElement[] {
  return all("edit-cell-editor") as HTMLInputElement[];
}

function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event("input"));
}

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [features]="features()"
    />
  `,
})
class Host {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly mobile = input<boolean | undefined>(undefined);
  readonly data = ROWS;
  readonly columns = COLS;
  readonly rowKey = (row: Task) => row.id;
}

async function mount(features: readonly AdaptTableFeature[], mobile?: boolean) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  fixture.componentRef.setInput("mobile", mobile);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return () => fixture.whenStable();
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("row editing (Spartan Angular)", () => {
  it("offers one labelled begin control per row and opens no field", async () => {
    await mount([rowEditing(vi.fn())]);
    const begins = all("row-edit-begin");
    expect(begins.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Edit row",
      "Edit row",
    ]);
    expect(begins[0]!.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(begins[0]!.title).toBe("Edit row");
    expect(editors()).toHaveLength(0);
  });

  it("hands the host the row and one parsed patch on save", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([rowEditing(onRowEdit)]);
    all("row-edit-begin")[0]!.click();
    await settle();
    type(editors()[0]!, "Ship it");
    type(editors()[1]!, "8");
    await settle();
    one("row-edit-save").click();
    await settle();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], {
      title: "Ship it",
      points: 8,
    });
    expect(editors()).toHaveLength(0);
  });

  it("saves on Enter and cancels on Escape from any field", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([rowEditing(onRowEdit)]);
    all("row-edit-begin")[1]!.click();
    await settle();
    type(editors()[1]!, "13");
    editors()[1]!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await settle();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[1], { points: 13 });

    all("row-edit-begin")[0]!.click();
    await settle();
    type(editors()[0]!, "Dropped");
    editors()[0]!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
      })
    );
    await settle();
    expect(onRowEdit).toHaveBeenCalledOnce();
    expect(editors()).toHaveLength(0);
  });

  it("renders host icons without changing save and cancel callbacks", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([
      rowEditing(onRowEdit, {
        rowEditIcons: { begin: "Change", save: "Keep", cancel: "Discard" },
      }),
    ]);
    const begin = all("row-edit-begin")[0]!;
    expect(begin.textContent.trim()).toBe("Change");
    expect(begin.querySelector("svg")).toBeNull();
    begin.click();
    await settle();
    expect(one("row-edit-save").textContent.trim()).toBe("Keep");
    expect(one("row-edit-cancel").textContent.trim()).toBe("Discard");
    type(editors()[0]!, "Updated");
    await settle();
    one("row-edit-save").click();
    await settle();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], {
      title: "Updated",
    });
    all("row-edit-begin")[1]!.click();
    await settle();
    type(editors()[0]!, "Discarded");
    await settle();
    one("row-edit-cancel").click();
    await settle();
    expect(onRowEdit).toHaveBeenCalledOnce();
    expect(editors()).toHaveLength(0);
  });

  it("uses the native glyph when a host icon is explicitly null", async () => {
    await mount([rowEditing(vi.fn(), { rowEditIcons: { begin: null } })]);
    const begin = all("row-edit-begin")[0]!;
    expect(begin.querySelector("svg")).not.toBeNull();
    expect(begin.getAttribute("aria-label")).toBe("Edit row");
  });
});

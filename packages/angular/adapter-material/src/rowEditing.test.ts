/**
 * Row editing through the unstyled table — one patch per save, on desktop
 * rows and phone cards.
 */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { rowEditing } from "@adapttable/angular-material/editing";
import { rowActions } from "@adapttable/angular-material/row-actions";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

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
  return [...document.querySelectorAll<HTMLElement>(kitSelector(name))];
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

describe("row editing (Angular Material)", () => {
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

  it("opens every editable field of the row and focuses the first", async () => {
    const settle = await mount([rowEditing(vi.fn())]);
    all("row-edit-begin")[0]!.click();
    await settle();
    expect(editors().map((field) => field.value)).toEqual(["Ship", "3"]);
    expect(document.activeElement).toBe(editors()[0]);
    expect(all("row-edit-begin")).toHaveLength(1);
    expect(one("row-edit-save").getAttribute("aria-label")).toBe("Save row");
    expect(one("row-edit-cancel").getAttribute("aria-label")).toBe("Cancel");
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
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await settle();
    expect(onRowEdit).toHaveBeenCalledOnce();
    expect(editors()).toHaveLength(0);
  });

  it("throws the drafts away on cancel", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([rowEditing(onRowEdit)]);
    all("row-edit-begin")[0]!.click();
    await settle();
    type(editors()[0]!, "Ship it");
    await settle();
    one("row-edit-cancel").click();
    await settle();
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(editors()).toHaveLength(0);

    all("row-edit-begin")[0]!.click();
    await settle();
    expect(editors()[0]!.value).toBe("Ship");
  });

  it("draws the label as text when the host turns the glyph off", async () => {
    await mount([rowEditing(vi.fn(), { rowEditIcons: { begin: false } })]);
    const begin = all("row-edit-begin")[0]!;
    expect(begin.querySelector("svg")).toBeNull();
    expect(begin.textContent.trim()).toBe("Edit row");
    expect(begin.hasAttribute("title")).toBe(false);
  });

  it("lets a host action that opens the row replace the begin control", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([
      rowEditing(onRowEdit),
      rowActions<Task>([{ key: "edit", label: "Change", editsRow: true }]),
    ]);
    expect(all("row-edit-begin")).toHaveLength(0);
    const change = [...document.querySelectorAll("button")].filter(
      (button) => button.textContent.trim() === "Change"
    );
    expect(change).toHaveLength(2);
    change[1]!.click();
    await settle();
    expect(editors().map((field) => field.value)).toEqual(["Test", "5"]);
    type(editors()[0]!, "Tested");
    await settle();
    one("row-edit-save").click();
    await settle();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[1], {
      title: "Tested",
    });
  });

  it("edits a row from its phone card", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([rowEditing(onRowEdit)], true);
    expect(all("card")).toHaveLength(2);
    const begin = all("card")[0]!.querySelector<HTMLElement>(
      '[data-adapttable-part="row-edit-begin"]'
    );
    expect(begin).not.toBeNull();
    begin!.click();
    await settle();
    type(editors()[0]!, "Ship it");
    await settle();
    one("row-edit-save").click();
    await settle();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], {
      title: "Ship it",
    });
  });

  it("draws no row controls without the feature", async () => {
    await mount([]);
    expect(all("row-edit-begin")).toHaveLength(0);
    expect(all("actions-header")).toHaveLength(0);
  });
});

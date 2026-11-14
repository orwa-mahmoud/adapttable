/**
 * Row editing through the unstyled table — one patch per save, on desktop
 * rows and phone cards.
 */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { editing, rowEditing } from "@adapttable/angular-unstyled/editing";
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
      `[data-adapttable-part="${name}"]`
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

describe("row editing (unstyled Angular)", () => {
  for (const mobile of [false, true]) {
    it.each(["retry", "cancel"])(
      `keeps a failed save visible and its draft recoverable (${mobile ? "phone" : "desktop"}, %s)`,
      async (recovery) => {
        const onRowEdit = vi
          .fn()
          .mockRejectedValueOnce(new Error("Row save refused"));
        const settle = await mount([rowEditing(onRowEdit)], mobile);
        all("row-edit-begin")[0]!.click();
        await settle();
        type(editors()[0]!, "Ship it");
        await settle();
        one("row-edit-save").click();
        await settle();
        expect(one("row-edit-error").textContent).toContain("Row save refused");
        expect(one("row-edit-error").getAttribute("role")).toBe("status");
        expect(editors()[0]!.value).toBe("Ship it");
        one(recovery === "retry" ? "row-edit-save" : "row-edit-cancel").click();
        await settle();
        expect(editors()).toHaveLength(0);
        expect(all("row-edit-error")).toHaveLength(0);
        expect(onRowEdit).toHaveBeenCalledTimes(recovery === "retry" ? 2 : 1);
        if (recovery === "retry") {
          expect(onRowEdit).toHaveBeenLastCalledWith(ROWS[0], {
            title: "Ship it",
          });
        } else {
          expect(document.body.textContent).toContain("Ship");
        }
      }
    );
  }

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

  it("refuses a row a row rule rejects and says why", async () => {
    const onRowEdit = vi.fn();
    const settle = await mount([
      rowEditing(onRowEdit),
      editing(vi.fn(), {
        validateRow: (row: Task) =>
          row.points < 0 ? { points: "Points cannot be negative" } : undefined,
      }),
    ]);
    all("row-edit-begin")[0]!.click();
    await settle();
    type(editors()[1]!, "-1");
    await settle();
    one("row-edit-save").click();
    await vi.waitFor(async () => {
      await settle();
      expect(document.body.textContent).toContain("Points cannot be negative");
    });
    expect(onRowEdit).not.toHaveBeenCalled();
    expect(editors()).toHaveLength(2);
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
});

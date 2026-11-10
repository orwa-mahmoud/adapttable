/**
 * Batch editing through the unstyled table — every edit waits for one save,
 * on desktop rows and phone cards.
 */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { batchEditing } from "@adapttable/angular-unstyled/batch-editing";
import {
  editHistory,
  editing,
  undoRedoButtons,
} from "@adapttable/angular-unstyled/editing";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  { key: "id", header: "Id", accessor: (r) => r.id },
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

/** The editor value inside each changed batch cell. */
function changedValues(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="batch-edit-cell"][data-changed]'
    ),
  ].map(
    (cell) =>
      cell.querySelector<HTMLInputElement>(
        '[data-adapttable-part="edit-cell-editor"]'
      )!.value
  );
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

async function mount(
  onBatchEdit = vi.fn(),
  mobile?: boolean,
  extras: readonly AdaptTableFeature[] = []
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", [
    batchEditing(onBatchEdit),
    ...extras,
  ]);
  fixture.componentRef.setInput("mobile", mobile);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return () => fixture.whenStable();
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("batch editing (unstyled Angular)", () => {
  for (const mobile of [false, true]) {
    it.each(["retry", "cancel"])(
      `keeps rejected batch drafts and offers recovery (${mobile ? "phone" : "desktop"}, %s)`,
      async (recovery) => {
        let rejectSave: (error: Error) => void = (error) => {
          throw error;
        };
        const pending = new Promise<void>((_, reject) => {
          rejectSave = reject;
        });
        const onBatchEdit = vi.fn().mockReturnValueOnce(pending);
        const settle = await mount(onBatchEdit, mobile);
        type(editors()[0]!, "Ship it");
        type(editors()[2]!, "Test it");
        await settle();
        one("batch-edit-save").click();
        one("batch-edit-save").click();
        await settle();
        expect(onBatchEdit).toHaveBeenCalledOnce();
        expect(one("batch-edit-bar").getAttribute("aria-busy")).toBe("true");
        rejectSave(new Error("Batch save refused"));
        await vi.waitFor(async () => {
          await settle();
          expect(one("batch-edit-error").textContent).toContain(
            "Batch save refused"
          );
        });
        expect(one("batch-edit-error").getAttribute("role")).toBe("status");
        expect(changedValues()).toEqual(["Ship it", "Test it"]);
        expect(one("batch-edit-count").textContent).toContain("2");
        one(
          recovery === "retry" ? "batch-edit-save" : "batch-edit-cancel"
        ).click();
        await settle();
        expect(all("batch-edit-bar")).toHaveLength(0);
        expect(onBatchEdit).toHaveBeenCalledTimes(recovery === "retry" ? 2 : 1);
        expect(editors()[0]!.value).toBe("Ship");
        expect(editors()[2]!.value).toBe("Test");
      }
    );
  }

  it("opens every editable cell as a field, with nothing pending", async () => {
    await mount();
    expect(editors().map((field) => field.value)).toEqual([
      "Ship",
      "3",
      "Test",
      "5",
    ]);
    expect(all("batch-edit-cell")).toHaveLength(4);
    expect(all("batch-edit-bar")).toHaveLength(0);
  });

  it("counts unsaved rows and marks exactly the changed cells", async () => {
    const settle = await mount();
    type(editors()[0]!, "Ship it");
    type(editors()[1]!, "8");
    await settle();
    expect(one("batch-edit-count").textContent.trim()).toBe("1 unsaved row");
    expect(changedValues()).toEqual(["Ship it", "8"]);

    type(editors()[2]!, "Tested");
    await settle();
    expect(one("batch-edit-count").textContent.trim()).toBe("2 unsaved rows");
    expect(changedValues()).toEqual(["Ship it", "8", "Tested"]);
    expect(one("batch-edit-save").textContent.trim()).toBe("Save all");
    expect(one("batch-edit-cancel").textContent.trim()).toBe("Cancel all");
  });

  it("hands the host every pending row, parsed, in one call", async () => {
    const onBatchEdit = vi.fn();
    const settle = await mount(onBatchEdit);
    type(editors()[0]!, "Ship it");
    type(editors()[3]!, "13");
    await settle();
    expect(onBatchEdit).not.toHaveBeenCalled();

    one("batch-edit-save").click();
    await settle();
    expect(onBatchEdit).toHaveBeenCalledExactlyOnceWith([
      { row: ROWS[0], rowId: "1", patch: { title: "Ship it" } },
      { row: ROWS[1], rowId: "2", patch: { points: 13 } },
    ]);
    expect(all("batch-edit-bar")).toHaveLength(0);
  });

  it("refuses a batch a row rule rejects and says why", async () => {
    const onBatchEdit = vi.fn();
    const settle = await mount(onBatchEdit, false, [
      editing(vi.fn(), {
        validateRow: (row: Task) =>
          row.points < 0 ? "Points cannot be negative" : undefined,
      }),
    ]);
    type(editors()[1]!, "-1");
    await settle();
    one("batch-edit-save").click();
    await vi.waitFor(async () => {
      await settle();
      expect(one("batch-edit-error").textContent).toContain(
        "Points cannot be negative"
      );
    });
    expect(onBatchEdit).not.toHaveBeenCalled();
  });

  it("puts every field back on cancel and tells the host nothing", async () => {
    const onBatchEdit = vi.fn();
    const settle = await mount(onBatchEdit);
    type(editors()[0]!, "Ship it");
    await settle();
    one("batch-edit-cancel").click();
    await settle();
    expect(onBatchEdit).not.toHaveBeenCalled();
    expect(all("batch-edit-bar")).toHaveLength(0);
    expect(editors()[0]!.value).toBe("Ship");
    expect(changedValues()).toEqual([]);
  });

  it("edits fields on phone cards and saves them in one batch", async () => {
    const onBatchEdit = vi.fn();
    const settle = await mount(onBatchEdit, true);
    expect(all("card")).toHaveLength(2);
    const cardFields = all("card")[1]!.querySelectorAll<HTMLInputElement>(
      '[data-adapttable-part="edit-cell-editor"]'
    );
    expect([...cardFields].map((field) => field.value)).toEqual(["Test", "5"]);
    type(cardFields[0]!, "Tested");
    await settle();
    expect(one("batch-edit-count").textContent.trim()).toBe("1 unsaved row");
    one("batch-edit-save").click();
    await settle();
    expect(onBatchEdit).toHaveBeenCalledExactlyOnceWith([
      { row: ROWS[1], rowId: "2", patch: { title: "Tested" } },
    ]);
  });
});

it("undoes a multi-row batch as one gesture through the original cell callback", async () => {
  const onBatchEdit = vi.fn();
  const onCellEdit = vi.fn();
  const settle = await mount(onBatchEdit, false, [
    editing<Task>(onCellEdit),
    editHistory(),
    undoRedoButtons(),
  ]);
  type(editors()[0]!, "Shipped");
  type(editors()[3]!, "13");
  await settle();
  one("batch-edit-save").click();
  await settle();
  expect(onBatchEdit).toHaveBeenCalledExactlyOnceWith([
    { row: ROWS[0], rowId: "1", patch: { title: "Shipped" } },
    { row: ROWS[1], rowId: "2", patch: { points: 13 } },
  ]);
  one("undo-button").click();
  await settle();
  expect(onCellEdit.mock.calls).toEqual([
    [ROWS[0], "title", "Ship"],
    [ROWS[1], "points", 5],
  ]);
  expect((one("undo-button") as HTMLButtonElement).disabled).toBe(true);
  one("redo-button").click();
  await settle();
  expect(onCellEdit.mock.calls.slice(2)).toEqual([
    [ROWS[0], "title", "Shipped"],
    [ROWS[1], "points", 13],
  ]);
});

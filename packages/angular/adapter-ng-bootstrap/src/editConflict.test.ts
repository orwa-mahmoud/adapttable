/**
 * Live updates through mounted native editors: conflict choices, guarded
 * commits and session cleanup on desktop rows and mobile cards.
 */
import {
  type AdaptTableFeature,
  type ColumnDef,
  type EditConflictHandler,
  type EditConflictPolicy,
  injectQuerySource,
} from "@adapttable/angular";
import { batchEditing } from "@adapttable/ng-bootstrap/batch-editing";
import { editing, rowEditing } from "@adapttable/ng-bootstrap/editing";
import { grouping } from "@adapttable/ng-bootstrap/grouping";
import { Component, computed, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ngBootstrapPart } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Task {
  id: string;
  title: string;
  note: string;
  version: number;
}

const ROW: Task = { id: "1", title: "Ship", note: "n1", version: 1 };
const INCOMING: Task = { ...ROW, title: "Arrived", note: "n2", version: 2 };
const COLUMNS: ColumnDef<Task>[] = [
  {
    key: "title",
    header: "Title",
    accessor: (row) => row.title,
    editable: true,
  },
  { key: "note", header: "Note", accessor: (row) => row.note, editable: true },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [source]="useSource() ? source : undefined"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features()"
      [forceMobile]="mobile()"
      [rowVersion]="rowVersion()"
      [editConflictPolicy]="policy()"
      [onEditConflict]="onConflict()"
      [urlSync]="false"
    />
  `,
})
class Host {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly mobile = input(false);
  readonly useSource = input(false);
  readonly rows = signal<readonly Task[]>([ROW]);
  readonly sourceRows = signal<readonly Task[]>([ROW]);
  readonly columns = COLUMNS;
  readonly rowKey = (row: Task) => row.id;
  readonly rowVersion = signal<((row: Task) => number) | undefined>(undefined);
  readonly policy = signal<EditConflictPolicy | undefined>(undefined);
  readonly onConflict = signal<EditConflictHandler<Task> | undefined>(
    undefined
  );
  readonly source = injectQuerySource<Task>({
    urlSync: false,
    paginationMode: "paged",
    query: () => ({
      data: computed(() => ({
        pages: [
          {
            rows: [...this.sourceRows()],
            total: this.sourceRows().length,
            page: 1,
            limit: 20,
          },
        ],
        pageParams: [1],
      })),
      isLoading: signal(false),
      isFetching: signal(false),
      isFetchingNextPage: signal(false),
      hasNextPage: signal(false),
      error: signal(null),
      fetchNextPage: () => undefined,
      refetch: () => undefined,
    }),
  });
}

function all(name: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(ngBootstrapPart(name))];
}

function one(name: string): HTMLElement {
  const elements = all(name);
  expect(elements, name).toHaveLength(1);
  return elements[0]!;
}

function field(index = 0): HTMLInputElement {
  const element = all("edit-cell-editor")[index];
  expect(element, `editor ${String(index)}`).not.toBeUndefined();
  return element as HTMLInputElement;
}

function type(value: string, index = 0): void {
  const element = field(index);
  element.value = value;
  element.dispatchEvent(new Event("input"));
}

function key(value: string, index = 0): void {
  field(index).dispatchEvent(
    new KeyboardEvent("keydown", { key: value, bubbles: true })
  );
}

async function mount(
  mobile: boolean,
  features: readonly AdaptTableFeature[],
  useSource = false
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  fixture.componentRef.setInput("mobile", mobile);
  fixture.componentRef.setInput("useSource", useSource);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  const settle = async () => {
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
  };
  await settle();
  return {
    host: fixture.componentInstance,
    settle,
    open: async () => {
      const activate = all("edit-cell-activate")[0];
      expect(activate).not.toBeUndefined();
      activate!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      await settle();
      type("mine");
      await settle();
    },
  };
}

function expectQuestion(): void {
  expect(one("edit-cell-conflict").getAttribute("role")).toBe("alert");
  expect(one("edit-cell-conflict-message").textContent?.trim()).toBe(
    "This row changed while you were editing"
  );
  expect(one("edit-cell-incoming").textContent?.trim()).toBe("Theirs: Arrived");
  expect(field().getAttribute("data-conflict")).toBe("");
}

afterEach(() => {
  document.body.replaceChildren();
});

describe.each([false, true])("live edit conflicts with mobile=%s", (mobile) => {
  it("blocks a contested cell, then commits the kept draft against the incoming row", async () => {
    const onCellEdit = vi.fn();
    const { host, open, settle } = await mount(mobile, [editing(onCellEdit)]);
    await open();
    host.rows.set([INCOMING]);
    await settle();
    expectQuestion();
    key("Enter");
    await settle();
    expect(onCellEdit).not.toHaveBeenCalled();
    one("edit-cell-keep-mine").click();
    await settle();
    expect(all("edit-cell-conflict")).toHaveLength(0);
    expect(field().value).toBe("mine");
    expect(field().hasAttribute("data-conflict")).toBe(false);
    expect(onCellEdit).not.toHaveBeenCalled();
    key("Enter");
    await settle();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      INCOMING,
      "title",
      "mine"
    );
  });

  it("takes a query source update into the draft without writing to the host", async () => {
    const onCellEdit = vi.fn();
    const { host, open, settle } = await mount(
      mobile,
      [editing(onCellEdit)],
      true
    );
    await open();
    host.sourceRows.set([INCOMING]);
    await settle();
    expectQuestion();
    one("edit-cell-take-theirs").click();
    await settle();
    expect(field().value).toBe("Arrived");
    expect(field().hasAttribute("data-conflict")).toBe(false);
    expect(all("edit-cell-conflict")).toHaveLength(0);
    expect(host.rows()).toEqual([ROW]);
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("cancels a question with Escape, emits the original session and reopens on the live value", async () => {
    const onCellEdit = vi.fn();
    const onEditCancel = vi.fn();
    const { host, open, settle } = await mount(mobile, [
      editing(onCellEdit, { onEditCancel }),
    ]);
    await open();
    host.rows.set([INCOMING]);
    await settle();
    expectQuestion();
    key("Escape");
    await settle();
    expect(all("edit-cell-editor")).toHaveLength(0);
    expect(all("edit-cell-conflict")).toHaveLength(0);
    expect(onEditCancel).toHaveBeenCalledExactlyOnceWith({
      row: ROW,
      rowId: "1",
      columnKey: "title",
      value: "mine",
      previousValue: "Ship",
      unit: "cell",
    });
    expect(onCellEdit).not.toHaveBeenCalled();
    const activate = all("edit-cell-activate")[0]!;
    expect(document.activeElement).toBe(activate);
    activate.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await settle();
    expect(field().value).toBe("Arrived");
    expect(field().hasAttribute("data-conflict")).toBe(false);
  });

  it("discards a missing row without user-cancel or save and does not revive its draft", async () => {
    const onCellEdit = vi.fn();
    const onEditCancel = vi.fn();
    const { host, open, settle } = await mount(mobile, [
      editing(onCellEdit, { onEditCancel }),
    ]);
    await open();
    host.rows.set([INCOMING]);
    await settle();
    expectQuestion();
    host.rows.set([]);
    await settle();
    expect(all("edit-cell-editor")).toHaveLength(0);
    expect(all("edit-cell-conflict")).toHaveLength(0);
    host.rows.set([INCOMING]);
    await settle();
    expect(all("edit-cell-editor")).toHaveLength(0);
    expect(
      all("edit-cell-activate").map((element) => element.textContent?.trim())
    ).toEqual(["Arrived", "n2"]);
    expect(onEditCancel).not.toHaveBeenCalled();
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("guards the whole row until its changed field is answered", async () => {
    const onRowEdit = vi.fn();
    const { host, settle } = await mount(mobile, [rowEditing(onRowEdit)]);
    one("row-edit-begin").click();
    await settle();
    type("mine");
    await settle();
    host.rows.set([INCOMING]);
    await settle();
    expectQuestion();
    expect(field(1).value).toBe("n2");
    expect(all("row-edit-save")).toHaveLength(0);
    key("Enter", 1);
    await settle();
    expect(onRowEdit).not.toHaveBeenCalled();
    one("edit-cell-keep-mine").click();
    await settle();
    one("row-edit-save").click();
    await settle();
    expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(INCOMING, {
      title: "mine",
    });
  });

  it("guards the batch save until its conflict is answered", async () => {
    const onBatchEdit = vi.fn();
    const { host, settle } = await mount(mobile, [batchEditing(onBatchEdit)]);
    type("mine");
    await settle();
    host.rows.set([INCOMING]);
    await settle();
    expectQuestion();
    expect(field(1).value).toBe("n2");
    expect(all("batch-edit-save")).toHaveLength(0);
    expect(one("batch-edit-conflict").textContent?.trim()).toBe(
      "This row changed while you were editing"
    );
    key("Enter", 1);
    await settle();
    expect(onBatchEdit).not.toHaveBeenCalled();
    one("edit-cell-keep-mine").click();
    await settle();
    expect(all("batch-edit-conflict")).toHaveLength(0);
    one("batch-edit-save").click();
    await settle();
    expect(onBatchEdit).toHaveBeenCalledExactlyOnceWith([
      { row: INCOMING, rowId: "1", patch: { title: "mine" } },
    ]);
  });
});

it("reacts to host version, policy and observer inputs after mounting", async () => {
  const onCellEdit = vi.fn();
  const { host, open, settle } = await mount(false, [editing(onCellEdit)]);
  host.rowVersion.set((row) => row.version);
  host.policy.set("take");
  const onConflict = vi.fn<EditConflictHandler<Task>>(() => "keep");
  host.onConflict.set(onConflict);
  await settle();
  await open();
  const versioned = { ...ROW, version: 2 };
  host.rows.set([versioned]);
  await settle();
  expect(onConflict).toHaveBeenCalledExactlyOnceWith({
    row: versioned,
    previous: ROW,
    rowId: "1",
    columnKey: "title",
    draft: "mine",
    incomingValue: "Ship",
    previousValue: "Ship",
    unit: "cell",
    changes: [{ columnKey: "title", previous: "Ship", incoming: "Ship" }],
  });
  expect(field().value).toBe("mine");
  expect(all("edit-cell-conflict")).toHaveLength(0);
  host.onConflict.set(undefined);
  host.rows.set([{ ...INCOMING, version: 3 }]);
  await settle();
  expect(field().value).toBe("Arrived");
  expect(all("edit-cell-conflict")).toHaveLength(0);
  expect(onConflict).toHaveBeenCalledTimes(1);
  expect(onCellEdit).not.toHaveBeenCalled();
});

it("reconciles grouped data leaves using a feature-supplied conflict policy", async () => {
  const onCellEdit = vi.fn();
  const { host, open, settle } = await mount(false, [
    editing(onCellEdit, { editConflictPolicy: "take" }),
    grouping("note"),
  ]);
  await open();
  const incoming = { ...ROW, title: "Grouped update", version: 2 };
  host.rows.set([incoming]);
  await settle();
  expect(field().value).toBe("Grouped update");
  expect(field().hasAttribute("data-conflict")).toBe(false);
  expect(all("edit-cell-conflict")).toHaveLength(0);
  expect(onCellEdit).not.toHaveBeenCalled();
});

/** Live source updates keep, replace or contest drafts through core's sessions. */
import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  injectEditConflict,
  injectLiveEditConflict,
  type LiveEditConflictInput,
} from "./editConflict";
import {
  injectBatchEditing,
  injectCellEditing,
  injectRowEditing,
} from "./editing";

interface Row {
  id: string;
  title: string;
  owner: string;
  version: number;
}

const ORIGINAL: Row = { id: "1", title: "Ship", owner: "Ada", version: 1 };
const COLUMNS = [
  { key: "title", editable: true },
  { key: "owner", editable: true },
];

function sessions(mode: "cell" | "row" | "batch" = "cell") {
  const injector = TestBed.inject(Injector);
  const cancel = vi.fn();
  const saved = vi.fn();
  const input = signal<LiveEditConflictInput<Row>>({
    rows: [ORIGINAL],
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
  const cell = injectCellEditing<Row>({ injector, onEditCancel: cancel });
  const row = injectRowEditing<Row>({
    injector,
    enabled: mode === "row",
    columns: COLUMNS,
    onRowEdit: saved,
    onEditCancel: cancel,
  });
  const batch = injectBatchEditing<Row>({
    injector,
    enabled: mode === "batch",
    columns: COLUMNS,
    onBatchEdit: saved,
    onEditCancel: cancel,
  });
  const conflict = injectLiveEditConflict({
    injector,
    input,
    cell,
    row: mode === "row" ? row : undefined,
    batch: mode === "batch" ? batch : undefined,
  });
  TestBed.tick();
  return { input, cell, row, batch, conflict, cancel, saved };
}

describe("injectEditConflict", () => {
  it("publishes core's question and applies the requested answer", () => {
    const conflict = injectEditConflict<Row>({
      injector: TestBed.inject(Injector),
    });
    const keep = vi.fn();
    const take = vi.fn();
    const incoming = { ...ORIGINAL, title: "Arrived" };
    conflict().reconcile({
      active: { rowId: "1", columnKey: "title" },
      openedRow: ORIGINAL,
      draft: "Mine",
      rows: [incoming],
      columns: COLUMNS,
      rowKey: (row) => row.id,
      policy: "ask",
      keep,
      take,
    });
    expect(conflict().current).toMatchObject({
      row: incoming,
      previous: ORIGINAL,
      incomingValue: "Arrived",
      draft: "Mine",
    });
    expect(conflict().isConflict("1", "title")).toBe(true);
    conflict().take();
    expect(take).toHaveBeenCalledExactlyOnceWith(incoming, "Arrived");
    expect(keep).not.toHaveBeenCalled();
    expect(conflict().current).toBeNull();
  });
});

describe("injectLiveEditConflict", () => {
  it("keeps the typed draft when asked, then takes a later incoming value", () => {
    const { input, cell, conflict } = sessions();
    cell().begin("1", "title", "Ship", ORIGINAL);
    cell().setDraft("Mine");
    const first = { ...ORIGINAL, title: "First" };
    input.update((current) => ({ ...current, rows: [first] }));
    TestBed.tick();
    expect(conflict().current?.incomingValue).toBe("First");
    expect(cell().draft).toBe("Mine");
    conflict().keep();
    TestBed.tick();
    expect(cell().draft).toBe("Mine");
    expect(cell().openedRow()).toBe(first);
    expect(conflict().current).toBeNull();

    const second = { ...ORIGINAL, title: "Second" };
    input.update((current) => ({ ...current, rows: [second] }));
    TestBed.tick();
    expect(conflict().current?.incomingValue).toBe("Second");
    conflict().take();
    TestBed.tick();
    expect(cell().draft).toBe("Second");
    expect(cell().openedRow()).toBe(second);
    expect(conflict().current).toBeNull();
  });

  it("reads current host policy and callback without writing host data", () => {
    const { input, cell, conflict, saved } = sessions();
    const decide = vi.fn(() => "take" as const);
    cell().begin("1", "title", "Ship", ORIGINAL);
    cell().setDraft("Mine");
    const incoming = { ...ORIGINAL, title: "Live" };
    input.update((current) => ({
      ...current,
      rows: [incoming],
      editConflictPolicy: "keep",
      onEditConflict: decide,
    }));
    TestBed.tick();
    expect(decide).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        previous: ORIGINAL,
        row: incoming,
        draft: "Mine",
      })
    );
    expect(cell().draft).toBe("Live");
    expect(conflict().current).toBeNull();
    expect(saved).not.toHaveBeenCalled();
  });

  it.each(["keep", "take"] as const)(
    "uses the reactive %s policy when the host does not override it",
    (policy) => {
      const { input, cell, conflict } = sessions();
      cell().begin("1", "title", "Ship", ORIGINAL);
      cell().setDraft("Mine");
      const incoming = { ...ORIGINAL, title: "Live" };
      input.update((current) => ({
        ...current,
        rows: [incoming],
        editConflictPolicy: policy,
      }));
      TestBed.tick();
      expect(cell().draft).toBe(policy === "keep" ? "Mine" : "Live");
      expect(cell().openedRow()).toBe(incoming);
      expect(conflict().current).toBeNull();
    }
  );

  it("uses the host row version to contest changes outside the edited column", () => {
    const { input, cell, conflict } = sessions();
    cell().begin("1", "title", "Ship", ORIGINAL);
    cell().setDraft("Mine");
    const incoming = { ...ORIGINAL, owner: "Grace", version: 2 };
    input.update((current) => ({ ...current, rows: [incoming] }));
    TestBed.tick();
    expect(conflict().current).toBeNull();
    input.update((current) => ({
      ...current,
      rowVersion: (row) => row.version,
    }));
    TestBed.tick();
    expect(conflict().current).toMatchObject({
      previous: ORIGINAL,
      row: incoming,
      incomingValue: "Ship",
      draft: "Mine",
    });
  });

  it("clears a canceled cell question and reports only explicit cancellation", () => {
    const { input, cell, conflict, cancel } = sessions();
    cell().begin("1", "title", "Ship", ORIGINAL);
    cell().setDraft("Mine");
    input.update((current) => ({
      ...current,
      rows: [{ ...ORIGINAL, title: "Live" }],
    }));
    TestBed.tick();
    expect(conflict().current?.incomingValue).toBe("Live");
    cell().cancel();
    TestBed.tick();
    expect(conflict().current).toBeNull();
    expect(cancel).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ rowId: "1", columnKey: "title" })
    );
    cell().begin("1", "title", "Ship", ORIGINAL);
    input.update((current) => ({ ...current, rows: [] }));
    TestBed.tick();
    expect(cell().active).toBeNull();
    expect(conflict().current).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("takes untouched row fields and asks only about a typed field", () => {
    const { input, row, conflict, saved } = sessions("row");
    row().begin(ORIGINAL, "1");
    row().setDraft("title", "Mine");
    const incoming = { ...ORIGINAL, title: "Live", owner: "Grace" };
    input.update((current) => ({ ...current, rows: [incoming] }));
    TestBed.tick();
    expect(row().drafts).toEqual({ title: "Mine", owner: "Grace" });
    expect(conflict().contestedCell("1", "title")).toEqual({
      incomingValue: "Live",
    });
    expect(conflict().contestedCell("1", "owner")).toBeUndefined();
    conflict().keepCell("1", "title");
    TestBed.tick();
    expect(conflict().anyContested).toBe(false);
    row().save();
    expect(saved).toHaveBeenCalledExactlyOnceWith(incoming, { title: "Mine" });
  });

  it("clears a canceled row question and preserves the core cancel lifecycle", () => {
    const { input, row, conflict, cancel } = sessions("row");
    row().begin(ORIGINAL, "1");
    row().setDraft("title", "Mine");
    input.update((current) => ({
      ...current,
      rows: [{ ...ORIGINAL, title: "Live" }],
    }));
    TestBed.tick();
    expect(conflict().isRowContested("1")).toBe(true);
    row().cancel();
    TestBed.tick();
    expect(conflict().anyContested).toBe(false);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ rowId: "1", unit: "row" })
    );
  });

  it("tracks independent batch rows and accepts the newest incoming field", () => {
    const { input, batch, conflict, cancel } = sessions("batch");
    const other = { ...ORIGINAL, id: "2" };
    batch().setDraft(ORIGINAL, "1", "title", "Mine one");
    batch().setDraft(other, "2", "title", "Mine two");
    input.update((current) => ({
      ...current,
      rows: [
        { ...ORIGINAL, title: "First" },
        { ...other, title: "Other" },
      ],
    }));
    TestBed.tick();
    expect(conflict().isRowContested("1")).toBe(true);
    expect(conflict().isRowContested("2")).toBe(true);
    const latest = { ...ORIGINAL, title: "Latest" };
    input.update((current) => ({
      ...current,
      rows: [latest, { ...other, title: "Other" }],
    }));
    TestBed.tick();
    expect(conflict().contestedCell("1", "title")).toEqual({
      incomingValue: "Latest",
    });
    conflict().takeCell("1", "title");
    TestBed.tick();
    expect(batch().isChanged("1", "title")).toBe(false);
    expect(batch().draftFor(latest, "1", "title")).toBe("Latest");
    expect(conflict().isRowContested("2")).toBe(true);
    batch().cancelAll();
    TestBed.tick();
    expect(batch().pending).toBe(false);
    expect(conflict().anyContested).toBe(false);
    expect(cancel).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "2", unit: "batch" })
    );
  });

  it("removes missing-row conflict questions without discarding pending batch drafts", () => {
    const { input, batch, conflict, cancel } = sessions("batch");
    batch().setDraft(ORIGINAL, "1", "title", "Mine");
    input.update((current) => ({
      ...current,
      rows: [{ ...ORIGINAL, title: "Live" }],
    }));
    TestBed.tick();
    expect(conflict().isRowContested("1")).toBe(true);
    input.update((current) => ({ ...current, rows: [] }));
    TestBed.tick();
    expect(conflict().anyContested).toBe(false);
    expect(batch().draftFor(ORIGINAL, "1", "title")).toBe("Mine");
    expect(cancel).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  asBatchGesture,
  asGesture,
  cellSaveFailure,
  cellSaveSignature,
  cellSaveStatus,
  cellsOfBatch,
  createCellEditSession,
  createCellSaveStore,
  createEditHistoryStack,
  createEditValidationStore,
  defaultSaveErrorMessage,
  editHistoryEntry,
  isCellEditActive,
  observeEdit,
  readCellValue,
  rowHasValidationError,
  validationErrorFor,
  validationSignature,
} from "./editingController";

interface Row {
  id: string;
  name: string;
  start?: number;
  end?: number;
}

const ada: Row = { id: "1", name: "Ada" };
const grace: Row = { id: "2", name: "Grace" };

afterEach(() => {
  resetDevWarnings();
  vi.restoreAllMocks();
});

const keyEvent = (key: string, shiftKey = false) => ({
  key,
  shiftKey,
  preventDefault: vi.fn(),
});

describe("observeEdit", () => {
  it("calls the observer and swallows a throw with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const event = {
      row: ada,
      rowId: "1",
      columnKey: "name",
      value: "A",
      previousValue: "Ada",
      unit: "cell" as const,
    };
    observeEdit(undefined, event);
    const handler = vi.fn();
    observeEdit(handler, event);
    expect(handler).toHaveBeenCalledWith(event);
    observeEdit(() => {
      throw new Error("boom");
    }, event);
    // A host may throw anything, not only an Error.
    const notAnError: unknown = "plain";
    observeEdit(() => {
      throw notAnError;
    }, event);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("(boom)"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("(plain)"));
  });
});

describe("createCellEditSession", () => {
  it("opens a cell, edits its draft and commits it", () => {
    const onEditStart = vi.fn();
    const session = createCellEditSession<Row>({ onEditStart });
    const listener = vi.fn();
    session.subscribe(listener);
    session.begin("1", "name", "Ada", ada);
    expect(session.getSnapshot()).toEqual({
      active: { rowId: "1", columnKey: "name" },
      draft: "Ada",
    });
    expect(isCellEditActive(session.getSnapshot(), "1", "name")).toBe(true);
    expect(isCellEditActive(session.getSnapshot(), "1", "age")).toBe(false);
    expect(onEditStart).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "1", value: "Ada", unit: "cell" })
    );
    session.begin("1", "name", "ignored", ada);
    session.setDraft("Ada L.");
    session.setDraft("Ada L.");
    expect(session.openedRow()).toBe(ada);
    expect(session.commit()).toEqual({
      rowId: "1",
      columnKey: "name",
      draft: "Ada L.",
    });
    expect(session.getSnapshot().active).toBeNull();
    expect(session.commit()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("cancels the open cell when another opens, and on cancel", () => {
    const onEditCancel = vi.fn();
    const session = createCellEditSession<Row>();
    session.configure({ onEditCancel });
    session.begin("1", "name", "Ada", ada);
    session.begin("2", "name", "Grace", grace);
    expect(onEditCancel).toHaveBeenCalledWith(
      expect.objectContaining({ rowId: "1", previousValue: "Ada" })
    );
    session.cancel();
    expect(onEditCancel).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().active).toBeNull();

    session.begin("3", "name", "x");
    session.cancel();
    expect(onEditCancel).toHaveBeenCalledTimes(2);
  });

  it("closes silently, and discards an editor whose row left", () => {
    const session = createCellEditSession<Row>();
    session.discardIfRowMissing([ada], (row) => (row as Row).id);
    session.begin("1", "name", "Ada", ada);
    session.close();
    expect(session.getSnapshot().active).toBeNull();
    session.begin("1", "name", "Ada", ada);
    session.discardIfRowMissing([ada], (row) => (row as Row).id);
    expect(session.getSnapshot().active).not.toBeNull();
    session.discardIfRowMissing([grace], (row) => (row as Row).id);
    expect(session.getSnapshot().active).toBeNull();
  });

  it("keeps or takes a live update under the open editor", () => {
    const session = createCellEditSession<Row>();
    session.keepLive(grace);
    session.takeLive(grace, "Grace");
    session.begin("1", "name", "Ada", ada);
    session.setDraft("typed");
    session.keepLive({ ...ada, name: "Ada v2" });
    expect(session.openedRow()).toEqual({ ...ada, name: "Ada v2" });
    expect(session.getSnapshot().draft).toBe("typed");
    session.takeLive({ ...ada, name: "Ada v3" }, "Ada v3");
    expect(session.getSnapshot().draft).toBe("Ada v3");
  });

  it("handles Escape, Enter and Tab inside the editor", () => {
    const session = createCellEditSession<Row>();
    expect(session.handleKeyDown(keyEvent("Enter"))).toBeNull();
    session.begin("1", "name", "Ada", ada);
    expect(session.handleKeyDown(keyEvent("a"))).toBeNull();
    const escape = keyEvent("Escape");
    expect(session.handleKeyDown(escape)).toEqual({
      action: "cancel",
      commit: null,
      advanceTarget: null,
    });
    expect(escape.preventDefault).toHaveBeenCalled();
    session.begin("1", "name", "Ada", ada);
    expect(session.handleKeyDown(keyEvent("Enter"))?.commit?.draft).toBe("Ada");
    const columns = [
      { key: "name", editable: true },
      { key: "role", editable: true },
    ];
    const navigation = {
      rows: [ada],
      columns,
      rowKey: (row: unknown) => (row as Row).id,
    };
    session.begin("1", "name", "Ada", ada);
    expect(session.handleKeyDown(keyEvent("Tab"), navigation)).toEqual({
      action: "commit-advance",
      commit: { rowId: "1", columnKey: "name", draft: "Ada" },
      advanceTarget: { rowId: "1", columnKey: "role" },
    });
    session.begin("1", "role", "", ada);
    expect(
      session.handleKeyDown(keyEvent("Tab", true), navigation)?.advanceTarget
    ).toEqual({ rowId: "1", columnKey: "name" });
    session.begin("1", "role", "", ada);
    expect(session.handleKeyDown(keyEvent("Tab"))).toBeNull();
  });
});

describe("createCellSaveStore", () => {
  it("settles a plain result at once and follows a promise to completion", async () => {
    const store = createCellSaveStore<Row>();
    const base = {
      rowId: "1",
      columnKey: "name",
      previous: ada,
      attempted: "A",
    };
    await expect(store.track({ ...base, result: undefined })).resolves.toBe(
      true
    );
    let resolve!: () => void;
    const pending = store.track({
      ...base,
      result: new Promise<void>((done) => {
        resolve = done;
      }),
    });
    expect(cellSaveStatus(store.getSnapshot(), "1", "name")).toBe("saving");
    expect(cellSaveSignature(store.getSnapshot())).toBe("1 name");
    resolve();
    await expect(pending).resolves.toBe(true);
    expect(cellSaveStatus(store.getSnapshot(), "1", "name")).toBeUndefined();
  });

  it("marks a rejected save failed, tells the observer and rolls it back", async () => {
    const onEditError = vi.fn();
    const onRollback = vi.fn();
    const store = createCellSaveStore<Row>({ onEditError });
    expect(store.canRollback()).toBe(false);
    store.configure({ onEditError, onRollback });
    expect(store.canRollback()).toBe(true);
    const failed = await store.track({
      rowId: "1",
      columnKey: "name",
      previous: ada,
      attempted: "A",
      result: Promise.reject(new Error("offline")),
    });
    expect(failed).toBe(false);
    const snapshot = store.getSnapshot();
    expect(cellSaveStatus(snapshot, "1", "name")).toBe("failed");
    expect(cellSaveFailure(snapshot, "1", "name")).toEqual({
      previous: ada,
      attempted: "A",
      message: "offline",
    });
    expect(cellSaveSignature(snapshot)).toBe("1 nameoffline");
    expect(onEditError).toHaveBeenCalledWith(
      expect.objectContaining({ error: "offline", previousValue: ada })
    );
    store.rollback("1", "age");
    store.rollback("1", "name");
    expect(onRollback).toHaveBeenCalledWith(ada, "name");
    expect(cellSaveStatus(store.getSnapshot(), "1", "name")).toBeUndefined();
  });

  it("formats rejections and ignores the answer of a superseded save", async () => {
    const store = createCellSaveStore<Row>({ formatError: () => "nope" });
    const base = {
      rowId: "1",
      columnKey: "name",
      previous: ada,
      attempted: "A",
    };
    let rejectFirst!: (reason: unknown) => void;
    const first = store.track({
      ...base,
      result: new Promise((_, reject) => {
        rejectFirst = reject;
      }),
    });
    const second = store.track({ ...base, result: Promise.resolve() });
    rejectFirst(new Error("late"));
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(true);
    expect(cellSaveFailure(store.getSnapshot(), "1", "name")).toBeUndefined();

    await store.track({ ...base, result: Promise.reject(new Error("x")) });
    expect(cellSaveFailure(store.getSnapshot(), "1", "name")?.message).toBe(
      "nope"
    );
    store.clear("1", "name");
    store.clear("1", "name");
    expect(cellSaveStatus(store.getSnapshot(), "1", "name")).toBeUndefined();
  });

  it("reads a rejection as the sentence a cell shows", () => {
    expect(defaultSaveErrorMessage(new Error("boom"))).toBe("boom");
    expect(defaultSaveErrorMessage("quota")).toBe("quota");
    expect(defaultSaveErrorMessage("")).toBe("Could not save");
    expect(defaultSaveErrorMessage(42)).toBe("Could not save");
  });
});

describe("createEditValidationStore", () => {
  const target = { rowId: "1", columnKey: "name" };

  it("allows a commit nothing validates", async () => {
    const store = createEditValidationStore<Row>();
    await expect(
      store.check({ target, value: "A", row: ada })
    ).resolves.toEqual({ allowed: true });
    expect(store.hasRowValidator()).toBe(false);
  });

  it("marks a cell the cell validator refuses", async () => {
    const store = createEditValidationStore<Row>();
    const result = await store.check({
      target,
      value: "",
      row: ada,
      validateCell: (value) => (value === "" ? "Required" : undefined),
    });
    expect(result).toEqual({ allowed: false, error: "Required" });
    const snapshot = store.getSnapshot();
    expect(validationErrorFor(snapshot, "1", "name")).toBe("Required");
    expect(rowHasValidationError(snapshot, "1")).toBe(true);
    expect(rowHasValidationError(snapshot, "2")).toBe(false);
    expect(validationSignature(snapshot)).toContain("Required");
  });

  it("judges the row the edit would produce, at row and cell level", async () => {
    const validateRow = vi.fn((row: Row) =>
      row.name === "bad" ? "Row is bad" : undefined
    );
    const store = createEditValidationStore<Row>({ validateRow });
    expect(store.hasRowValidator()).toBe(true);
    await expect(
      store.check({ target, value: "bad", row: ada })
    ).resolves.toEqual({ allowed: false, error: "Row is bad" });
    expect(validateRow).toHaveBeenCalledWith({ ...ada, name: "bad" });
    expect(store.getSnapshot().rowErrors.get("1")).toBe("Row is bad");
    expect(rowHasValidationError(store.getSnapshot(), "1")).toBe(true);
    await expect(
      store.check({ target, value: "ok", row: ada })
    ).resolves.toEqual({ allowed: true });
    expect(store.getSnapshot().rowErrors.size).toBe(0);

    store.configure({
      validateRow: () => ({ start: "Before end", end: "After start" }),
      applyEdit: (row, key, value) => ({ ...row, [key]: value }),
    });
    await expect(
      store.check({
        target: { rowId: "1", columnKey: "end" },
        value: 1,
        row: ada,
      })
    ).resolves.toEqual({ allowed: false, error: "After start" });
    await expect(
      store.check({ target, value: "x", row: ada })
    ).resolves.toEqual({ allowed: false, error: "Before end" });
    store.configure({ validateRow: () => ({}) });
    await expect(
      store.check({ target, value: "x", row: ada })
    ).resolves.toEqual({ allowed: true });
  });

  it("ignores a superseded check and clears what it marked", async () => {
    let resolveFirst!: (value: string | undefined) => void;
    const store = createEditValidationStore<Row>();
    const first = store.check({
      target,
      value: "a",
      row: ada,
      validateCell: () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    });
    expect(store.getSnapshot().validating.size).toBe(1);
    const second = store.check({
      target,
      value: "b",
      row: ada,
      validateCell: () => "Too short",
    });
    resolveFirst("stale");
    await expect(first).resolves.toEqual({ allowed: false });
    await expect(second).resolves.toEqual({
      allowed: false,
      error: "Too short",
    });

    let resolveRow!: (value: string | undefined) => void;
    store.configure({
      validateRow: () =>
        new Promise((resolve) => {
          resolveRow = resolve;
        }),
    });
    const slow = store.check({ target, value: "c", row: ada });
    await Promise.resolve();
    store.clear("1", "name");
    resolveRow("late row error");
    await expect(slow).resolves.toEqual({ allowed: false });
    expect(
      validationErrorFor(store.getSnapshot(), "1", "name")
    ).toBeUndefined();

    await store.check({ target, value: "", row: ada, validateCell: () => "x" });
    store.clearAll();
    expect(store.getSnapshot().cellErrors.size).toBe(0);
  });
});

describe("undo and redo", () => {
  const edit = { row: ada, columnKey: "name", value: "A" };

  it("keeps at most the depth, drops redo on a new gesture, and clears", () => {
    const stack = createEditHistoryStack<Row>();
    const listener = vi.fn();
    stack.subscribe(listener);
    expect(stack.undo()).toBeUndefined();
    expect(stack.redo()).toBeUndefined();
    const entry = (value: string) => ({ redo: [{ ...edit, value }], undo: [] });
    stack.record(entry("1"), 2);
    stack.record(entry("2"), 2);
    stack.record(entry("3"), 2);
    expect(stack.getSnapshot()).toEqual({ past: 2, future: 0 });
    expect(stack.undo()?.redo[0]?.value).toBe("3");
    expect(stack.getSnapshot()).toEqual({ past: 1, future: 1 });
    expect(stack.redo()?.redo[0]?.value).toBe("3");
    stack.undo();
    stack.record(entry("4"), 2);
    expect(stack.getSnapshot()).toEqual({ past: 2, future: 0 });
    stack.clear();
    expect(stack.getSnapshot()).toEqual({ past: 0, future: 0 });
    expect(listener).toHaveBeenCalledTimes(8);
  });

  it("stops telling a listener once it unsubscribes", () => {
    const stack = createEditHistoryStack<Row>();
    const listener = vi.fn();
    const release = stack.subscribe(listener);
    stack.clear();
    release();
    stack.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("builds an entry from the values each edit replaces", () => {
    expect(
      editHistoryEntry([edit, { ...edit, columnKey: "ghost" }], (e) =>
        e.columnKey === "name" ? { value: "Ada" } : undefined
      )
    ).toEqual({
      redo: [edit, { ...edit, columnKey: "ghost" }],
      undo: [{ row: ada, columnKey: "name", value: "Ada" }],
    });
  });

  it("reads a cell's value from editValue, sortValue or its key", () => {
    expect(
      readCellValue(ada, {
        key: "name",
        editValue: () => "edit",
        sortValue: () => "sort",
      })
    ).toBe("edit");
    expect(readCellValue(ada, { key: "name", sortValue: () => "sort" })).toBe(
      "sort"
    );
    expect(readCellValue(ada, { key: "name" })).toBe("Ada");
  });

  it("records a paste or a batch as one gesture", () => {
    const record = vi.fn();
    expect(asGesture(undefined, record)).toBeUndefined();
    expect(asBatchGesture(undefined, record)).toBeUndefined();
    const apply = vi.fn();
    asGesture(apply, record)?.([edit]);
    expect(record).toHaveBeenCalledWith([edit]);
    expect(apply).toHaveBeenCalledWith([edit]);
    const save = vi.fn(() => "saved");
    const batch = [{ row: ada, rowId: "1", patch: { name: "A", start: 1 } }];
    expect(asBatchGesture(save, record)?.(batch)).toBe("saved");
    expect(record).toHaveBeenLastCalledWith(cellsOfBatch(batch));
    expect(cellsOfBatch(batch)).toEqual([
      { row: ada, columnKey: "name", value: "A" },
      { row: ada, columnKey: "start", value: 1 },
    ]);
  });
});

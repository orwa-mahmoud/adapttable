import { afterEach, describe, expect, it, vi } from "vitest";

import type { ReconcileLiveEdit } from "./editConflictView";

interface Row {
  id: string;
  name: string;
}
const opened: Row = { id: "1", name: "Ada" };
const live: Row = { id: "1", name: "Ada Lovelace" };

function cellInput(
  active: boolean,
  rows: readonly Row[] = [live]
): ReconcileLiveEdit<Row> {
  return {
    active: active ? { rowId: "1", columnKey: "name" } : null,
    openedRow: active ? opened : undefined,
    draft: "Typed",
    rows,
    columns: [{ key: "name", editable: true }],
    rowKey: (row: Row) => row.id,
    policy: "ask",
    keep: () => undefined,
    take: () => undefined,
  } as unknown as ReconcileLiveEdit<Row>;
}

/** A fresh copy of the module, so its page-wide cache starts empty. */
async function freshModule() {
  vi.resetModules();
  return import("./deferredEditConflict");
}

afterEach(() => {
  vi.doUnmock("./editConflict");
  vi.restoreAllMocks();
});

describe("createDeferredEditConflictStore", () => {
  it("asks nothing and loads nothing while no edit is open", async () => {
    const { createDeferredEditConflictStore } = await freshModule();
    const store = createDeferredEditConflictStore<Row>();
    store.reconcile(cellInput(false));
    expect(store.getSnapshot().current).toBeNull();
    await Promise.resolve();
    expect(store.getSnapshot().current).toBeNull();
  });

  it("loads on the first open edit and replays the latest input", async () => {
    const { createDeferredEditConflictStore, loadEditConflictStore } =
      await freshModule();
    const store = createDeferredEditConflictStore<Row>();
    const heard = vi.fn();
    store.subscribe(heard);
    store.reconcile(cellInput(true));
    expect(store.getSnapshot().current).toBeNull();
    // The store's own load started first; once this one settles, the module
    // is in and only the store's replay is left.
    await loadEditConflictStore();
    await vi.waitFor(() => {
      expect(store.getSnapshot().current).toMatchObject({
        unit: "cell",
        rowId: "1",
        incomingValue: "Ada Lovelace",
      });
    });
    expect(heard).toHaveBeenCalled();
  });

  it("forgets an edit that closed before the store arrived", async () => {
    const { createDeferredEditConflictStore, loadEditConflictStore } =
      await freshModule();
    const store = createDeferredEditConflictStore<Row>();
    store.reconcile(cellInput(true));
    store.reconcile(cellInput(false));
    // The same module import the store is waiting on.
    await loadEditConflictStore();
    await Promise.resolve();
    expect(store.getSnapshot().current).toBeNull();
  });

  it("gives later tables the store at once once it has loaded", async () => {
    const { createDeferredEditConflictStore, loadEditConflictStore } =
      await freshModule();
    await loadEditConflictStore();
    const store = createDeferredEditConflictStore<Row>();
    store.reconcile(cellInput(true));
    expect(store.getSnapshot().current).toMatchObject({ unit: "cell" });
  });

  it("reports a load that fails and tries again on the next open edit", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.resetModules();
    let fail = true;
    vi.doMock("./editConflict", async (original) => {
      if (fail) throw new Error("offline");
      return original();
    });
    const { createDeferredEditConflictStore, loadEditConflictStore } =
      await import("./deferredEditConflict");
    const store = createDeferredEditConflictStore<Row>();
    store.reconcile(cellInput(true));
    await vi.waitFor(() => {
      expect(error).toHaveBeenCalled();
    });
    expect(store.getSnapshot().current).toBeNull();
    fail = false;
    store.reconcile(cellInput(true));
    await loadEditConflictStore();
    await vi.waitFor(() => {
      expect(store.getSnapshot().current).toMatchObject({ unit: "cell" });
    });
  });
});

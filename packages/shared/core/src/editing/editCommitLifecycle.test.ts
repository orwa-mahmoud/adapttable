import { describe, expect, it, vi } from "vitest";

import {
  type BatchEditStoreOptions,
  createBatchEditStore,
} from "./batchEditing";
import {
  createEditCommitLifecycle,
  type EditCommitSnapshot,
} from "./editCommitLifecycle";
import { createRowEditStore, type RowEditStoreOptions } from "./rowEditing";
interface Row {
  id: string;
  name: string;
  number: number;
}
const row: Row = { id: "1", name: "Ada", number: 1 };
const columns = [
  { key: "name", editable: true },
  { key: "number", editable: true, editor: "number" },
] as const;
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
type SharedOptions = Omit<RowEditStoreOptions<Row>, "onRowEdit"> & {
  readonly onCommit?: () => unknown;
};
function mount(kind: "row" | "batch", config: SharedOptions) {
  const shared = { enabled: true, ...config };
  if (kind === "row") {
    const options: RowEditStoreOptions<Row> = {
      ...shared,
      onRowEdit: config.onCommit,
    };
    const store = createRowEditStore(options);
    store.begin(row, row.id);
    return {
      store,
      set: (key: string, value: string) => store.setDraft(key, value),
      save: store.save,
      cancel: store.cancel,
      state: () => ({
        commit: store.getSnapshot().commit,
        open: store.getSnapshot().activeRowId !== null,
        draft: store.getSnapshot().drafts.name,
      }),
      configure: (update: SharedOptions) =>
        store.configure({
          ...options,
          ...update,
          onRowEdit: update.onCommit ?? options.onRowEdit,
        }),
    };
  }
  const options: BatchEditStoreOptions<Row> = {
    ...shared,
    onBatchEdit: config.onCommit,
  };
  const store = createBatchEditStore(options);
  return {
    store,
    set: (key: string, value: string) =>
      store.setDraft(row, row.id, key, value),
    save: store.saveAll,
    cancel: store.cancelAll,
    state: () => ({
      commit: store.getSnapshot().commit,
      open: store.getSnapshot().entries.length > 0,
      draft: store.getSnapshot().entries[0]?.drafts.name,
    }),
    configure: (update: SharedOptions) =>
      store.configure({
        ...options,
        ...update,
        onBatchEdit: update.onCommit ?? options.onBatchEdit,
      }),
  };
}
for (const kind of ["row", "batch"] as const)
  describe(`${kind} commit lifecycle`, () => {
    it("keeps the original same-tick host/observer order and void return for synchronous callbacks", () => {
      const order: string[] = [];
      const value = mount(kind, {
        columns,
        onCommit: () => {
          order.push("host");
          return 7;
        },
        onEditCommit: () => {
          order.push("observer");
        },
      });
      value.set("name", "new");
      const result = value.save();
      order.push("return");
      expect(order).toEqual(["host", "observer", "return"]);
      expect(result).toBeUndefined();
      expect(value.state().open).toBe(false);
      expect(value.state().commit).toBeUndefined();
    });
    it("retains drafts and marks saving, suppressing duplicate saves until success", async () => {
      const save = deferred<void>();
      const commit = vi.fn(() => save.promise);
      const value = mount(kind, { columns, onCommit: commit });
      value.set("name", "new");
      value.save();
      value.save();
      expect(commit).toHaveBeenCalledOnce();
      expect(value.state()).toMatchObject({
        open: true,
        draft: "new",
        commit: { phase: "saving" },
      });
      save.resolve();
      await tick();
      expect(value.state().open).toBe(false);
      expect(value.state().commit).toBeUndefined();
    });
    it("retains failed drafts and reports the same unit without an unhandled rejection", async () => {
      const save = deferred<void>();
      const error = vi.fn();
      const value = mount(kind, {
        columns,
        onCommit: () => save.promise,
        onEditError: error,
        formatEditError: () => "Offline",
      });
      value.set("name", "new");
      value.save();
      save.reject(new Error("network"));
      await tick();
      expect(value.state()).toMatchObject({
        open: true,
        draft: "new",
        commit: { phase: "failed", error: "Offline" },
      });
      expect(error).toHaveBeenCalledWith(
        expect.objectContaining({
          row,
          rowId: "1",
          unit: kind,
          error: "Offline",
        })
      );
    });
    it("preserves synchronous host exceptions while publishing failure and retaining drafts", () => {
      const failure = new Error("sync");
      const value = mount(kind, {
        columns,
        onCommit: () => {
          throw failure;
        },
      });
      value.set("name", "new");
      expect(value.save).toThrow(failure);
      expect(value.state().commit?.phase).toBe("failed");
      expect(value.state().draft).toBe("new");
    });
    it("validates the complete proposed row synchronously without mutating host data", () => {
      const validateRow = vi.fn((candidate: Row) =>
        candidate.name === "new" && candidate.number === 9
          ? undefined
          : "Invalid"
      );
      const commit = vi.fn();
      const value = mount(kind, { columns, validateRow, onCommit: commit });
      value.set("name", "new");
      value.set("number", "9");
      value.save();
      expect(validateRow).toHaveBeenCalledWith({
        ...row,
        name: "new",
        number: 9,
      });
      expect(commit).toHaveBeenCalledOnce();
      expect(row).toEqual({ id: "1", name: "Ada", number: 1 });
    });
    it("holds async validation, retains field verdicts and calls no host on rejection", async () => {
      const gate = deferred<string | Record<string, string> | undefined>();
      const commit = vi.fn();
      const invalid = vi.fn();
      const value = mount(kind, {
        columns,
        validateRow: () => gate.promise,
        onCommit: commit,
        onValidationFail: invalid,
      });
      value.set("name", "new");
      value.save();
      expect(value.state().commit?.phase).toBe("validating");
      gate.resolve({ name: "Name is taken" });
      await tick();
      expect(commit).not.toHaveBeenCalled();
      expect(value.state().commit).toMatchObject({
        phase: "invalid",
        validation: [
          { rowId: "1", columnKey: "name", message: "Name is taken" },
        ],
      });
      expect(invalid).toHaveBeenCalled();
    });
    it("cancels a pending validation before host admission", async () => {
      const gate = deferred<undefined>();
      const commit = vi.fn();
      const value = mount(kind, {
        columns,
        validateRow: () => gate.promise,
        onCommit: commit,
      });
      value.set("name", "new");
      value.save();
      value.cancel();
      gate.resolve(undefined);
      await tick();
      expect(commit).not.toHaveBeenCalled();
      expect(value.state().open).toBe(false);
    });
    it("ignores a host settlement after cancellation without claiming to cancel host work", async () => {
      const save = deferred<void>();
      const commit = vi.fn(() => save.promise);
      const error = vi.fn();
      const value = mount(kind, {
        columns,
        onCommit: commit,
        onEditError: error,
      });
      value.set("name", "new");
      value.save();
      value.cancel();
      const snapshot = value.store.getSnapshot();
      save.reject(new Error("late"));
      await tick();
      expect(commit).toHaveBeenCalledOnce();
      expect(error).not.toHaveBeenCalled();
      expect(value.store.getSnapshot()).toBe(snapshot);
    });
    it("prevents old validation and save continuations from overwriting a newer draft", async () => {
      const save = deferred<void>();
      const value = mount(kind, { columns, onCommit: () => save.promise });
      value.set("name", "sent");
      value.save();
      value.set("name", "newer");
      save.resolve();
      await tick();
      expect(value.state().open).toBe(true);
      expect(value.state().draft).toBe("newer");
      expect(value.state().commit).toBeUndefined();
    });
    it("keeps equivalent reconfiguration alive and revokes changed callback continuations", async () => {
      const save = deferred<void>();
      const commit = () => save.promise;
      const value = mount(kind, { columns, onCommit: commit });
      value.set("name", "new");
      value.save();
      value.configure({ columns, onCommit: commit });
      expect(value.state().commit?.phase).toBe("saving");
      value.configure({ columns, onCommit: () => undefined });
      expect(value.state().commit).toBeUndefined();
      save.resolve();
      await tick();
      expect(value.state().draft).toBe("new");
    });
    it("disposes pending state and rejects all future controller writes", async () => {
      const save = deferred<void>();
      const commit = vi.fn(() => save.promise);
      const value = mount(kind, { columns, onCommit: commit });
      value.set("name", "new");
      value.save();
      value.store.dispose?.();
      const snapshot = value.store.getSnapshot();
      value.set("name", "after");
      value.save();
      value.cancel();
      value.configure({ columns, onCommit: vi.fn() });
      save.resolve();
      await tick();
      expect(value.store.getSnapshot()).toBe(snapshot);
      expect(commit).toHaveBeenCalledOnce();
    });
  });
describe("shared commit lifecycle reentrancy", () => {
  it("does not settle over state replaced by a publication subscriber", async () => {
    const save = deferred<void>();
    let state: EditCommitSnapshot | undefined;
    let before = true;
    const success = vi.fn();
    const controller = createEditCommitLifecycle((next) => {
      state = next;
      if (next === undefined && !before) controller.invalidate();
    });
    controller.run({
      commit: () => save.promise,
      committed: () => undefined,
      success,
      failure: () => undefined,
      invalid: () => undefined,
    });
    before = false;
    save.resolve();
    await tick();
    expect(state).toBeUndefined();
    expect(success).not.toHaveBeenCalled();
  });
  it("blocks synchronous reentrant admission", () => {
    const controller = createEditCommitLifecycle(() => undefined);
    const commit = vi.fn(() => controller.run(input));
    const input = {
      commit,
      committed: () => undefined,
      success: () => undefined,
      failure: () => undefined,
      invalid: () => undefined,
    };
    controller.run(input);
    expect(commit).toHaveBeenCalledOnce();
  });
});

describe("addressed validation and batch atomicity", () => {
  it("validates every staged row before admitting one atomic host request", async () => {
    const verdict = deferred<string | undefined>();
    const host = vi.fn();
    const invalid = vi.fn();
    const store = createBatchEditStore<Row>({
      enabled: true,
      columns: [
        {
          key: "name",
          editable: true,
          validate: (_value, candidate) =>
            candidate.id === "2" ? verdict.promise : undefined,
        },
      ],
      onBatchEdit: host,
      onValidationFail: invalid,
    });
    store.setDraft(row, "1", "name", "one");
    store.setDraft({ ...row, id: "2" }, "2", "name", "two");
    store.saveAll();
    expect(host).not.toHaveBeenCalled();
    verdict.resolve("Two is invalid");
    await tick();
    expect(store.getSnapshot().entries).toHaveLength(2);
    expect(store.getSnapshot().commit?.validation).toEqual([
      { rowId: "2", columnKey: "name", message: "Two is invalid" },
    ]);
    expect(host).not.toHaveBeenCalled();
    expect(invalid).toHaveBeenCalledOnce();
  });
  it("uses the caller pure applyEdit to validate nested/domain-specific rows", () => {
    const host = vi.fn();
    const applyEdit = vi.fn((candidate: Row, key: string, value: unknown) => ({
      ...candidate,
      [key]: value,
      number: candidate.number + 1,
    }));
    const validateRow = vi.fn(() => undefined);
    const store = createRowEditStore<Row>({
      enabled: true,
      columns,
      onRowEdit: host,
      applyEdit,
      validateRow,
    });
    store.begin(row, "1");
    store.setDraft("name", "new");
    store.save();
    expect(applyEdit).toHaveBeenCalledWith(row, "name", "new");
    expect(validateRow).toHaveBeenCalledWith({
      ...row,
      name: "new",
      number: 2,
    });
    expect(host).toHaveBeenCalledOnce();
  });
  it("keeps synchronous cell failures before row validation and accepts an empty error map", () => {
    const host = vi.fn();
    const validateRow = vi.fn(() => ({}));
    const custom = [
      {
        key: "name",
        editable: true,
        validate: (value: unknown) => (value === "bad" ? "Invalid" : undefined),
      },
    ];
    const store = createRowEditStore<Row>({
      enabled: true,
      columns: custom,
      onRowEdit: host,
      validateRow,
    });
    store.begin(row, "1");
    store.setDraft("name", "bad");
    store.save();
    expect(validateRow).not.toHaveBeenCalled();
    expect(store.getSnapshot().commit?.phase).toBe("invalid");
    store.setDraft("name", "good");
    store.save();
    expect(host).toHaveBeenCalledOnce();
    expect(store.getSnapshot().activeRowId).toBeNull();
  });
  it("catches async validation transport errors and async-gated synchronous host errors", async () => {
    const gate = deferred<string | undefined>();
    const error = vi.fn();
    const store = createRowEditStore<Row>({
      enabled: true,
      columns,
      validateRow: () => gate.promise,
      onRowEdit: () => {
        throw new Error("Host failed");
      },
      onEditError: error,
    });
    store.begin(row, "1");
    store.setDraft("name", "new");
    store.save();
    gate.resolve(undefined);
    await tick();
    expect(store.getSnapshot().commit?.phase).toBe("failed");
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Host failed" })
    );
    const rejection = deferred<string | undefined>();
    store.configure({
      enabled: true,
      columns,
      validateRow: () => rejection.promise,
      onEditError: error,
    });
    store.save();
    rejection.reject(new Error("Validator unavailable"));
    await tick();
    expect(store.getSnapshot().commit?.error).toBe("Validator unavailable");
  });
  it("falls back safely when a host error formatter itself throws", async () => {
    const store = createRowEditStore<Row>({
      enabled: true,
      columns,
      onRowEdit: () => Promise.reject(new Error("original")),
      formatEditError: () => {
        throw new Error("formatter");
      },
    });
    store.begin(row, "1");
    store.setDraft("name", "new");
    store.save();
    await tick();
    expect(store.getSnapshot().commit?.error).toBe("original");
  });
  it("ignores nonexistent batch targets and repeated values during an in-flight save", async () => {
    const save = deferred<void>();
    const store = createBatchEditStore<Row>({
      enabled: true,
      columns,
      onBatchEdit: () => save.promise,
    });
    store.setDraft(row, "1", "name", "new");
    store.saveAll();
    store.cancelRow("missing");
    store.takeSeeds(row, "missing", ["name"]);
    store.setDraft(row, "1", "missing", "bad");
    store.setDraft(row, "1", "name", "new");
    expect(store.getSnapshot().commit?.phase).toBe("saving");
    save.resolve();
    await tick();
    expect(store.getSnapshot().entries).toEqual([]);
  });
  it("preserves a synchronous thrown validator and revokes accepted live-seed continuations", async () => {
    const thrown = new Error("validator");
    const store = createRowEditStore<Row>({
      enabled: true,
      columns,
      validateRow: () => {
        throw thrown;
      },
    });
    store.begin(row, "1");
    store.setDraft("name", "new");
    expect(store.save).toThrow(thrown);
    expect(store.getSnapshot().drafts.name).toBe("new");
    const save = deferred<void>();
    store.configure({ enabled: true, columns, onRowEdit: () => save.promise });
    store.save();
    store.acceptSeeds({ ...row, name: "live" }, ["name"]);
    save.resolve();
    await tick();
    expect(store.getSnapshot().activeRowId).toBe("1");
    expect(store.getSnapshot().drafts.name).toBe("new");
  });
});
it("stops later validation callbacks after cancellation during an earlier async check", async () => {
  const gate = deferred<string | undefined>();
  const validateRow = vi.fn(() => undefined);
  const secondCell = vi.fn(() => undefined);
  const store = createRowEditStore<Row>({
    enabled: true,
    columns: [
      { key: "name", editable: true, validate: () => gate.promise },
      { key: "number", editable: true, validate: secondCell },
    ],
    validateRow,
  });
  store.begin(row, "1");
  store.setDraft("name", "new");
  store.setDraft("number", "2");
  store.save();
  store.cancel();
  gate.resolve(undefined);
  await tick();
  expect(secondCell).not.toHaveBeenCalled();
  expect(validateRow).not.toHaveBeenCalled();
});
for (const kind of ["row", "batch"] as const)
  it(`${kind}: a throwing commit observer cannot strand a rejected host promise`, async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const save = deferred<void>();
      const error = vi.fn();
      const value = mount(kind, {
        columns,
        onCommit: () => save.promise,
        onEditCommit: () => {
          throw new Error(kind + " observer");
        },
        onEditError: error,
      });
      value.set("name", "new");
      expect(value.save).not.toThrow();
      expect(value.state().commit?.phase).toBe("saving");
      save.reject(new Error("host rejection"));
      await tick();
      expect(value.state().commit).toMatchObject({
        phase: "failed",
        error: "host rejection",
      });
      expect(value.state().draft).toBe("new");
      expect(error).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
it("preserves a whole-row validation message without assigning a fictitious cell", () => {
  const store = createRowEditStore<Row>({
    enabled: true,
    columns,
    validateRow: () => "Row is invalid",
  });
  store.begin(row, "1");
  store.setDraft("name", "new");
  store.save();
  expect(store.getSnapshot().commit?.validation).toEqual([
    { rowId: "1", message: "Row is invalid" },
  ]);
  expect(store.getSnapshot().activeRowId).toBe("1");
});

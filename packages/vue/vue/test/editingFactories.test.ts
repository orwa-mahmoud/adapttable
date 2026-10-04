import { ACTIONS_COLUMN_KEY } from "@adapttable/core";
import { slotRender } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  type PropType,
  shallowRef,
} from "vue";

import {
  BatchEditBarChrome,
  batchEditBarSlotKey,
  batchEditing,
  dirtyIndicators,
  EditableCellChrome,
  editableCellSlotKey,
  editHistory,
  editHistoryModelKey,
  editing,
  type EditingActionSlots,
  RowEditActionsChrome,
  rowEditActionsSlotKey,
  rowEditing,
  useEditableCellModel,
  type VueEditableCellProps,
} from "../src/editing";
import { extendFeature, type TableFeature } from "../src/features/tableFeature";
import {
  DesktopTableChrome,
  MobileCardsChrome,
} from "../src/layout/tableChrome";
import {
  useDataTableShell,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  amount: number;
}
const original: Row = { id: "1", name: "Ada", amount: 1 };
const columns = [
  { key: "name", header: "Name", editable: true },
  { key: "amount", header: "Amount", editable: true, editor: "number" },
] as const;
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
  await nextTick();
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
const actionSlots: EditingActionSlots = {
  Button: (props) =>
    h("button", { ...props.attrs, onClick: props.onClick }, props.label),
};
const Cell = defineComponent({
  props: {
    model: {
      type: Object as PropType<VueEditableCellProps<Row>>,
      required: true,
    },
  },
  setup(props) {
    const model = useEditableCellModel(() => props.model);
    return () =>
      EditableCellChrome({
        model: model.value,
        controls: {
          Activate: (control) =>
            h(
              "button",
              {
                ref: (element: unknown) =>
                  control.activateRef(
                    element instanceof HTMLButtonElement ? element : null
                  ),
                onDblclick: control.onDoubleClick,
                onClick: control.onClick,
                onKeydown: control.onKeyDown,
              },
              [control.display]
            ),
          Editor: (control) =>
            h("input", {
              ...control.attrs,
              value: control.controller.draft,
              type: control.controller.editor === "number" ? "number" : "text",
              ref: (element: unknown) =>
                control.editorRef(
                  element instanceof HTMLInputElement ? element : null
                ),
              onInput: (event: Event) =>
                control.onChange((event.target as HTMLInputElement).value),
              onBlur: control.onBlur,
              onKeydown: control.onKeyDown,
            }),
          Button: (control) =>
            h(
              "button",
              {
                "data-adapttable-part": control.part,
                onMousedown: control.onMouseDown,
                onClick: control.onClick,
              },
              control.label
            ),
        },
      });
  },
});
function native(feature: TableFeature<Row>): TableFeature<Row> {
  return extendFeature(feature, [
    slotRender(editableCellSlotKey<Row>(), (model) => h(Cell, { model })),
    slotRender(rowEditActionsSlotKey<Row>(), (props) =>
      RowEditActionsChrome({ ...props, controls: actionSlots })
    ),
    slotRender(batchEditBarSlotKey<Row>(), (props) =>
      BatchEditBarChrome({ ...props, controls: actionSlots })
    ),
  ]);
}
function mount(features: readonly TableFeature<Row>[], mobile = false) {
  const declared = shallowRef(features);
  const rows = shallowRef<readonly Row[]>([original]);
  const shown = shallowRef(true);
  const isMobile = shallowRef(mobile);
  let shell: UseDataTableShellResult<Row> | undefined;
  const Table = defineComponent({
    setup() {
      shell = useDataTableShell<Row>(() => ({
        data: rows,
        columns,
        rowKey: (row) => row.id,
        features: declared,
        urlSync: false,
        forceMobile: isMobile,
      }));
      const current = shell;
      const slots = { SortButton: () => null, SelectionCheckbox: () => null };
      return () =>
        h("section", [
          h(
            "div",
            { "data-part": "batch-toolbar" },
            current.renderBatchEditBar()
          ),
          isMobile.value
            ? MobileCardsChrome({ model: current.mobile.value, slots })
            : DesktopTableChrome({ model: current.desktop.value, slots }),
        ]);
    },
  });
  const Root = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) }),
  });
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(Root);
  app.mount(element);
  if (!shell) throw new Error("No shell");
  return {
    shell,
    rows,
    shown,
    element,
    declared,
    isMobile,
    click: (part: string) =>
      element
        .querySelector<HTMLButtonElement>(`[data-adapttable-part="${part}"]`)!
        .click(),
    type: (index: number, value: string) => {
      const input = element.querySelectorAll<HTMLInputElement>(
        '[data-adapttable-part="edit-cell-input"]'
      )[index]!;
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    stop: () => {
      app.unmount();
      element.remove();
    },
  };
}
describe("complete composed editing factories", () => {
  it.each([false, true])(
    "row-only native fields/toolbar preserve pending validation/save/failure on mobile=%s",
    async (mobile) => {
      const gate = deferred<undefined>();
      const save = deferred<void>();
      const host = vi.fn(() => save.promise);
      const view = mount(
        [native(rowEditing<Row>(host, { validateRow: () => gate.promise }))],
        mobile
      );
      await tick();
      expect(
        view.element.querySelector('[data-adapttable-part="row-edit-begin"]')
      ).not.toBeNull();
      view.click("row-edit-begin");
      await tick();
      expect(view.element.querySelectorAll("input")).toHaveLength(2);
      expect(document.activeElement).toBe(view.element.querySelector("input"));
      view.type(0, "new");
      view.type(1, "7");
      view.click("row-edit-save");
      await tick();
      expect(view.shell.editing.value?.rowEditing?.commit?.phase).toBe(
        "validating"
      );
      expect(host).not.toHaveBeenCalled();
      gate.resolve(undefined);
      await tick();
      expect(host).toHaveBeenCalledWith(original, { name: "new", amount: 7 });
      expect(view.shell.editing.value?.rowEditing?.commit?.phase).toBe(
        "saving"
      );
      save.reject(new Error("Offline"));
      await tick();
      expect(
        view.element.querySelector('[data-adapttable-part="row-edit-error"]')
          ?.textContent
      ).toBe("Offline");
      expect(view.shell.editing.value?.rowEditing?.draftFor("name")).toBe(
        "new"
      );
      view.click("row-edit-cancel");
      await tick();
      expect(view.rows.value[0]).toBe(original);
      view.stop();
    }
  );
  it("batch-only fields never save on Enter/blur and commit one explicit toolbar request", async () => {
    const gate = deferred<void>();
    const host = vi.fn(() => gate.promise);
    const view = mount([native(batchEditing<Row>(host))]);
    await tick();
    expect(view.element.querySelectorAll("input")).toHaveLength(2);
    expect(
      view.element.querySelector('[data-adapttable-part="batch-edit-bar"]')
    ).toBeNull();
    view.type(0, "new");
    view.type(1, "5");
    const input = view.element.querySelector("input")!;
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    input.dispatchEvent(new FocusEvent("blur"));
    await tick();
    expect(host).not.toHaveBeenCalled();
    view.click("batch-edit-save");
    await tick();
    expect(host).toHaveBeenCalledOnce();
    expect(host).toHaveBeenCalledWith([
      { row: original, rowId: "1", patch: { name: "new", amount: 5 } },
    ]);
    gate.resolve();
    await tick();
    expect(
      view.element.querySelector('[data-adapttable-part="batch-edit-bar"]')
    ).toBeNull();
    expect(view.rows.value[0]).toBe(original);
    view.stop();
  });
  it("shares one model/history/dirty session for all factory combinations and disposes removed modes", async () => {
    const cellHost = vi.fn();
    const rowHost = vi.fn();
    const batchHost = vi.fn();
    const dirty = vi.fn();
    const cell = native(editing<Row>(cellHost, { onDirtyChange: dirty }));
    const row = native(rowEditing<Row>(rowHost));
    const batch = native(batchEditing<Row>(batchHost));
    const view = mount([
      cell,
      row,
      batch,
      editHistory({ depth: 5 }),
      dirtyIndicators(),
    ]);
    await tick();
    expect(dirty.mock.calls.filter((call) => call[0].count === 0)).toHaveLength(
      1
    );
    expect(view.shell.editing.value?.batch).toBeDefined();
    expect(view.shell.editing.value?.rowEditing).toBeUndefined();
    view.type(0, "staged");
    await tick();
    const oldBatch = view.shell.editing.value!.batch!;
    view.declared.value = [
      cell,
      row,
      editHistory({ depth: 5 }),
      dirtyIndicators(),
    ];
    await tick();
    expect(view.shell.editing.value?.batch).toBeUndefined();
    expect(view.shell.editing.value?.rowEditing).toBeDefined();
    oldBatch.saveAll();
    expect(batchHost).not.toHaveBeenCalled();
    view.click("row-edit-begin");
    await tick();
    view.type(0, "row");
    view.type(1, "8");
    view.click("row-edit-save");
    await tick();
    expect(rowHost).toHaveBeenCalledOnce();
    const history = view.shell.state.get(editHistoryModelKey<Row>()).value!;
    expect(history.canUndo).toBe(true);
    expect(history.undo()).toBe(2);
    expect(cellHost).toHaveBeenCalledTimes(2);
    view.declared.value = [cell, batch];
    await tick();
    expect(view.shell.editing.value?.batch?.pending).toBe(false);
    const old = view.shell.editing.value!;
    view.declared.value = [];
    await tick();
    expect(view.shell.editing.value).toBeUndefined();
    old.batch?.setDraft(original, "1", "name", "stale");
    old.batch?.saveAll();
    expect(batchHost).not.toHaveBeenCalled();
    view.stop();
  });
  it("preserves unchanged row drafts across callback replacement and revokes removed callbacks", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const cell = native(editing<Row>(vi.fn()));
    const view = mount([cell, native(rowEditing<Row>(first))]);
    await tick();
    view.click("row-edit-begin");
    await tick();
    view.type(0, "pending");
    const begin = view.shell.editing.value!.rowEditing!.begin;
    view.declared.value = [cell, native(rowEditing<Row>(second))];
    await tick();
    expect(view.shell.editing.value!.rowEditing!.begin).toBe(begin);
    expect(view.shell.editing.value!.rowEditing!.draftFor("name")).toBe(
      "pending"
    );
    view.click("row-edit-save");
    await tick();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    view.click("row-edit-begin");
    await tick();
    view.type(0, "discard");
    const old = view.shell.editing.value!.rowEditing!;
    view.declared.value = [cell];
    await tick();
    old.save();
    expect(second).toHaveBeenCalledOnce();
    view.declared.value = [cell, native(rowEditing<Row>(second))];
    await tick();
    expect(view.shell.editing.value!.rowEditing!.activeRowId).toBeNull();
    view.stop();
  });
  it.each(["row", "batch"] as const)(
    "revokes pending %s settlement when its host callback changes",
    async (mode) => {
      const response = deferred<void>();
      const first = vi.fn(() => response.promise);
      const second = vi.fn();
      const feature = (callback: typeof first | typeof second) =>
        native(
          mode === "row"
            ? rowEditing<Row>(callback)
            : batchEditing<Row>(callback)
        );
      const view = mount([feature(first)]);
      await tick();
      if (mode === "row") {
        view.click("row-edit-begin");
        await tick();
      }
      view.type(0, "pending");
      await tick();
      view.click(mode === "row" ? "row-edit-save" : "batch-edit-save");
      await tick();
      expect(first).toHaveBeenCalledOnce();
      // Recreating the feature with the same callback preserves the pending lifecycle.
      view.declared.value = [feature(first)];
      await tick();
      expect(
        mode === "row"
          ? view.shell.editing.value!.rowEditing!.commit?.phase
          : view.shell.editing.value!.batch!.commit?.phase
      ).toBe("saving");
      view.declared.value = [feature(second)];
      await tick();
      response.resolve();
      await tick();
      if (mode === "row")
        expect(view.shell.editing.value!.rowEditing!.activeRowId).toBe("1");
      else expect(view.shell.editing.value!.batch!.pending).toBe(true);
      view.click(mode === "row" ? "row-edit-save" : "batch-edit-save");
      await tick();
      expect(second).toHaveBeenCalledOnce();
      view.stop();
    }
  );
  it.each([false, true])(
    "respects hidden actions column for native row controls on mobile=%s",
    async (mobile) => {
      const view = mount([native(rowEditing<Row>(vi.fn()))], mobile);
      await tick();
      expect(
        view.element.querySelector('[data-adapttable-part="row-edit-begin"]')
      ).not.toBeNull();
      view.shell.table.layout.value.setHidden(ACTIONS_COLUMN_KEY, true);
      await tick();
      expect(
        view.element.querySelector('[data-adapttable-part="row-edit-begin"]')
      ).toBeNull();
      view.shell.table.layout.value.setHidden(ACTIONS_COLUMN_KEY, false);
      await tick();
      expect(
        view.element.querySelector('[data-adapttable-part="row-edit-begin"]')
      ).not.toBeNull();
      view.stop();
    }
  );
  it.each(["row", "batch"] as const)(
    "a removed %s save handle cannot submit a re-enabled session",
    async (mode) => {
      const host = vi.fn();
      const cell = native(editing<Row>(vi.fn()));
      const feature = native(
        mode === "row" ? rowEditing<Row>(host) : batchEditing<Row>(host)
      );
      const view = mount([cell, feature]);
      await tick();
      const staleSave =
        mode === "row"
          ? view.shell.editing.value!.rowEditing!.save
          : view.shell.editing.value!.batch!.saveAll;
      view.declared.value = [cell];
      await tick();
      view.declared.value = [cell, feature];
      await tick();
      if (mode === "row") {
        view.click("row-edit-begin");
        await tick();
      }
      view.type(0, "new session");
      await tick();
      staleSave();
      await tick();
      expect(host).not.toHaveBeenCalled();
      view.click(mode === "row" ? "row-edit-save" : "batch-edit-save");
      await tick();
      expect(host).toHaveBeenCalledOnce();
      view.stop();
    }
  );
  it("keeps conflicting live row drafts blocked until the native choice is made", async () => {
    const host = vi.fn();
    const view = mount([native(rowEditing<Row>(host))]);
    await tick();
    view.click("row-edit-begin");
    await tick();
    view.type(0, "mine");
    view.rows.value = [{ ...original, name: "theirs" }];
    await tick();
    expect(view.shell.editing.value?.conflict?.anyContested).toBe(true);
    expect(
      view.element.querySelector('[data-adapttable-part="row-edit-save"]')
    ).toBeNull();
    view.shell.editing.value!.rowEditing!.save();
    expect(host).not.toHaveBeenCalled();
    view.click("edit-cell-keep-mine");
    await tick();
    view.click("row-edit-save");
    await tick();
    expect(host).toHaveBeenCalledWith(view.rows.value[0], { name: "mine" });
    view.stop();
  });
  it("tracks async dirty state once per cell and clears only after host agreement", async () => {
    const request = deferred<void>();
    const dirty = vi.fn();
    const view = mount([
      native(rowEditing<Row>(() => request.promise, { onDirtyChange: dirty })),
      dirtyIndicators(),
    ]);
    await tick();
    view.click("row-edit-begin");
    await tick();
    view.type(0, "new");
    view.type(1, "3");
    view.click("row-edit-save");
    await tick();
    expect(dirty.mock.lastCall?.[0].count).toBe(2);
    request.resolve();
    await tick();
    expect(dirty.mock.lastCall?.[0].count).toBe(0);
    view.stop();
  });
  it("owns factories added after mount through the table KeepAlive boundary", async () => {
    const gate = deferred<undefined>();
    const host = vi.fn();
    const view = mount([]);
    await tick();
    view.declared.value = [
      native(rowEditing<Row>(host, { validateRow: () => gate.promise })),
    ];
    await tick();
    view.click("row-edit-begin");
    await tick();
    view.type(0, "pending");
    view.click("row-edit-save");
    view.shown.value = false;
    await tick();
    gate.resolve(undefined);
    await tick();
    expect(host).not.toHaveBeenCalled();
    view.shown.value = true;
    await tick();
    expect(view.shell.editing.value?.rowEditing?.draftFor("name")).toBe(
      "pending"
    );
    view.stop();
  });
  it("rejects missing row/batch kit controls and history without a replay channel", () => {
    const create = (feature: TableFeature<Row>) =>
      defineComponent({
        setup() {
          useDataTableShell<Row>({
            data: [original],
            columns,
            rowKey: (row) => row.id,
            features: [feature],
            urlSync: false,
          });
          return () => null;
        },
      });
    for (const feature of [
      rowEditing<Row>(vi.fn()),
      batchEditing<Row>(vi.fn()),
    ]) {
      const div = document.createElement("div");
      const app = createApp(create(feature));
      app.config.warnHandler = () => undefined;
      expect(() => app.mount(div)).toThrow("requires the adapter control slot");
    }
    const div = document.createElement("div");
    const app = createApp(
      create(native(rowEditing<Row>(vi.fn(), { editHistory: true })))
    );
    app.config.warnHandler = () => undefined;
    expect(() => app.mount(div)).toThrow("replay callback");
  });
});
it("removes history replay and clears stale default state without removing editing", async () => {
  const host = vi.fn();
  const cell = native(editing<Row>(host));
  const row = native(rowEditing<Row>(vi.fn()));
  const view = mount([cell, row, editHistory(true)]);
  await tick();
  view.click("row-edit-begin");
  await tick();
  view.type(0, "new");
  view.click("row-edit-save");
  await tick();
  const old = view.shell.state.get(editHistoryModelKey<Row>()).value!;
  expect(old.canUndo).toBe(true);
  view.declared.value = [cell, row];
  await tick();
  expect(old.undo()).toBe(0);
  expect(host).not.toHaveBeenCalled();
  view.declared.value = [cell, row, editHistory(true)];
  await tick();
  expect(view.shell.state.get(editHistoryModelKey<Row>()).value!.canUndo).toBe(
    false
  );
  view.stop();
});
it("does not share draft, observer or history state between two tables using the same factories", async () => {
  const rowHost = vi.fn();
  const features = [
    native(rowEditing<Row>(rowHost)),
    native(editing<Row>(vi.fn())),
    editHistory(true),
  ];
  const one = mount(features);
  const two = mount(features);
  await tick();
  one.click("row-edit-begin");
  await tick();
  one.type(0, "only one");
  expect(two.shell.editing.value?.rowEditing?.activeRowId).toBeNull();
  one.click("row-edit-save");
  await tick();
  expect(rowHost).toHaveBeenCalledOnce();
  expect(one.shell.state.get(editHistoryModelKey<Row>()).value?.canUndo).toBe(
    true
  );
  expect(two.shell.state.get(editHistoryModelKey<Row>()).value?.canUndo).toBe(
    false
  );
  one.stop();
  two.stop();
});
it("exposes inline row validation and batch failure through required native surfaces", async () => {
  const rowHost = vi.fn();
  const view = mount([
    native(
      rowEditing<Row>(rowHost, { validateRow: () => ({ name: "Taken" }) })
    ),
  ]);
  await tick();
  view.click("row-edit-begin");
  await tick();
  view.type(0, "bad");
  view.click("row-edit-save");
  await tick();
  expect(
    view.element.querySelector("input")?.getAttribute("aria-invalid")
  ).toBe("true");
  expect(
    view.element.querySelector('[data-adapttable-part="edit-cell-error"]')
      ?.textContent
  ).toBe("Taken");
  expect(rowHost).not.toHaveBeenCalled();
  view.stop();
  const batch = mount([
    native(batchEditing<Row>(() => Promise.reject(new Error("Batch failed")))),
  ]);
  await tick();
  batch.type(0, "new");
  await tick();
  batch.click("batch-edit-save");
  await tick();
  expect(
    batch.element.querySelector('[data-adapttable-part="batch-edit-error"]')
      ?.textContent
  ).toBe("Batch failed");
  expect(batch.shell.editing.value?.batch?.pending).toBe(true);
  batch.click("batch-edit-cancel");
  await tick();
  expect(batch.shell.editing.value?.batch?.pending).toBe(false);
  batch.stop();
});
it("holds a conflicting batch until its native cell choice resolves it", async () => {
  const host = vi.fn();
  const view = mount([native(batchEditing<Row>(host))]);
  await tick();
  view.type(0, "mine");
  view.rows.value = [{ ...original, name: "theirs" }];
  await tick();
  expect(view.shell.editing.value?.conflict?.anyContested).toBe(true);
  expect(
    view.element.querySelector('[data-adapttable-part="batch-edit-save"]')
  ).toBeNull();
  view.shell.editing.value!.batch!.saveAll();
  expect(host).not.toHaveBeenCalled();
  view.click("edit-cell-take-theirs");
  await tick();
  expect(view.shell.editing.value!.batch!.pending).toBe(false);
  expect(view.element.querySelector("input")?.value).toBe("theirs");
  view.stop();
});
it("revokes history if its replay channel is removed while row editing remains", async () => {
  const cellHost = vi.fn();
  const rowHost = vi.fn();
  const cell = native(editing<Row>(cellHost));
  const row = native(rowEditing<Row>(rowHost));
  const view = mount([cell, row, editHistory(true)]);
  await tick();
  view.click("row-edit-begin");
  await tick();
  view.type(0, "saved");
  view.click("row-edit-save");
  await tick();
  const history = view.shell.state.get(editHistoryModelKey<Row>()).value!;
  view.declared.value = [row, editHistory(true)];
  await tick();
  expect(view.shell.editing.value?.rowEditing).toBeDefined();
  expect(view.shell.state.get(editHistoryModelKey<Row>()).value?.enabled).toBe(
    false
  );
  expect(history.undo()).toBe(0);
  expect(cellHost).not.toHaveBeenCalled();
  view.stop();
});

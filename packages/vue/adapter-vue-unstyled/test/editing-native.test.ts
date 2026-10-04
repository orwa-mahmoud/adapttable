import type { ColumnDef } from "@adapttable/vue";
import { type ComposedFeature, resolveLabels } from "@adapttable/vue/adapter";
import type { CustomCellEditorCtrl } from "@adapttable/vue/editing";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../src/editing";
import { NativeHistoryButtons } from "../src/editing/NativeHistoryButtons";
import {
  click,
  deferred,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";
interface Row {
  id: string;
  name: string;
  amount: number;
  active: boolean;
  tags: string[];
}
const original: Row = {
  id: "1",
  name: "Ada",
  amount: 2,
  active: true,
  tags: ["a"],
};
const defaultColumns: readonly ColumnDef<Row>[] = [
  { key: "name", editable: true },
  { key: "amount", editable: true, editor: "number" },
];
function table(
  features: readonly ComposedFeature<Row>[],
  overrides: Partial<DataTableProps<Row>> = {}
) {
  const rows = shallowRef<readonly Row[]>([original]);
  const props = shallowRef<DataTableProps<Row>>({
    data: rows.value,
    columns: defaultColumns,
    rowKey: (row) => row.id,
    urlSync: false,
    features,
    ...overrides,
  });
  const view = mountNative(() =>
    h(DataTable<Row>, { ...props.value, data: rows.value })
  );
  return { ...view, rows, props };
}
async function activate(host: ParentNode, index = 0, key = "F2") {
  const button = host.querySelectorAll<HTMLButtonElement>(
    part("edit-cell-activate")
  )[index];
  if (!button) throw new Error("No activatable native editor");
  button.focus();
  button.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await tick();
  return find<HTMLInputElement>(host, part("edit-cell-input"));
}
function key(input: HTMLElement, value: string, shiftKey = false) {
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true })
  );
}

describe("native editing controls", () => {
  for (const mobile of [false, true]) {
    it(`preserves keyboard activation, focus, cancellation and host ownership in ${mobile ? "cards" : "rows"}`, async () => {
      const commit = vi.fn();
      const view = table([editing<Row>(commit)], { forceMobile: mobile });
      const input = await activate(view.host);
      expect(document.activeElement).toBe(input);
      expect(input.getAttribute("aria-label")).toBeTruthy();
      await write(input, "Draft");
      key(input, "Escape");
      await tick();
      expect(view.host.querySelector(part("edit-cell-input"))).toBeNull();
      expect(document.activeElement).toBe(
        find(view.host, part("edit-cell-activate"))
      );
      expect(commit).not.toHaveBeenCalled();
      expect(view.rows.value[0]).toBe(original);
    });
  }
  it("commits once for Enter followed by blur and keeps the authoritative row after async acceptance", async () => {
    const request = deferred<void>();
    const commit = vi.fn(() => request.promise);
    const view = table([editing<Row>(commit), dirtyIndicators()]);
    const input = await activate(view.host);
    await write(input, "Draft");
    key(input, "Enter");
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Draft");
    expect(view.rows.value[0]).toBe(original);
    expect(
      find(view.host, part("editable-cell")).hasAttribute("data-dirty")
    ).toBe(true);
    request.resolve();
    await tick();
    expect(view.host.textContent).toContain("Ada");
    expect(view.host.textContent).not.toContain("Draft");
  });
  it("shows failed async saves with the native rollback control and never mutates the host row", async () => {
    const request = deferred<void>();
    const error = vi.fn();
    const commit = vi.fn(() => request.promise);
    const view = table([
      editing<Row>(commit, {
        onEditError: error,
        formatEditError: () => "Offline",
        onEditRollback: vi.fn(),
      }),
    ]);
    const input = await activate(view.host);
    await write(input, "Draft");
    key(input, "Enter");
    await tick();
    request.reject(new Error("offline"));
    await tick();
    expect(find(view.host, part("edit-cell-save-error")).textContent).toBe(
      "Offline"
    );
    expect(find(view.host, part("edit-cell-undo")).tagName).toBe("BUTTON");
    expect(error).toHaveBeenCalledOnce();
    expect(view.rows.value[0]).toBe(original);
  });
  it("keeps validation errors associated with the actual editor and allows correction", async () => {
    const commit = vi.fn();
    const view = table([editing<Row>(commit)], {
      columns: [
        {
          key: "name",
          editable: true,
          validate: (value) =>
            value === "bad" ? "Use another name" : undefined,
        },
      ],
    });
    const input = await activate(view.host);
    await write(input, "bad");
    key(input, "Enter");
    await tick();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const error = find(view.host, part("edit-cell-error"));
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    expect(error.getAttribute("role")).toBe("status");
    expect(commit).not.toHaveBeenCalled();
    await write(input, "Valid");
    key(input, "Enter");
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Valid");
  });
  it("renders native checkbox/select/multiple/date/time editors with neutral value parsing", async () => {
    const cases: readonly {
      column: ColumnDef<Row>;
      value: string;
      expected: unknown;
      select?: boolean;
      multiple?: boolean;
      boolean?: boolean;
    }[] = [
      {
        column: { key: "active", editable: true, editor: "boolean" },
        value: "false",
        expected: false,
        boolean: true,
      },
      {
        column: {
          key: "name",
          editable: true,
          editor: { type: "select", options: ["Ada", "Grace"] },
        },
        value: "Grace",
        expected: "Grace",
        select: true,
      },
      {
        column: {
          key: "tags",
          editable: true,
          editor: { type: "multi-select", options: ["a", "b"] },
        },
        value: "b",
        expected: ["a", "b"],
        select: true,
        multiple: true,
      },
      {
        column: { key: "name", editable: true, editor: "date" },
        value: "2026-10-04",
        expected: "2026-10-04",
      },
      {
        column: { key: "name", editable: true, editor: "datetime" },
        value: "2026-10-04T12:30",
        expected: "2026-10-04T12:30",
      },
      {
        column: { key: "name", editable: true, editor: "time" },
        value: "12:30",
        expected: "12:30",
      },
    ];
    for (const item of cases) {
      const commit = vi.fn();
      const view = table([editing<Row>(commit)], { columns: [item.column] });
      const input = await activate(view.host);
      if (item.multiple) {
        const select = find<HTMLSelectElement>(view.host, "select[multiple]");
        for (const option of select.options) option.selected = true;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (item.boolean) {
        input.checked = false;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } else await write(input, item.value, item.select ? "change" : "input");
      await tick();
      key(input, "Enter");
      await tick();
      expect(commit).toHaveBeenCalledExactlyOnceWith(
        original,
        item.column.key,
        item.expected
      );
      view.stop();
    }
  });
  it("hands a custom Vue editor the binding-owned focus, validation and commit contract", async () => {
    const commit = vi.fn();
    const view = table([editing<Row>(commit)], {
      columns: [
        {
          key: "name",
          editable: true,
          editor: {
            type: "custom",
            render: (control: CustomCellEditorCtrl) =>
              h("input", {
                "data-custom": "",
                value: control.draft,
                "aria-label": control.label,
                ref: (element: unknown) =>
                  control.focusRef(
                    element instanceof HTMLElement ? element : null
                  ),
                onInput: (event: Event) => {
                  if (event.target instanceof HTMLInputElement)
                    control.setDraft(event.target.value);
                },
                onKeydown: control.onKeyDown,
                onBlur: control.onBlur,
              }),
          },
        },
      ],
    });
    const button = find(view.host, part("edit-cell-activate"));
    key(button, "Enter");
    await tick();
    const input = find<HTMLInputElement>(view.host, "input[data-custom]");
    expect(document.activeElement).toBe(input);
    await write(input, "Custom");
    key(input, "Enter");
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Custom");
  });
  it("row Save remains pending exactly once, keeps rejected drafts and cancels explicitly", async () => {
    const request = deferred<void>();
    const commit = vi.fn(() => request.promise);
    const view = table([
      rowEditing<Row>(commit, { formatEditError: () => "Row failed" }),
    ]);
    await click(view.host, "row-edit-begin");
    const input = find<HTMLInputElement>(view.host, part("edit-cell-input"));
    expect(document.activeElement).toBe(input);
    await write(input, "Row draft");
    await click(view.host, "row-edit-save");
    find(view.host, part("row-edit-save")).click();
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, {
      name: "Row draft",
    });
    expect(
      find<HTMLButtonElement>(view.host, part("row-edit-save")).disabled
    ).toBe(true);
    request.reject(new Error("offline"));
    await tick();
    expect(find(view.host, part("row-edit-error")).textContent).toBe(
      "Row failed"
    );
    expect(
      find<HTMLInputElement>(view.host, part("edit-cell-input")).value
    ).toBe("Row draft");
    expect(view.rows.value[0]).toBe(original);
    await click(view.host, "row-edit-cancel");
    expect(view.host.querySelector(part("edit-cell-input"))).toBeNull();
  });
  it("batch editing stages all cells and only explicit Save submits the patch", async () => {
    const request = deferred<void>();
    const commit = vi.fn(() => request.promise);
    const view = table([batchEditing<Row>(commit)]);
    const input = find<HTMLInputElement>(view.host, part("edit-cell-input"));
    await write(input, "Batch draft");
    key(input, "Enter");
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(commit).not.toHaveBeenCalled();
    await click(view.host, "batch-edit-save");
    find(view.host, part("batch-edit-save")).click();
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith([
      { row: original, rowId: "1", patch: { name: "Batch draft" } },
    ]);
    expect(
      find<HTMLButtonElement>(view.host, part("batch-edit-save")).disabled
    ).toBe(true);
    expect(
      find(view.host, part("batch-edit-progress")).getAttribute("role")
    ).toBe("status");
    request.resolve();
    await tick();
    expect(view.host.querySelector(part("batch-edit-bar"))).toBeNull();
    expect(view.rows.value[0]).toBe(original);
  });
  it("routes history buttons through the same host callback and renders dirty markers", async () => {
    const commit = vi.fn();
    const view = table([
      editing<Row>(commit),
      editHistory(),
      undoRedoButtons(),
      dirtyIndicators(),
    ]);
    await tick();
    expect(find<HTMLButtonElement>(view.host, part("undo")).disabled).toBe(
      true
    );
    const input = await activate(view.host);
    await write(input, "Changed");
    key(input, "Enter");
    await tick();
    expect(find<HTMLButtonElement>(view.host, part("undo")).disabled).toBe(
      false
    );
    expect(
      find(view.host, part("editable-cell")).hasAttribute("data-dirty")
    ).toBe(false);
    await click(view.host, "undo");
    expect(commit).toHaveBeenLastCalledWith(original, "name", "Ada");
    expect(find<HTMLButtonElement>(view.host, part("redo")).disabled).toBe(
      false
    );
    await click(view.host, "redo");
    expect(commit).toHaveBeenLastCalledWith(original, "name", "Changed");
  });
  it("SSR/hydration runs no commits, preserves editor IDs and has no mismatch", async () => {
    const commit = vi.fn();
    const props: DataTableProps<Row> = {
      data: [original],
      columns: defaultColumns,
      rowKey: (row) => row.id,
      urlSync: false,
      forceMobile: false,
      features: [batchEditing<Row>(commit)],
    };
    const render = () => h(DataTable<Row>, props);
    const html = await renderToString(createSSRApp({ render }));
    const target = document.createElement("div");
    target.innerHTML = html;
    document.body.append(target);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const app = createSSRApp({ render });
    app.mount(target);
    await tick();
    expect(target.querySelectorAll(part("edit-cell-input"))).toHaveLength(2);
    expect(commit).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    app.unmount();
    target.remove();
  });
});

describe("native editing alternate controls", () => {
  it("renders history controls independently, preserving their disabled state and classes", async () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const props = shallowRef({
      onUndo: undo as (() => void) | undefined,
      onRedo: undefined as (() => void) | undefined,
      canUndo: true,
      canRedo: false,
      undoLabel: "Undo",
      redoLabel: "Redo",
      density: "comfortable" as const,
      onDensityChange: () => undefined,
      labels: resolveLabels(undefined),
    });
    const view = mountNative(() => h(NativeHistoryButtons, props.value), {
      editHistory: "history",
      undoButton: "undo",
      redoButton: "redo",
    });
    await click(view.host, "undo");
    expect(undo).toHaveBeenCalledOnce();
    props.value = {
      ...props.value,
      onUndo: undefined,
      onRedo: redo,
      canRedo: true,
    };
    await tick();
    expect(view.host.querySelector(part("undo"))).toBeNull();
    await click(view.host, "redo");
    expect(redo).toHaveBeenCalledOnce();
    expect(find(view.host, part("redo")).className).toBe("redo");
    props.value = { ...props.value, onRedo: undefined };
    await tick();
    expect(view.host.querySelector(part("edit-history"))).toBeNull();
  });
  it("honors icon suppression on native row actions and resolves host edit conflicts", async () => {
    const row = table([
      rowEditing<Row>(vi.fn(), {
        rowEditIcons: { begin: false, save: false, cancel: false },
      }),
    ]);
    await click(row.host, "row-edit-begin");
    await click(row.host, "row-edit-cancel");
    row.stop();
    const commit = vi.fn();
    const view = table([editing<Row>(commit, { editConflictPolicy: "ask" })]);
    const input = await activate(view.host);
    await write(input, "Mine");
    view.rows.value = [{ ...original, name: "Theirs" }];
    await tick();
    const take = find(view.host, part("edit-cell-take-theirs"));
    take.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );
    take.click();
    await tick();
    expect(commit).not.toHaveBeenCalled();
    expect(
      find<HTMLInputElement>(view.host, part("edit-cell-input")).value
    ).toBe("Theirs");
  });
});

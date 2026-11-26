import type {
  ColumnDef,
  ComposedFeature,
  CustomCellEditorCtrl,
} from "@adapttable/vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../src/editing";

interface Row {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", active: true, tags: ["a"] },
];
const stops: (() => void)[] = [];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
afterEach(async () => {
  for (const stop of stops.splice(0)) stop();
  await settle();
});
function table(
  features: readonly ComposedFeature<Row>[],
  columns: readonly ColumnDef<Row>[] = [{ key: "name", editable: true }],
  mobile = false
) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: rows,
        columns,
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: mobile,
        searchable: false,
        features,
        dir: "rtl",
      }),
  }).use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
function target<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
}
function key(element: HTMLElement, value: string) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
}
async function activate(root: HTMLElement) {
  await settle();
  const button = target(root, part("edit-cell-activate"));
  button.focus();
  key(button, "F2");
  await settle();
  return target<HTMLInputElement | HTMLButtonElement>(
    root,
    part("edit-cell-editor")
  );
}
async function input(element: HTMLInputElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
}

describe("Nuxt editing feature", () => {
  it.each([false, true])(
    "focuses, cancels and commits genuine editors in mobile=%s",
    async (mobile) => {
      const save = vi.fn();
      const root = table([editing<Row>(save)], undefined, mobile);
      let editor = await activate(root);
      expect(document.activeElement).toBe(editor);
      await input(editor as HTMLInputElement, "Draft");
      key(editor, "Escape");
      await settle();
      expect(save).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(
        target(root, part("edit-cell-activate"))
      );
      editor = await activate(root);
      await input(editor as HTMLInputElement, "Accepted");
      key(editor, "Enter");
      await settle();
      expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Accepted");
      expect(rows[0]?.name).toBe("Ada");
    }
  );
  it.each([
    ["text", "text"],
    ["number", "number"],
    ["date", "date"],
    ["datetime", "datetime-local"],
    ["time", "time"],
  ] as const)("uses the binding's %s input type", async (editor, type) => {
    const root = table(
      [editing<Row>(vi.fn())],
      [{ key: "name", editable: true, editor }]
    );
    expect((await activate(root)).getAttribute("type")).toBe(type);
  });
  it("keeps validation on the native input and preserves a rejected save for rollback", async () => {
    const save = vi.fn();
    const root = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          validate: (value) =>
            value === "bad" ? "Use another name" : undefined,
        },
      ]
    );
    const editor = (await activate(root)) as HTMLInputElement;
    await input(editor, "bad");
    key(editor, "Enter");
    await settle();
    expect(editor.getAttribute("aria-invalid")).toBe("true");
    expect(editor.getAttribute("aria-describedby")).toBe(
      target(root, part("edit-cell-error")).id
    );
    expect(save).not.toHaveBeenCalled();
    await input(editor, "Good");
    key(editor, "Enter");
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    const rollback = vi.fn();
    const failed = table([
      editing<Row>(() => Promise.reject(new Error("offline")), {
        formatEditError: () => "Offline",
        onEditRollback: rollback,
      }),
    ]);
    const rejected = (await activate(failed)) as HTMLInputElement;
    await input(rejected, "Draft");
    key(rejected, "Enter");
    await settle();
    expect(target(failed, part("edit-cell-save-error")).textContent).toContain(
      "Offline"
    );
    const button = target(failed, part("edit-cell-rollback"));
    button.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true })
    );
    button.click();
    await settle();
    expect(rollback).toHaveBeenCalledTimes(1);
  });
  it("leaves nested Select Escape to Nuxt and restores the activation target on the next Escape", async () => {
    const save = vi.fn();
    const root = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          editor: { type: "select", options: ["Ada", "Grace"] },
        },
      ]
    );
    const editor = await activate(root);
    expect(editor.tagName).toBe("BUTTON");
    key(editor, "ArrowDown");
    await settle();
    const popup = target(root, '[role="listbox"]');
    key(popup, "Escape");
    await settle();
    expect(root.querySelector('[role="listbox"]')).toBeNull();
    expect(root.querySelector(part("edit-cell-editor"))).toBe(editor);
    expect(save).not.toHaveBeenCalled();
    key(editor, "Escape");
    await settle();
    expect(root.querySelector(part("edit-cell-editor"))).toBeNull();
    expect(document.activeElement).toBe(
      target(root, part("edit-cell-activate"))
    );
    expect(save).not.toHaveBeenCalled();
  });
  it("selects an option without committing until the closed editor receives Enter", async () => {
    const save = vi.fn();
    const root = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          editor: { type: "select", options: ["Ada", "Grace"] },
        },
      ]
    );
    const editor = await activate(root);
    key(editor, "ArrowDown");
    await settle();
    const option = Array.from(
      root.querySelectorAll<HTMLElement>('[role="option"]')
    ).find((node) => node.textContent?.includes("Grace"));
    expect(option).toBeDefined();
    option?.focus();
    if (option) key(option, "Enter");
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(root.querySelector('[role="listbox"]')).toBeNull();
    key(editor, "Enter");
    await settle();
    expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Grace");
  });
  it("focuses the actual boolean checkbox and commits only after focus leaves", async () => {
    const save = vi.fn();
    const root = table(
      [editing<Row>(save)],
      [{ key: "active", editable: true, editor: "boolean" }]
    );
    const editor = await activate(root);
    expect(editor.getAttribute("role")).toBe("checkbox");
    expect(document.activeElement).toBe(editor);
    editor.click();
    await settle();
    expect(save).not.toHaveBeenCalled();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await settle();
    outside.remove();
    expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "active", false);
  });
  it.each(["row", "batch"] as const)(
    "uses shared %s save/cancel and history controls",
    async (mode) => {
      const save = vi.fn();
      const root = table([
        editing<Row>(vi.fn()),
        mode === "row"
          ? rowEditing<Row>(save, {
              rowEditIcons: { begin: false, save: false, cancel: false },
            })
          : batchEditing<Row>(save),
        dirtyIndicators(),
        editHistory(),
        undoRedoButtons(),
      ]);
      await settle();
      if (mode === "row") {
        target(root, part("row-edit-begin")).click();
        await settle();
      }
      const editor = target<HTMLInputElement>(root, part("edit-cell-editor"));
      await input(editor, "Staged");
      expect(save).not.toHaveBeenCalled();
      target(
        root,
        part(mode === "row" ? "row-edit-save" : "batch-edit-save")
      ).click();
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
      expect(rows[0]?.name).toBe("Ada");
    }
  );
  it("drives genuine Undo and Redo buttons through host-owned rows", async () => {
    const data = shallowRef<Row[]>([
      { id: "a", name: "Ada", active: true, tags: [] },
    ]);
    const save = vi.fn((row: Row, key: string, value: unknown) => {
      data.value = data.value.map((item) =>
        item.id === row.id ? { ...item, [key]: value } : item
      );
    });
    const root = document.createElement("div");
    document.body.append(root);
    const features = [editing<Row>(save), editHistory(), undoRedoButtons()];
    const app = createApp({
      render: () =>
        h(DataTable<Row>, {
          data: data.value,
          columns: [{ key: "name", editable: true }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: false,
          searchable: false,
          features,
        }),
    }).use(ui);
    app.mount(root);
    stops.push(() => {
      app.unmount();
      root.remove();
    });
    const editor = (await activate(root)) as HTMLInputElement;
    await input(editor, "Grace");
    key(editor, "Enter");
    await settle();
    expect(data.value[0]?.name).toBe("Grace");
    target(root, part("undo-button")).click();
    await settle();
    expect(data.value[0]?.name).toBe("Ada");
    target(root, part("redo-button")).click();
    await settle();
    expect(data.value[0]?.name).toBe("Grace");
    expect(save).toHaveBeenCalledTimes(3);
  });
  it("preserves the host custom editor's draft and native focus contract", async () => {
    const save = vi.fn();
    const root = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          editor: {
            type: "custom",
            render: (control: CustomCellEditorCtrl) =>
              h("input", {
                "data-custom-editor": "",
                value: control.draft,
                ref: (node: unknown) =>
                  control.focusRef(
                    node instanceof HTMLInputElement ? node : null
                  ),
                onInput: (event: Event) => {
                  if (event.currentTarget instanceof HTMLInputElement)
                    control.setDraft(event.currentTarget.value);
                },
                onKeydown: control.onKeyDown,
              }),
          },
        },
      ]
    );
    await settle();
    const button = target(root, part("edit-cell-activate"));
    button.focus();
    key(button, "F2");
    await settle();
    const editor = target<HTMLInputElement>(root, "[data-custom-editor]");
    expect(document.activeElement).toBe(editor);
    await input(editor, "Custom");
    key(editor, "Enter");
    await settle();
    expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Custom");
  });
});

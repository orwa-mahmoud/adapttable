import type { ColumnDef, ComposedFeature } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref } from "vue";

import DataTable from "../src/DataTable.vue";
import { batchEditing, editing, rowEditing } from "../src/editing";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
  tags: string[];
  active: boolean;
}
const data: Row[] = [{ id: "a", name: "Ada", tags: ["a"], active: true }];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
function key(target: HTMLElement, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}
function option(root: ParentNode, label: string): HTMLElement {
  const found = [...root.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (item) => item.textContent?.trim() === label
  );
  if (!found) throw new Error(`Missing ${label}`);
  return found;
}
function props(
  features: readonly ComposedFeature<Row>[],
  columns: readonly ColumnDef<Row>[] = [{ key: "name", editable: true }]
) {
  return {
    data,
    columns,
    rowKey: (row: Row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    features,
  };
}
async function activate(root: ParentNode) {
  await tick();
  const button = node<HTMLButtonElement>(root, part("edit-cell-activate"));
  button.focus();
  key(button, "F2");
  await tick();
  return node<HTMLInputElement>(
    root,
    ".adapttable-element-plus-editor-host input"
  );
}
async function input(field: HTMLInputElement, value: string) {
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}

describe("Element editing control lifetimes", () => {
  it.each(["boolean", "select"] as const)(
    "puts %s validation on the focused native field",
    async (kind) => {
      const save = vi.fn();
      const column: ColumnDef<Row> =
        kind === "boolean"
          ? {
              key: "active",
              editable: true,
              editor: "boolean",
              validate: (value) =>
                value === false ? "Keep active" : undefined,
            }
          : {
              key: "name",
              editable: true,
              editor: { type: "select", options: ["Ada", "Grace"] },
              validate: (value) =>
                value === "Grace" ? "Choose Ada" : undefined,
            };
      const view = mount(() =>
        h(DataTable<Row>, props([editing<Row>(save)], [column]))
      );
      const field = await activate(view.root);
      field.click();
      await tick();
      if (kind === "select") {
        option(view.root, "Grace").click();
        await tick();
      }
      key(field, "Enter");
      await tick();
      expect(save).not.toHaveBeenCalled();
      expect(field.getAttribute("aria-invalid")).toBe("true");
      expect(field.getAttribute("aria-describedby")).toBe(
        node<HTMLElement>(view.root, part("edit-cell-error")).id
      );
    }
  );
  it("does not commit or cancel while the native input is composing", async () => {
    const save = vi.fn();
    const view = mount(() => h(DataTable<Row>, props([editing<Row>(save)])));
    const field = await activate(view.root);
    await input(field, "Composing");
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      })
    );
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      })
    );
    await tick();
    expect(save).not.toHaveBeenCalled();
    expect(field.isConnected).toBe(true);
    key(field, "Enter");
    await tick();
    expect(save).toHaveBeenCalledExactlyOnceWith(data[0], "name", "Composing");
  });
  it("stages multiple choice without committing its popup Escape", async () => {
    const save = vi.fn();
    const view = mount(() =>
      h(
        DataTable<Row>,
        props(
          [editing<Row>(save)],
          [
            {
              key: "tags",
              editable: true,
              editor: { type: "multi-select", options: ["a", "b"] },
            },
          ]
        )
      )
    );
    const field = await activate(view.root);
    field.click();
    await tick();
    option(view.root, "b").click();
    await tick();
    expect(save).not.toHaveBeenCalled();
    key(field, "Escape");
    await tick();
    expect(field.getAttribute("aria-expanded")).toBe("false");
    expect(field.isConnected).toBe(true);
    expect(save).not.toHaveBeenCalled();
    key(field, "Enter");
    await tick();
    expect(save).toHaveBeenCalledExactlyOnceWith(data[0], "tags", ["a", "b"]);
  });
  it.each(["text", "select", "multi-select", "boolean"] as const)(
    "retires a cached %s editor and ignores detached events",
    async (kind) => {
      const active = ref(true);
      const save = vi.fn();
      const columns: Record<typeof kind, ColumnDef<Row>> = {
        text: { key: "name", editable: true },
        boolean: { key: "active", editable: true, editor: "boolean" },
        select: {
          key: "name",
          editable: true,
          editor: { type: "select", options: ["Ada", "Grace"] },
        },
        "multi-select": {
          key: "tags",
          editable: true,
          editor: { type: "multi-select", options: ["a", "b"] },
        },
      };
      const column = columns[kind];
      const features = [editing<Row>(save)];
      const view = mount(() =>
        h(KeepAlive, null, {
          default: () =>
            active.value
              ? h(DataTable<Row>, {
                  key: "table",
                  ...props(features, [column]),
                })
              : h("span"),
        })
      );
      const original = await activate(view.root);
      if (kind.includes("select")) {
        original.click();
        await tick();
        expect(original.getAttribute("aria-expanded")).toBe("true");
      }
      active.value = false;
      await tick();
      expect(original.isConnected).toBe(false);
      expect(document.querySelector(".el-select__popper")).toBeNull();
      key(original, "Enter");
      original.click();
      await tick();
      expect(save).not.toHaveBeenCalled();
      active.value = true;
      await tick();
      key(original, "Enter");
      await tick();
      expect(save).not.toHaveBeenCalled();
      const restored = node<HTMLInputElement>(
        view.root,
        ".adapttable-element-plus-editor-host input"
      );
      expect(restored).not.toBe(original);
      if (kind.includes("select"))
        expect(restored.getAttribute("aria-expanded")).toBe("false");
      restored.focus();
      key(restored, "Escape");
      await tick();
      expect(view.root.querySelector(part("edit-cell-editor"))).toBeNull();
      expect(document.activeElement).toBe(
        node(view.root, part("edit-cell-activate"))
      );
      view.unmount();
      key(original, "Enter");
      expect(save).not.toHaveBeenCalled();
    }
  );
  it.each(["row", "batch"] as const)(
    "retains a failed %s save for retry and supports cancel",
    async (mode) => {
      const save = vi
        .fn()
        .mockRejectedValueOnce(new Error("Offline"))
        .mockResolvedValueOnce(undefined);
      const features = [
        mode === "row" ? rowEditing<Row>(save) : batchEditing<Row>(save),
      ];
      const view = mount(() => h(DataTable<Row>, props(features)));
      await tick();
      if (mode === "row") {
        node<HTMLButtonElement>(view.root, part("row-edit-begin")).click();
        await tick();
      }
      const field = node<HTMLInputElement>(
        view.root,
        `input${part("edit-cell-editor")}`
      );
      await input(field, "Staged");
      node<HTMLButtonElement>(view.root, part(`${mode}-edit-save`)).click();
      await tick();
      expect(save).toHaveBeenCalledTimes(1);
      expect(view.root.textContent).toContain("Offline");
      expect(field.value).toBe("Staged");
      node<HTMLButtonElement>(view.root, part(`${mode}-edit-save`)).click();
      await tick();
      expect(save).toHaveBeenCalledTimes(2);
      if (mode === "row") {
        node<HTMLButtonElement>(view.root, part("row-edit-begin")).click();
        await tick();
      }
      const next = node<HTMLInputElement>(
        view.root,
        `input${part("edit-cell-editor")}`
      );
      await input(next, "Discard");
      node<HTMLButtonElement>(view.root, part(`${mode}-edit-cancel`)).click();
      await tick();
      expect(save).toHaveBeenCalledTimes(2);
      expect(data[0]?.name).toBe("Ada");
    }
  );
});

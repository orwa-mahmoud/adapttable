import type { CustomCellEditorCtrl } from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { shadcnInput } from "../src/controls";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../src/editing";
import {
  activate,
  deferred,
  find,
  key,
  mountFeatures,
  original,
  part,
  type Row,
  tick,
  write,
} from "./feature-helpers";

afterEach(() => vi.restoreAllMocks());
describe("shadcn editing feature fills", () => {
  it.each([
    ["text", "text"],
    ["number", "number"],
    ["date", "date"],
    ["datetime", "datetime-local"],
    ["time", "time"],
  ] as const)(
    "maps canonical %s editors to the real input and receives focus",
    async (editor, type) => {
      const commit = vi.fn();
      const view = mountFeatures([editing<Row>(commit)], {
        columns: [{ key: "name", editable: true, editor }],
      });
      const input = await activate(view.root);
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect(input.getAttribute("type")).toBe(type);
      expect(input.dataset.slot).toBe("input");
      expect(document.activeElement).toBe(input);
      expect(commit).not.toHaveBeenCalled();
    }
  );
  it.each([false, true])(
    "restores the visible activation control after Escape without writing (mobile=%s)",
    async (forceMobile) => {
      const commit = vi.fn();
      const view = mountFeatures([editing<Row>(commit)], { forceMobile });
      const input = await activate(view.root);
      await write(
        find<HTMLInputElement>(view.root, part("edit-cell-editor")),
        "Draft"
      );
      key(input, "Escape");
      await tick();
      expect(view.root.querySelector(part("edit-cell-editor"))).toBeNull();
      expect(commit).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(
        find(view.root, part("edit-cell-activate"))
      );
      expect(view.rows.value[0]).toBe(original);
    }
  );
  it("commits once across Enter/blur and leaves accepted data ownership with the host", async () => {
    const request = deferred();
    const commit = vi.fn(() => request.promise);
    const view = mountFeatures([editing<Row>(commit), dirtyIndicators()]);
    const input = await activate(view.root);
    await write(
      find<HTMLInputElement>(view.root, part("edit-cell-editor")),
      "Draft"
    );
    key(input, "Enter");
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Draft");
    expect(view.rows.value[0]).toBe(original);
    request.resolve();
    await tick();
    expect(view.root.textContent).toContain("Ada");
    expect(view.root.textContent).not.toContain("Draft");
  });
  it("uses the real checkbox model for boolean drafts", async () => {
    const commit = vi.fn();
    const view = mountFeatures([editing<Row>(commit)], {
      columns: [{ key: "active", editable: true, editor: "boolean" }],
    });
    const checkbox = await activate(view.root);
    expect(checkbox.dataset.slot).toBe("checkbox");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    checkbox.click();
    await tick();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    key(checkbox, "Enter");
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "active", false);
  });
  it("renders controlled single/multiple registry selects and keeps keyboard commit on the semantic target", async () => {
    const commit = vi.fn();
    const view = mountFeatures([editing<Row>(commit)], {
      columns: [
        {
          key: "tags",
          editable: true,
          editor: {
            type: "multi-select",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
          },
        },
      ],
    });
    const select = await activate(view.root);
    expect(select).toBeInstanceOf(HTMLSelectElement);
    expect(select.dataset.slot).toBe("native-select");
    const actual = find<HTMLSelectElement>(view.root, part("edit-cell-editor"));
    expect(actual.multiple).toBe(true);
    expect(actual.options[0]?.selected).toBe(true);
    for (const option of actual.options) option.selected = true;
    actual.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();
    expect(
      Array.from(actual.selectedOptions, (option) => option.value)
    ).toEqual(["a", "b"]);
    key(actual, "Enter");
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "tags", [
      "a",
      "b",
    ]);
    view.stop();
    const single = mountFeatures([editing<Row>(commit)], {
      columns: [
        {
          key: "name",
          editable: true,
          editor: {
            type: "select",
            options: [
              { value: "Ada", label: "Ada" },
              { value: "Bea", label: "Bea" },
            ],
          },
        },
      ],
    });
    await activate(single.root);
    const input = find<HTMLSelectElement>(
      single.root,
      part("edit-cell-editor")
    );
    input.value = "Bea";
    input.dispatchEvent(new Event("change"));
    await tick();
    key(input, "Enter");
    await tick();
    expect(commit).toHaveBeenLastCalledWith(original, "name", "Bea");
  });
  it("presents save failures and a genuine rollback action", async () => {
    const request = deferred();
    const view = mountFeatures([
      editing<Row>(() => request.promise, {
        formatEditError: () => "Offline",
        onEditRollback: () => undefined,
      }),
    ]);
    const input = await activate(view.root);
    await write(
      find<HTMLInputElement>(view.root, part("edit-cell-editor")),
      "Draft"
    );
    key(input, "Enter");
    await tick();
    request.reject(new Error("offline"));
    await tick();
    expect(view.root.textContent).toContain("Offline");
    const rollback = find<HTMLButtonElement>(
      view.root,
      part("edit-cell-rollback")
    );
    expect(rollback.dataset.slot).toBe("button");
    rollback.click();
    await tick();
    expect(view.root.querySelector(part("edit-cell-save-error"))).toBeNull();
    expect(view.rows.value[0]).toBe(original);
  });
  it("saves row drafts only through the explicit row button", async () => {
    const commit = vi.fn();
    const view = mountFeatures([rowEditing<Row>(commit)]);
    const begin = find<HTMLButtonElement>(view.root, part("row-edit-begin"));
    expect(begin.dataset.slot).toBe("button");
    begin.click();
    await tick();
    const input = find<HTMLInputElement>(view.root, part("edit-cell-editor"));
    await write(input, "Row draft");
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(commit).not.toHaveBeenCalled();
    find<HTMLButtonElement>(view.root, part("row-edit-save")).click();
    await tick();
    expect(commit).toHaveBeenCalledOnce();
    expect(view.rows.value[0]).toBe(original);
  });
  it("stages batch edits and deduplicates repeated save requests while pending", async () => {
    const request = deferred();
    const commit = vi.fn(() => request.promise);
    const view = mountFeatures([batchEditing<Row>(commit)]);
    const input = find<HTMLInputElement>(view.root, part("edit-cell-editor"));
    await write(input, "Batch draft");
    key(input, "Enter");
    input.dispatchEvent(new Event("blur"));
    await tick();
    expect(commit).not.toHaveBeenCalled();
    const save = find<HTMLButtonElement>(view.root, part("batch-edit-save"));
    expect(save.dataset.slot).toBe("button");
    save.click();
    save.click();
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith([
      { row: original, rowId: "a", patch: { name: "Batch draft" } },
    ]);
    expect(save.disabled).toBe(true);
    request.resolve();
    await tick();
    expect(view.root.querySelector(part("batch-edit-bar"))).toBeNull();
  });
  it("routes undo/redo through the original host callback", async () => {
    const commit = vi.fn();
    const view = mountFeatures([
      editing<Row>(commit),
      editHistory(),
      undoRedoButtons(),
    ]);
    const input = await activate(view.root);
    await write(
      find<HTMLInputElement>(view.root, part("edit-cell-editor")),
      "Changed"
    );
    key(input, "Enter");
    await tick();
    const undo = find<HTMLButtonElement>(view.root, part("undo-button"));
    expect(undo.dataset.slot).toBe("button");
    undo.click();
    await tick();
    expect(commit).toHaveBeenLastCalledWith(original, "name", "Ada");
    find<HTMLButtonElement>(view.root, part("redo-button")).click();
    await tick();
    expect(commit).toHaveBeenLastCalledWith(original, "name", "Changed");
  });
  it("forwards custom Vue editor controls and retires retained callbacks", async () => {
    let retained: CustomCellEditorCtrl | undefined;
    const commit = vi.fn();
    const view = mountFeatures([editing<Row>(commit)], {
      columns: [
        {
          key: "name",
          editable: true,
          editor: {
            type: "custom",
            render: (control: CustomCellEditorCtrl) => {
              retained = control;
              return shadcnInput({
                attrs: {
                  "data-custom-editor": "",
                  "aria-label": control.label,
                  ref: control.focusRef,
                  onKeydown: control.onKeyDown,
                  onBlur: control.onBlur,
                },
                value: control.draft,
                onChange: control.setDraft,
              });
            },
          },
        },
      ],
    });
    const button = find<HTMLElement>(view.root, part("edit-cell-activate"));
    key(button, "F2");
    await tick();
    const input = find<HTMLInputElement>(view.root, "[data-custom-editor]");
    expect(document.activeElement).toBe(input);
    await write(input, "Custom");
    key(input, "Enter");
    await tick();
    expect(commit).toHaveBeenCalledExactlyOnceWith(original, "name", "Custom");
    view.stop();
    retained?.setDraft("stale");
    retained?.commit();
    await tick();
    expect(commit).toHaveBeenCalledOnce();
  });

  it("hydrates pre-mounted batch editor targets without commits or mismatches", async () => {
    const commit = vi.fn();
    const render = () =>
      h(DataTable<Row>, {
        data: [original],
        columns: [{ key: "name", editable: true }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features: [batchEditing<Row>(commit)],
      });
    const root = document.createElement("div");
    root.innerHTML = await renderToString(createSSRApp({ render }));
    document.body.append(root);
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const app = createSSRApp({ render });
    app.mount(root);
    await tick();
    expect(find(root, part("edit-cell-editor")).getAttribute("data-slot")).toBe(
      "input"
    );
    expect(commit).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    app.unmount();
    root.remove();
  });
});

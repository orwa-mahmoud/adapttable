import type { ColumnDef, DataTableHandle } from "@adapttable/vue";
import type { ComposedFeature } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, KeepAlive, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { provideClassNames } from "../src/classNamesContext";
import { batchEditing, editing, rowEditing } from "../src/editing";
import { filters } from "../src/filters";
import { NativeFilterSurface } from "../src/filters/NativeFilterSurface";
import { headerFilters } from "../src/header-filters";
import { tree } from "../src/tree";
import {
  click,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";
interface Row {
  id: string;
  name: string;
  children?: readonly Row[];
}
const child: Row = { id: "c", name: "Child" };
const parent: Row = { id: "p", name: "Parent", children: [child] };
const columns: readonly ColumnDef<Row>[] = [{ key: "name", editable: true }];
const rowKey = (row: Row) => row.id;
const nestedTree = () =>
  tree<Row>({ getChildren: (row) => row.children, defaultExpandedIds: ["p"] });
function setup(
  features: readonly ComposedFeature<Row>[],
  selectedIds?: readonly string[]
) {
  const rows = shallowRef<readonly Row[]>([parent]);
  const selection = shallowRef(selectedIds);
  const changes = vi.fn();
  const currentFeatures = shallowRef(features);
  const handle = shallowRef<DataTableHandle<Row> | null>(null);
  const mounted = mountNative(() =>
    h(DataTable<Row>, {
      ref: handle,
      data: rows.value,
      columns,
      rowKey,
      urlSync: false,
      selectable: true,
      selectedIds: selection.value,
      "onUpdate:selectedIds": changes,
      features: currentFeatures.value,
    })
  );
  return { ...mounted, rows, selection, changes, handle, currentFeatures };
}
async function activate(root: ParentNode) {
  find(root, part("edit-cell-activate")).dispatchEvent(
    new MouseEvent("dblclick", { bubbles: true })
  );
  await tick();
  return find<HTMLInputElement>(root, part("edit-cell-editor"));
}
describe("composed hierarchy, editing and selection", () => {
  it("edits a nested child and moves Tab in the visible hierarchy order", async () => {
    const save = vi.fn();
    const view = setup([nestedTree(), editing<Row>(save)]);
    await tick();
    const parentRow = find(view.host, '[data-row-id="p"]');
    const input = await activate(parentRow);
    await write(input, "Changed parent");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true })
    );
    await tick();
    const childRow = find(view.host, '[data-row-id="c"]');
    const childInput = find<HTMLInputElement>(
      childRow,
      part("edit-cell-editor")
    );
    expect(document.activeElement).toBe(childInput);
    await write(childInput, "Changed child");
    childInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await tick();
    expect(save.mock.calls).toEqual([
      [parent, "name", "Changed parent"],
      [child, "name", "Changed child"],
    ]);
    expect(child.name).toBe("Child");
  });
  it.each(["row", "batch"] as const)(
    "saves a nested child through %s editing",
    async (unit) => {
      const save = vi.fn();
      const feature =
        unit === "row" ? rowEditing<Row>(save) : batchEditing<Row>(save);
      const view = setup([nestedTree(), feature]);
      await tick();
      const childRow = find(view.host, '[data-row-id="c"]');
      if (unit === "row") await click(childRow, "row-edit-begin");
      await write(find(childRow, part("edit-cell-editor")), "Nested draft");
      await click(
        unit === "row" ? childRow : view.host,
        unit === "row" ? "row-edit-save" : "batch-edit-save"
      );
      if (unit === "row")
        expect(save).toHaveBeenCalledExactlyOnceWith(child, {
          name: "Nested draft",
        });
      else
        expect(save).toHaveBeenCalledExactlyOnceWith([
          { row: child, rowId: "c", patch: { name: "Nested draft" } },
        ]);
    }
  );
  it("selects visible child rows, preserves off-page ids and honors rejected controlled requests", async () => {
    const view = setup([nestedTree()], ["offpage"]);
    await tick();
    const header = find<HTMLInputElement>(
      view.host,
      "thead input[type=checkbox]"
    );
    header.click();
    await tick();
    expect(view.changes).toHaveBeenCalledExactlyOnceWith(["offpage", "p", "c"]);
    expect(
      find<HTMLInputElement>(
        view.host,
        '[data-row-id="c"] input[type=checkbox]'
      ).checked
    ).toBe(false);
    view.selection.value = ["offpage", "p", "c"];
    await tick();
    expect(header.checked).toBe(true);
    find(view.host, '[data-row-id="p"] ' + part("tree-toggle")).click();
    await tick();
    header.click();
    await tick();
    expect(view.changes).toHaveBeenLastCalledWith(["offpage", "c"]);
    view.selection.value = ["offpage", "c"];
    await tick();
    expect(header.checked).toBe(false);
    expect(header.indeterminate).toBe(false);
  });
  it("keeps a collapsed loaded child edit alive and discards an actually removed child", async () => {
    const save = vi.fn();
    const view = setup([nestedTree(), editing<Row>(save)]);
    await tick();
    const input = await activate(find(view.host, '[data-row-id="c"]'));
    await write(input, "Kept draft");
    find(view.host, '[data-row-id="p"] ' + part("tree-toggle")).click();
    await tick();
    expect(view.host.querySelector('[data-row-id="c"]')).toBeNull();
    find(view.host, '[data-row-id="p"] ' + part("tree-toggle")).click();
    await tick();
    expect(
      find<HTMLInputElement>(
        view.host,
        '[data-row-id="c"] ' + part("edit-cell-editor")
      ).value
    ).toBe("Kept draft");
    view.rows.value = [{ ...parent, children: [] }];
    await tick();
    view.rows.value = [parent];
    await tick();
    expect(
      view.host.querySelector('[data-row-id="c"] ' + part("edit-cell-editor"))
    ).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
  it("admits host-loaded child rows and retracts the inventory after tree replacement", async () => {
    const save = vi.fn();
    const editingFeature = editing<Row>(save);
    const view = setup([nestedTree(), editingFeature]);
    view.rows.value = [{ id: "p", name: "Parent" }];
    await tick();
    view.rows.value = [parent];
    await tick();
    await activate(find(view.host, '[data-row-id="c"]'));
    view.currentFeatures.value = [editingFeature];
    await tick();
    expect(view.host.querySelector('[data-row-id="c"]')).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });
});
describe("native surfaces across KeepAlive", () => {
  it.each(["popover", "drawer", "header"] as const)(
    "suspends %s native state, listeners and focus, then resumes the same table",
    async (mode) => {
      const showing = shallowRef(true);
      let setups = 0;
      const Table = defineComponent({
        setup() {
          setups++;
          return () =>
            h(DataTable<Row>, {
              data: [child],
              columns,
              rowKey,
              urlSync: false,
              classNames: {
                filtersPopover: "consumer-flex",
                filtersDrawer: "consumer-flex",
              },
              features:
                mode === "header"
                  ? [
                      filters<Row>([{ key: "name", type: "text" }]),
                      headerFilters(),
                    ]
                  : [filters<Row>([{ key: "name", type: "text" }], { mode })],
            });
        },
      });
      const Other = defineComponent(
        () => () => h("button", { id: "other-focus" }, "Other")
      );
      const style = document.createElement("style");
      style.textContent = ".consumer-flex { display: flex !important; }";
      document.head.append(style);
      const view = mountNative(() =>
        h(KeepAlive, null, {
          default: () => (showing.value ? h(Table) : h(Other)),
        })
      );
      await tick();
      await click(
        view.host,
        mode === "header" ? "filter-header-trigger" : "filters-button"
      );
      const surfacePart = {
        header: "filter-header-popover",
        drawer: "filters-panel",
        popover: "filters-popover",
      }[mode];
      const surface = find(document.body, part(surfacePart));
      expect(surface.hasAttribute("open")).toBe(true);
      showing.value = false;
      await tick();
      const other = find(view.host, "#other-focus");
      other.focus();
      expect(surface.hasAttribute("open")).toBe(false);
      if (surface.isConnected) {
        expect(surface.hidden).toBe(true);
        expect(surface.hasAttribute("inert")).toBe(true);
        expect(getComputedStyle(surface).display).toBe("none");
      }
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      expect(document.activeElement).toBe(other);
      showing.value = true;
      await tick();
      expect(setups).toBe(1);
      if (mode !== "header") {
        expect(surface.hasAttribute("open")).toBe(true);
        expect(surface.hidden).toBe(false);
      } else
        expect(
          document.body.querySelector(part("filter-header-popover"))
        ).toBeNull();
      view.stop();
      expect(document.body.querySelector('[role="dialog"]')).toBeNull();
      style.remove();
    }
  );
  it("preserves controlled open while inactive and restores visibility without an unsolicited close", async () => {
    const showing = shallowRef(true);
    const close = vi.fn();
    const Panel = defineComponent(
      () => () =>
        h(NativeFilterSurface, {
          open: true,
          modal: false,
          label: "Filters",
          dir: "ltr",
          anchor: null,
          children: h("button", "Option"),
          onClose: close,
        })
    );
    const Other = defineComponent(() => () => h("div", "Other"));
    const view = mountNative(() =>
      h(KeepAlive, null, {
        default: () => (showing.value ? h(Panel) : h(Other)),
      })
    );
    await tick();
    const surface = find(document.body, part("filters-popover"));
    showing.value = false;
    await tick();
    expect(surface.hasAttribute("open")).toBe(false);
    expect(close).not.toHaveBeenCalled();
    showing.value = true;
    await tick();
    expect(surface.hasAttribute("open")).toBe(true);
    expect(close).not.toHaveBeenCalled();
    view.stop();
  });
  it("renders no teleported popup during SSR", async () => {
    const close = vi.fn();
    const App = defineComponent({
      setup() {
        provideClassNames(() => ({}));
        return () =>
          h(NativeFilterSurface, {
            open: true,
            modal: true,
            label: "Filters",
            dir: "ltr",
            anchor: null,
            children: "Child",
            onClose: close,
          });
      },
    });
    const html = await renderToString(createSSRApp(App));
    expect(html).not.toContain("dialog");
    expect(close).not.toHaveBeenCalled();
  });
});

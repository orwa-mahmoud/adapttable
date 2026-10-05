import { useRowSelection } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { editing } from "@adapttable/vue-unstyled/editing";
import { filters } from "@adapttable/vue-unstyled/filters";
import { describe, expect, it, vi } from "vitest";
import { createApp, effectScope, h, nextTick, shallowRef, version } from "vue";

interface Row {
  id: string;
  name: string;
}
const tick = async () => {
  await nextTick();
  await nextTick();
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function button(host: ParentNode, name: string) {
  const value = host.querySelector<HTMLButtonElement>(part(name));
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

describe("built native packages at the minimum Vue runtime", () => {
  it("keeps the editor identity, draft and focus and renders optional filters", async () => {
    expect(version).toBe(process.env.ADAPTTABLE_VUE_PEER_VERSION);
    const host = document.createElement("div");
    document.body.append(host);
    const commit = vi.fn();
    const columns = shallowRef([
      { key: "name", header: "Name", editable: true },
    ]);
    const features = [
      editing<Row>(commit),
      filters<Row>([{ key: "name", type: "text" }]),
    ];
    const rows: readonly Row[] = [{ id: "1", name: "Ada" }];
    const app = createApp({
      setup: () => () =>
        h(DataTable<Row>, {
          data: rows,
          columns: columns.value,
          rowKey: (row: Row) => row.id,
          urlSync: false,
          features,
        }),
    });
    app.mount(host);
    try {
      const activate = button(host, "edit-cell-activate");
      activate.focus();
      activate.dispatchEvent(
        new KeyboardEvent("keydown", { key: "F2", bubbles: true })
      );
      await tick();
      const editor = host.querySelector<HTMLInputElement>(
        'td[data-column-key="name"] input'
      );
      if (!editor) throw new Error("Missing built editor");
      editor.value = "Draft";
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      columns.value = [{ ...columns.value[0]!, header: "Renamed" }];
      await tick();
      expect(host.querySelector('td[data-column-key="name"] input')).toBe(
        editor
      );
      expect(editor.value).toBe("Draft");
      expect(document.activeElement).toBe(editor);
      expect(commit).not.toHaveBeenCalled();
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      await tick();
      const trigger = button(host, "filters-button");
      trigger.click();
      await tick();
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      const surface = document.body.querySelector(part("filters-popover"));
      expect(surface?.querySelector(part("filter-input"))).toBeTruthy();
      expect(commit).not.toHaveBeenCalled();
    } finally {
      app.unmount();
      host.remove();
    }
  });
});

it("keeps equivalent selection owners live and retires replaced rows and disposed scopes", () => {
  const scope = effectScope();
  const row = { id: "1", name: "Ada" };
  const rows = shallowRef([row]);
  const selected = scope.run(() =>
    useRowSelection({ rows, rowKey: (value) => value.id })
  );
  if (!selected) throw new Error("Missing selection scope");
  try {
    const original = selected.rowCheckboxAttrs("1");
    rows.value = [...rows.value];
    original.onChange();
    expect([...selected.selectedIds.value]).toEqual(["1"]);
    original.onChange();
    expect([...selected.selectedIds.value]).toEqual([]);
    rows.value = [{ ...row }];
    original.onChange();
    expect([...selected.selectedIds.value]).toEqual([]);
    const live = selected.rowCheckboxAttrs("1");
    live.onChange();
    expect([...selected.selectedIds.value]).toEqual(["1"]);
    scope.stop();
    live.onChange();
    expect([...selected.selectedIds.value]).toEqual(["1"]);
  } finally {
    scope.stop();
  }
});

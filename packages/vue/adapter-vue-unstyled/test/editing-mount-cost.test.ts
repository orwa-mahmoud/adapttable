import type * as BindingEditing from "@adapttable/vue/editing";
import { describe, expect, it, vi } from "vitest";
import { h, shallowRef } from "vue";

const mounts = vi.hoisted(() => vi.fn());
vi.mock("@adapttable/vue/editing", async (load) => {
  const actual = await load<typeof BindingEditing>();
  return {
    ...actual,
    useEditableCellModel: (
      input: Parameters<typeof actual.useEditableCellModel>[0]
    ) => {
      mounts();
      return actual.useEditableCellModel(input);
    },
  };
});
import { DataTable } from "../src";
import { editing } from "../src/editing";
import { find, mountNative, part, tick } from "./filter-editing-helpers";

interface Row {
  id: string;
  value: string;
}
describe("optional per-cell editor ownership", () => {
  it("creates scoped editor models only for editable cells and follows reactive eligibility", async () => {
    mounts.mockClear();
    const enabled = shallowRef(true);
    const data = Array.from({ length: 50 }, (_, index) => ({
      id: String(index),
      value: `Value ${index}`,
    }));
    const columns = [
      ...Array.from({ length: 10 }, (_, index) => ({
        key: `read-${index}`,
        accessor: (row: Row) => row.value,
      })),
      { key: "value", editable: () => enabled.value },
    ];
    const onEdit = vi.fn();
    const features = [editing<Row>(onEdit)];
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        data,
        columns,
        rowKey: (row: Row) => row.id,
        urlSync: false,
        defaults: { limit: 50 },
        features,
      })
    );
    await tick();
    expect(host.querySelectorAll("tbody td[data-column-key]")).toHaveLength(
      550
    );
    expect(mounts).toHaveBeenCalledTimes(50);
    expect(host.querySelectorAll(part("edit-cell-activate"))).toHaveLength(50);
    const retired = find(host, part("edit-cell-activate"));
    enabled.value = false;
    await tick();
    expect(host.querySelectorAll(part("edit-cell-activate"))).toHaveLength(0);
    expect(mounts).toHaveBeenCalledTimes(50);
    expect(find(host, 'td[data-column-key="value"]').textContent).toBe(
      "Value 0"
    );
    retired.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    enabled.value = true;
    await tick();
    expect(host.querySelectorAll(part("edit-cell-activate"))).toHaveLength(50);
    expect(mounts).toHaveBeenCalledTimes(100);
    expect(onEdit).not.toHaveBeenCalled();
  });
});

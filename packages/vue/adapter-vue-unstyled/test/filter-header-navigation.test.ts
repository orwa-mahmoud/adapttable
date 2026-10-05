import { type FilterFormSource, resolveLabels } from "@adapttable/vue/adapter";
import { expect, it, vi } from "vitest";
import { h } from "vue";

import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { FilterHeaderControl } from "../src/header-filters";
import { find, mountNative, tick } from "./filter-editing-helpers";

it("opening a native header disclosure does not select its data column", async () => {
  interface Row {
    id: string;
    name: string;
  }
  const range = vi.fn();
  const source: FilterFormSource<Row> = {
    extra: {},
    setExtra: vi.fn(),
    setExtras: vi.fn(),
  };
  const view = mountNative(() =>
    h(DataTable<Row>, {
      data: [
        { id: "1", name: "Ada" },
        { id: "2", name: "Grace" },
      ],
      rowKey: (row) => row.id,
      urlSync: false,
      columns: [
        {
          key: "name",
          sortable: false,
          headerCell: () =>
            h(FilterHeaderControl<Row>, {
              def: {
                key: "name",
                type: "multiSelect",
                options: [{ value: "Ada", label: "Ada" }],
              },
              source,
              labels: resolveLabels(undefined),
            }),
        },
      ],
      features: [cellNavigation({ onRangeChange: range })],
    })
  );
  await tick();
  const baseline = range.mock.calls.map(([value]) => value);
  expect(baseline.every((value) => value === null)).toBe(true);
  const summary = find<HTMLElement>(view.host, "summary");
  summary.click();
  await tick();
  expect(find<HTMLDetailsElement>(view.host, "details").open).toBe(true);
  expect(range.mock.calls.map(([value]) => value)).toEqual(baseline);
  summary.focus();
  const arrow = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    bubbles: true,
    cancelable: true,
  });
  summary.dispatchEvent(arrow);
  expect(arrow.defaultPrevented).toBe(false);
  expect(document.activeElement).toBe(summary);
  expect(range.mock.calls.map(([value]) => value)).toEqual(baseline);
});

it("changing a compact header checkbox through its label does not select its data column", async () => {
  interface Row {
    id: string;
    name: string;
  }
  const range = vi.fn();
  const write = vi.fn();
  const source: FilterFormSource<Row> = {
    extra: {},
    setExtra: write,
    setExtras: vi.fn(),
  };
  const view = mountNative(() =>
    h(DataTable<Row>, {
      data: [
        { id: "1", name: "Ada" },
        { id: "2", name: "Grace" },
      ],
      rowKey: (row) => row.id,
      urlSync: false,
      columns: [
        {
          key: "name",
          sortable: false,
          headerCell: () =>
            h(FilterHeaderControl<Row>, {
              def: {
                key: "name",
                type: "multiSelect",
                options: [{ value: "Ada", label: "Ada" }],
              },
              source,
              labels: resolveLabels(undefined),
            }),
        },
      ],
      features: [cellNavigation({ onRangeChange: range })],
    })
  );
  await tick();
  const baseline = range.mock.calls.map(([value]) => value);
  expect(baseline.every((value) => value === null)).toBe(true);
  find<HTMLDetailsElement>(view.host, "details").open = true;
  find<HTMLLabelElement>(view.host, "fieldset label").click();
  await tick();
  expect(write).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
  expect(range.mock.calls.map(([value]) => value)).toEqual(baseline);
});

it.each(["summary", "label"] as const)(
  "keeps native %s activation inside a body cell independent of grid selection",
  async (target) => {
    interface Row {
      id: string;
      name: string;
    }
    const range = vi.fn();
    const changed = vi.fn();
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: [{ id: "1", name: "Ada" }],
        rowKey: (row) => row.id,
        urlSync: false,
        columns: [
          {
            key: "name",
            cell: () =>
              h("details", [
                h("summary", "Choices"),
                h("label", [
                  h("input", { type: "checkbox", onChange: changed }),
                  "Ada",
                ]),
              ]),
          },
        ],
        features: [cellNavigation({ onRangeChange: range })],
      })
    );
    await tick();
    const baseline = range.mock.calls.map(([value]) => value);
    expect(baseline.every((value) => value === null)).toBe(true);
    const details = find<HTMLDetailsElement>(view.host, "tbody details");
    if (target === "label") details.open = true;
    const control = find<HTMLElement>(details, target);
    control.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, button: 0 })
    );
    control.click();
    await tick();
    expect(details.open).toBe(true);
    if (target === "label") {
      expect(find<HTMLInputElement>(details, "input").checked).toBe(true);
      expect(changed).toHaveBeenCalledOnce();
    }
    expect(range.mock.calls.map(([value]) => value)).toEqual(baseline);
  }
);

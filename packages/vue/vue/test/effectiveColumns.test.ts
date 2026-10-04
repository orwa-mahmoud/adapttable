import type { ColumnLayoutState, Direction } from "@adapttable/core";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, effectScope, nextTick, shallowRef } from "vue";

import type { ColumnDef } from "../src/columnDef";
import { useColumnLayout } from "../src/columns/columnLayout";
import {
  DesktopTableChrome,
  MobileCardsChrome,
} from "../src/layout/tableChrome";
import { useDesktopTableModel } from "../src/layout/tableModels";
import { useFrontendData } from "../src/source/useFrontendData";
import { useDataTable } from "../src/useDataTable";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  a: string;
  b: string;
  c: string;
  d: string;
}
const data: readonly Row[] = [{ id: "one", a: "A", b: "B", c: "C", d: "D" }];
const rowKey = (row: Row): string => row.id;
const columns: readonly ColumnDef<Row>[] = [
  { key: "a", width: 100, minWidth: 80, maxWidth: 400 },
  { key: "b", width: 100 },
  { key: "c", width: 100 },
  { key: "d", width: 100 },
];
const releases: (() => void)[] = [];
afterEach(() => {
  for (const release of releases.splice(0)) release();
});

it("keeps standalone layout pin geometry reactive to resizing and visibility", () => {
  const scope = effectScope();
  releases.push(() => scope.stop());
  const layout = scope.run(() =>
    useColumnLayout(columns, {
      defaultColumnLayout: { pinned: { a: "start", b: "start" } },
    })
  );
  if (!layout) throw new Error("missing layout");
  const initial = layout.value;
  expect(layout.value.pinOffset("b")).toEqual({ side: "start", inset: 100 });
  layout.value.setWidth("a", 250);
  expect(layout.value.pinOffset("b")?.inset).toBe(250);
  layout.value.setHidden("a", true);
  expect(layout.value.isHidden("a")).toBe(true);
  expect(layout.value.pinOffset("a")).toBeUndefined();
  expect(layout.value.pinOffset("b")?.inset).toBe(0);
  expect(initial.isHidden("a")).toBe(false);
  expect(initial.pinOffset("b")?.inset).toBe(100);
});

it("preserves normalized column identities until authored columns or locale change", () => {
  const scope = effectScope();
  releases.push(() => scope.stop());
  const options = shallowRef({
    columns: [{ key: "label", i18n: { en: "a", fr: "b" } }],
    locale: "en",
    tableLabel: "People",
  });
  const table = scope.run(() => {
    const source = useFrontendData({
      data,
      columns,
      getRowId: rowKey,
      urlSync: false,
    });
    return useDataTable(() => ({ ...options.value, source, rowKey }));
  });
  if (!table) throw new Error("missing table");
  const initial = table.allColumns.value;
  const groups = table.columnGroups.value;
  expect(table.cellValue(initial[0]!, data[0]!)).toBe("A");
  options.value = { ...options.value, tableLabel: "Updated people" };
  expect(table.allColumns.value).toBe(initial);
  expect(table.columnGroups.value).toBe(groups);
  options.value = { ...options.value, locale: "fr" };
  const translated = table.allColumns.value;
  expect(translated).not.toBe(initial);
  expect(table.columnGroups.value).toBe(groups);
  expect(table.cellValue(translated[0]!, data[0]!)).toBe("B");
  options.value = { ...options.value, columns: [...options.value.columns] };
  expect(table.allColumns.value).not.toBe(translated);
});

it.each<Direction>(["ltr", "rtl"])(
  "uses the same effective widths for cells, both pin edges and the table minimum in %s",
  (dir) => {
    const scope = effectScope();
    releases.push(() => scope.stop());
    const widths = shallowRef<Readonly<Record<string, number>>>({
      a: 250,
      d: 180,
    });
    const value = scope.run(() => {
      const source = useFrontendData({
        data,
        columns,
        getRowId: rowKey,
        urlSync: false,
      });
      const table = useDataTable({
        source,
        columns,
        rowKey,
        dir,
        columnWidths: widths,
        defaultColumnLayout: {
          pinned: { a: "start", b: "start", c: "end", d: "end" },
          widths: { a: 125, d: 110 },
        },
      });
      return { table, desktop: useDesktopTableModel(table) };
    });
    if (!value) throw new Error("missing models");
    const { table, desktop } = value;
    expect(table.headerCellAttrs(table.columns.value[0]!)).toMatchObject({
      style: {
        width: "250px",
        minWidth: "80px",
        maxWidth: "400px",
        insetInlineStart: 0,
      },
    });
    expect(table.cellAttrs(table.columns.value[1]!)).toMatchObject({
      style: { insetInlineStart: "250px" },
    });
    expect(table.cellAttrs(table.columns.value[2]!)).toMatchObject({
      style: { insetInlineEnd: "180px" },
    });
    expect(table.layout.value.pinOffset("b")).toEqual({
      side: "start",
      inset: 250,
    });
    expect(table.layout.value.pinOffset("c")).toEqual({
      side: "end",
      inset: 180,
    });
    expect(desktop.value.attrs).toMatchObject({
      dir,
      style: { minWidth: "630px" },
    });
    widths.value = { a: 300, d: 200 };
    expect(table.layout.value.pinOffset("b")?.inset).toBe(300);
    expect(table.layout.value.pinOffset("c")?.inset).toBe(200);
    expect(desktop.value.attrs).toMatchObject({ style: { minWidth: "700px" } });
    expect(table.layout.value.state.widths).toEqual({ a: 125, d: 110 });
    widths.value = {};
    expect(table.layout.value.pinOffset("b")?.inset).toBe(125);
    expect(desktop.value.attrs).toMatchObject({ style: { minWidth: "435px" } });
  }
);

it("preserves controlled layout identities and order across device visibility and width updates", async () => {
  const scope = effectScope();
  releases.push(() => scope.stop());
  const forceMobile = shallowRef(false);
  const controlled = shallowRef<ColumnLayoutState>({
    hidden: ["d"],
    order: ["a", "c", "b", "d"],
    pinned: { a: "start", b: "start", c: "start", d: "end" },
    widths: { a: 250, c: 160, d: 900 },
  });
  const onColumnLayoutChange = vi.fn();
  const deviceColumns = columns.map((column) => ({
    ...column,
    hideOnDesktop: column.key === "a",
    hideOnMobile: column.key === "c",
  }));
  const value = scope.run(() => {
    const source = useFrontendData({
      data,
      columns: deviceColumns,
      getRowId: rowKey,
      urlSync: false,
    });
    const table = useDataTable({
      source,
      columns: deviceColumns,
      rowKey,
      forceMobile,
      columnLayout: controlled,
      onColumnLayoutChange,
    });
    return { table, desktop: useDesktopTableModel(table) };
  });
  if (!value) throw new Error("missing models");
  const { table, desktop } = value;
  const original = controlled.value;
  expect(table.columns.value.map((column) => column.key)).toEqual(["c", "b"]);
  expect(table.layout.value.pinOffset("a")).toBeUndefined();
  expect(table.layout.value.pinOffset("c")?.inset).toBe(0);
  expect(table.layout.value.pinOffset("b")?.inset).toBe(160);
  expect(desktop.value.attrs).toMatchObject({ style: { minWidth: "260px" } });
  forceMobile.value = true;
  expect(table.columns.value.map((column) => column.key)).toEqual(["a", "b"]);
  expect(table.layout.value.pinOffset("c")).toBeUndefined();
  expect(table.layout.value.pinOffset("b")?.inset).toBe(250);
  expect(desktop.value.attrs).toMatchObject({ style: { minWidth: "350px" } });
  expect(table.layout.value.state).toBe(original);
  table.layout.value.setWidth("a", 300);
  expect(onColumnLayoutChange).toHaveBeenCalledOnce();
  expect(table.layout.value.pinOffset("b")?.inset).toBe(250);
  await nextTick();
  controlled.value = {
    ...original,
    widths: { ...original.widths, a: 320, c: 180 },
  };
  expect(table.layout.value.pinOffset("b")?.inset).toBe(320);
  forceMobile.value = false;
  expect(table.layout.value.pinOffset("b")?.inset).toBe(180);
  expect(desktop.value.attrs).toMatchObject({ style: { minWidth: "280px" } });
  expect(table.layout.value.state).toBe(controlled.value);
  expect(table.layout.value.state.order).toEqual(["a", "c", "b", "d"]);
  expect(table.layout.value.state.hidden).toEqual(["d"]);
  expect(table.layout.value.state.widths.d).toBe(900);
  expect(onColumnLayoutChange).toHaveBeenCalledOnce();
});

it("renders live shared geometry and accessible names when switching desktop and cards", async () => {
  const forceMobile = shallowRef(false);
  const label = shallowRef("People table");
  const widths = shallowRef({ a: 250 });
  const declared = shallowRef(columns.slice(0, 2));
  const element = document.createElement("div");
  const app = createApp({
    setup() {
      const shell = useDataTableShell({
        data,
        columns: declared,
        rowKey,
        forceMobile,
        tableLabel: label,
        columnWidths: widths,
        dir: "rtl",
        urlSync: false,
        paginationMode: "paged",
        defaults: { limit: 1 },
        defaultColumnLayout: { pinned: { a: "start", b: "start" } },
      });
      const slots = { SortButton: () => null, SelectionCheckbox: () => null };
      return () =>
        forceMobile.value
          ? MobileCardsChrome({ model: shell.mobile.value, slots })
          : DesktopTableChrome({ model: shell.desktop.value, slots });
    },
  });
  app.mount(element);
  releases.push(() => app.unmount());
  const header = (key: string) =>
    element.querySelector<HTMLElement>(`th[data-column-key="${key}"]`)!;
  expect(header("a").style.width).toBe("250px");
  expect(header("b").style.insetInlineStart).toBe("250px");
  expect(element.querySelector("table")!.style.minWidth).toBe("350px");
  widths.value = { a: 300 };
  await nextTick();
  expect(header("b").style.insetInlineStart).toBe("300px");
  expect(element.querySelector("table")!.style.minWidth).toBe("400px");
  declared.value = declared.value.map((column) => ({
    ...column,
    hideOnDesktop: column.key === "a",
  }));
  await nextTick();
  expect(header("a")).toBeNull();
  expect(header("b").style.insetInlineStart).toBe("0px");
  expect(element.querySelector("table")!.style.minWidth).toBe("100px");
  forceMobile.value = true;
  await nextTick();
  const cards = element.querySelector('[role="list"]')!;
  expect(cards.getAttribute("aria-label")).toBe("People table");
  expect(cards.getAttribute("dir")).toBe("rtl");
  expect(cards.hasAttribute("aria-rowcount")).toBe(false);
  expect(cards.hasAttribute("aria-colcount")).toBe(false);
  expect(element.querySelectorAll("dd")).toHaveLength(2);
  for (const cell of element.querySelectorAll("dd")) {
    expect(cell.hasAttribute("role")).toBe(false);
    expect(cell.hasAttribute("style")).toBe(false);
  }
  label.value = "Updated people";
  await nextTick();
  expect(cards.getAttribute("aria-label")).toBe("Updated people");
  forceMobile.value = false;
  await nextTick();
  expect(element.querySelector("table")!.getAttribute("aria-label")).toBe(
    "Updated people"
  );
  expect(header("b").style.insetInlineStart).toBe("0px");
});

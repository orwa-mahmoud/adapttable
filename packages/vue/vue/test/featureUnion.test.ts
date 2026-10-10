import { type ExportRequest } from "@adapttable/core";
import { FIND_BAR, slotRender } from "@adapttable/core/binding";
import type * as VirtualCore from "@tanstack/virtual-core";
import type { VirtualizerOptions } from "@tanstack/virtual-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { EXPORT_CONTROL, EXPORT_MODEL } from "../src/actions/contracts";
import { editing } from "../src/editing";
import { exportCsv } from "../src/export-csv";
import { grouping } from "../src/features/grouping";
import { cellSpan } from "../src/features/headlessFactories";
import { rowPinning } from "../src/features/rowPinning";
import {
  type ComposedFeature,
  extendFeature,
} from "../src/features/tableFeature";
import { tree } from "../src/features/tree";
import { editableCellSlotKey } from "../src/layout/modelChannels";
import { FILL_HANDLE_CONTROL } from "../src/navigation/contracts";
import { cellNavigation, findInTable } from "../src/navigation/features";
import { virtualize } from "../src/specialized/virtualize";
import { useDataTableShell } from "../src/useDataTableShell";
const captured = vi.hoisted(() => ({
  instances: [] as VirtualCore.Virtualizer<Element | Window, Element>[],
}));
vi.mock("@tanstack/virtual-core", async (load) => {
  const actual = await load<typeof VirtualCore>();
  return {
    ...actual,
    Virtualizer: class extends actual.Virtualizer<Element | Window, Element> {
      constructor(options: VirtualizerOptions<Element | Window, Element>) {
        super(options);
        captured.instances.push(this);
      }
    },
  };
});
interface Row {
  id: string;
  name: string;
  score: number;
  team: string;
  children?: readonly Row[];
}
const scopes: ReturnType<typeof effectScope>[] = [];
const roots: HTMLElement[] = [];
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop());
  roots.splice(0).forEach((root) => root.remove());
  vi.restoreAllMocks();
  captured.instances.length = 0;
});
async function settle() {
  await nextTick();
  await nextTick();
}
function rootSurface() {
  const root = document.createElement("div");
  const box = document.createElement("div");
  box.dataset.adapttablePart = "scroll-box";
  root.append(box);
  document.body.append(root);
  roots.push(root);
  Object.defineProperties(box, {
    clientWidth: { value: 300 },
    clientHeight: { value: 160 },
    offsetWidth: { value: 300 },
    offsetHeight: { value: 160 },
  });
  box.scrollTo = vi.fn();
  return { root, box, rootElement: () => root, scrollElement: () => box };
}
function navigation() {
  return extendFeature(cellNavigation(), [
    slotRender(FILL_HANDLE_CONTROL, () => null),
  ]);
}
function find() {
  return extendFeature(findInTable(), [slotRender(FIND_BAR, () => null)]);
}
function exporter(request: (request: ExportRequest<Row>) => void) {
  return extendFeature(exportCsv<Row>({ scope: "range", request }), [
    slotRender(EXPORT_CONTROL, () => null),
  ]);
}
describe("combined projected rows, navigation, actions and body windows", () => {
  it.each(["ltr", "rtl"] as const)(
    "reveals logical rows and keyed columns with %s pins while mounted headers are windowed",
    async (dir) => {
      const data = Array.from({ length: 100 }, (_, index) => ({
        id: `r${index}`,
        name: `Name ${index}`,
        score: index,
        team: "Core",
        a: "A",
        b: "B",
        c: "C",
        end: index === 80 ? "Needle" : "End",
      }));
      const scope = effectScope();
      scopes.push(scope);
      const surface = rootSurface();
      const shell = scope.run(() =>
        useDataTableShell({
          data,
          columns: ["name", "team", "score", "a", "b", "c", "end"].map(
            (key) => ({ key })
          ),
          columnWidths: {
            name: 100,
            team: 100,
            score: 100,
            a: 100,
            b: 100,
            c: 100,
            end: 100,
          },
          defaultColumnLayout: {
            pinned: { name: "start", end: "end" },
            hidden: ["team"],
          },
          rowKey: (row) => row.id,
          dir,
          urlSync: false,
          paginationMode: "infinite",
          defaults: { limit: 100 },
          features: [
            navigation(),
            find(),
            virtualize({
              maxHeight: 160,
              virtualizeColumns: true,
              virtualOverscan: 0,
            }),
          ],
        })
      )!;
      const reveal = vi.spyOn(captured.instances[0]!, "scrollToIndex");
      shell.setSurface(surface);
      await settle();
      expect(shell.bodyRows.value.map((row) => row.key)).toEqual(
        data.map((row) => row.id)
      );
      expect(shell.desktop.value.rows.length).toBeLessThan(
        shell.bodyRows.value.length
      );
      expect(shell.table.columns.value.map((column) => column.key)).toEqual([
        "name",
        "score",
        "a",
        "b",
        "c",
        "end",
      ]);
      const end = shell.desktop.value.headers.find(
        (header) => header.key === "end"
      )!;
      expect(end.attrs["aria-colindex"]).toBe(6);
      (end.attrs.onClick as (event: MouseEvent) => void)(
        new MouseEvent("click", { ctrlKey: true })
      );
      expect(shell.gridFocus.value?.range?.anchor.col).toBe(5);
      shell.gridFocus.value?.focusCell({ row: 80, col: 4 });
      await settle();
      expect(reveal).toHaveBeenLastCalledWith(80, { align: "auto" });
      expect(surface.box.scrollLeft).toBe(dir === "rtl" ? -300 : 300);
      shell.find.value?.setOpen(true);
      shell.find.value?.setQuery("Needle");
      await settle();
      expect(shell.find.value?.current).toEqual({ row: 80, col: 5 });
      expect(shell.gridFocus.value?.active).toEqual({ row: 80, col: 5 });
      expect(reveal).toHaveBeenLastCalledWith(80, { align: "auto" });
      expect(shell.bodyRows.value).toHaveLength(100);
      const staleGrid = shell.gridFocus.value!;
      const staleFind = shell.find.value!;
      scope.stop();
      reveal.mockClear();
      staleGrid.focusCell({ row: 90, col: 4 });
      staleFind.next();
      expect(reveal).not.toHaveBeenCalled();
    }
  );
  it.each(["group", "tree"] as const)(
    "exports the complete %s projected range after hidden/spanned columns and keeps page exports on their source",
    async (mode) => {
      const child: Row = { id: "child", name: "Child", score: 99, team: "B" };
      const data: readonly Row[] = [
        {
          id: "first",
          name: "First",
          score: 1,
          team: "B",
          children: mode === "tree" ? [child] : undefined,
        },
        { id: "second", name: "Second", score: 2, team: "A" },
        { id: "third", name: "Third", score: 3, team: "B" },
      ];
      const request = vi.fn();
      const declarations = shallowRef<readonly ComposedFeature<Row>[]>([
        navigation(),
        find(),
        exporter(request),
        virtualize({ maxHeight: 160, virtualizeColumns: true }),
        cellSpan<Row>(({ row, column }) =>
          row.id === "first" && column.key === "name"
            ? { colSpan: 2 }
            : undefined
        ),
        ...(mode === "tree"
          ? [
              tree<Row>({
                getChildren: (row) => row.children,
                defaultExpandedIds: ["first"],
              }),
            ]
          : [grouping("team")]),
      ]);
      const scope = effectScope();
      scopes.push(scope);
      const shell = scope.run(() =>
        useDataTableShell<Row>({
          data,
          columns: [{ key: "team" }, { key: "name" }, { key: "score" }],
          defaultColumnLayout: { hidden: ["team"] },
          rowKey: (row) => row.id,
          urlSync: false,
          features: declarations,
        })
      )!;
      shell.setSurface(rootSurface());
      await settle();
      const projected = shell.bodyRows.value;
      expect(projected.map((row) => row.key)).not.toEqual(
        data.map((row) => row.id)
      );
      expect(
        projected
          .find((row) => row.key === "first")
          ?.cells.map((cell) => cell.key)
      ).toEqual(["name"]);
      const chosen = projected[1]!;
      shell.gridFocus.value?.selectRange({
        anchor: { row: 1, col: 0 },
        head: { row: 1, col: 1 },
      });
      shell.state.get(EXPORT_MODEL).value?.onExportCsv?.();
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({
          scope: "range",
          rows: [chosen.row],
          columns: expect.arrayContaining([
            expect.objectContaining({ key: "name" }),
            expect.objectContaining({ key: "score" }),
          ]),
        })
      );
      declarations.value = declarations.value.map((feature) =>
        feature.id === "export-csv"
          ? extendFeature(exportCsv<Row>({ scope: "page", request }), [
              slotRender(EXPORT_CONTROL, () => null),
            ])
          : feature
      );
      shell.state.get(EXPORT_MODEL).value?.onExportCsv?.();
      expect(request).toHaveBeenLastCalledWith(
        expect.objectContaining({ scope: "page", rows: data })
      );
    }
  );
  it("retains selection and an editor for loaded descendants through collapse and virtual-window replacement", async () => {
    const child: Row = { id: "child", name: "Child", score: 99, team: "B" };
    const data: readonly Row[] = [
      { id: "root", name: "Root", score: 1, team: "B", children: [child] },
    ];
    const onEdit = vi.fn();
    const scope = effectScope();
    scopes.push(scope);
    const shell = scope.run(() =>
      useDataTableShell<Row>({
        data,
        columns: [{ key: "name", editable: true }],
        rowKey: (row) => row.id,
        selectable: true,
        defaultSelectedIds: ["child"],
        urlSync: false,
        features: [
          navigation(),
          tree<Row>({
            getChildren: (row) => row.children,
            defaultExpandedIds: ["root"],
          }),
          virtualize({ maxHeight: 160 }),
          rowPinning({ pinnedRowIds: { top: ["root"], bottom: [] } }),
          extendFeature(editing<Row>(onEdit), [
            slotRender(editableCellSlotKey<Row>(), () => null),
          ]),
        ],
      })
    )!;
    shell.setSurface(rootSurface());
    await settle();
    shell.editing.value?.state.begin("child", "name", "Child", child);
    shell.editing.value?.state.setDraft("Pending");
    shell.tree.value?.expansion.toggle("root");
    await settle();
    expect(shell.rowInventory.value.loadedRows.map((row) => row.id)).toEqual([
      "root",
      "child",
    ]);
    expect(shell.bodyRows.value.map((row) => row.key)).toEqual(["root"]);
    expect(shell.selection.value?.selectedIds.value.has("child")).toBe(true);
    expect(shell.editing.value?.state.active?.rowId).toBe("child");
    expect(shell.editing.value?.state.draft).toBe("Pending");
    shell.tree.value?.expansion.toggle("root");
    await settle();
    expect(shell.bodyRows.value.map((row) => row.key)).toEqual([
      "root",
      "child",
    ]);
    expect(shell.editing.value?.state.draft).toBe("Pending");
    expect(onEdit).not.toHaveBeenCalled();
  });
});

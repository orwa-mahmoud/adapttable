import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCommandPalette } from "../actions/useCommandPalette";
import { useTableContextMenu } from "../actions/useTableContextMenu";
import { aggregate, type AggregateSpec } from "../aggregate/aggregate";
import { columnMenuActions } from "../columns/columnMenuModel";
import type { UseColumnLayoutResult } from "../columns/useColumnLayout";
import { type CellEditor, resolveCellEditor } from "../editing/cellEditing";
import { resolveExportCsv } from "../export/tableCsv";
import {
  defaultFilterRegistry,
  resolveFilterRegistry,
} from "../filters/filterBuiltins";
import {
  filterTypeDefaultOp,
  type FilterTypeSpec,
} from "../filters/filterRegistry";
import { defaultLabels } from "../labels";
import { applyFilterExtends, currentFeatureHost } from "./currentHost";
import { filterTypes } from "./factories";
import { useTableFeatures } from "./featureHost";
import {
  applyTableFeatures,
  getAppliedFeatures,
  type TableFeature,
} from "./tableFeature";

const spec = (type: string): FilterTypeSpec => ({
  type,
  widget: "text",
  ops: ["eq"],
  defaultOp: "eq",
  stateKeys: () => [],
  match: () => true,
  chips: () => ({}),
  conditionToExtra: () => ({}),
});

describe("useTableFeatures", () => {
  it("returns the same object when nothing has setup", () => {
    const incoming = { searchable: true };
    const { result } = renderHook(() => useTableFeatures(incoming));
    expect(result.current).toBe(incoming);
  });

  it("registers a filter type on the live host", () => {
    const currency = spec("currency");
    const plugin: TableFeature = {
      id: "currency-filter",
      setup(host) {
        host.registerFilterType(currency);
      },
    };
    const { result } = renderHook(() => {
      const props = useTableFeatures({ features: [plugin], extra: 1 });
      return {
        props,
        spec: applyFilterExtends(
          resolveFilterRegistry(),
          currentFeatureHost()
        ).get("currency"),
      };
    });
    expect(result.current.props).toEqual({ extra: 1 });
    expect(result.current.spec).toBe(currency);
  });

  it("does not duplicate a factory that both applies and registers", () => {
    const currency = spec("currency");
    const { result } = renderHook(() => {
      const props = useTableFeatures({
        features: [filterTypes([currency])],
      });
      const registry = applyFilterExtends(
        resolveFilterRegistry(
          (props as { filterTypes?: FilterTypeSpec[] }).filterTypes
        ),
        currentFeatureHost()
      );
      return registry.types().filter((type) => type === "currency");
    });
    expect(result.current).toEqual(["currency"]);
  });

  it("runs setup once when the adapter and the shell both call it", () => {
    const setup = vi.fn();
    const plugin: TableFeature = { id: "once", setup };
    const incoming = { features: [plugin] };
    const { result } = renderHook(() => {
      const first = useTableFeatures(incoming);
      const second = useTableFeatures(first);
      return { first, second };
    });
    expect(setup).toHaveBeenCalledTimes(1);
    expect(result.current.first).toBe(result.current.second);
  });

  it("runs setup cleanup on unmount", () => {
    const cleanup = vi.fn();
    const plugin: TableFeature = {
      id: "temp",
      setup: () => cleanup,
    };
    const { unmount } = renderHook(() =>
      useTableFeatures({ features: [plugin] })
    );
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("appends a plugin column-menu action through the same actions helper", () => {
    const plugin: TableFeature = {
      id: "freeze",
      setup(host) {
        host.registerColumnMenuAction((row) => ({
          id: "freeze",
          label: `Freeze ${row.key}`,
          disabled: false,
          run: () => undefined,
        }));
      },
    };
    const layout = {
      state: { order: ["name"], hidden: {}, pinned: {}, widths: {} },
      setOrder: vi.fn(),
      setHidden: vi.fn(),
      toggleVisible: vi.fn(),
      setPinned: vi.fn(),
      setWidth: vi.fn(),
    } as unknown as UseColumnLayoutResult<{ id: string }>;
    const { result } = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return columnMenuActions(
        {
          column: { key: "name" },
          key: "name",
          name: "Name",
          hidden: false,
          pinned: undefined,
          index: 0,
          canMove: true,
          canHide: true,
          canPin: true,
          canResize: false,
          canSort: false,
          canFilter: false,
        },
        { labels: defaultLabels, layout }
      );
    });
    expect(result.current.map((action) => action.id)).toContain("freeze");
  });

  it("resolves a registered editor name to the custom renderer", () => {
    const render = vi.fn();
    const plugin: TableFeature = {
      id: "color-editor",
      setup(host) {
        host.registerEditor("color", render);
      },
    };
    const { result } = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return resolveCellEditor({
        key: "tint",
        editable: true,
        editor: "color" as CellEditor,
      });
    });
    expect(result.current).toEqual({ type: "custom", render });
  });

  it("looks up a named aggregator from the host when the mapper runs", () => {
    const plugin: TableFeature = {
      id: "distinct",
      setup(host) {
        host.registerAggregator("distinct", (values) => values.length);
      },
    };
    const { result } = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return aggregate({ team: "distinct" } as unknown as AggregateSpec)([
        { team: "A" },
        { team: "B" },
        { team: "A" },
      ]);
    });
    expect(result.current).toEqual({ team: 3 });
  });

  it("arms the command palette from registerCommand alone", () => {
    const plugin: TableFeature = {
      id: "audit",
      setup(host) {
        host.registerCommand({
          key: "audit",
          label: "Open audit log",
          onSelect: () => undefined,
        });
      },
    };
    const { result } = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return useCommandPalette({ labels: defaultLabels });
    });
    expect(result.current.commands.map((command) => command.key)).toContain(
      "audit"
    );
  });

  it("uses a registered writer unless exportCsv is false or already has one", () => {
    const writer = { extension: "tsv", build: vi.fn() };
    const plugin: TableFeature = {
      id: "tsv",
      setup(host) {
        host.registerWriter(writer);
      },
    };
    const armed = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return resolveExportCsv(undefined);
    }).result.current;
    expect(armed?.writer).toBe(writer);

    const merged = renderHook(() => {
      const exportCsv = { filename: "out.tsv" };
      useTableFeatures({ features: [plugin], exportCsv });
      return resolveExportCsv(exportCsv);
    }).result.current;
    expect(merged).toEqual({ filename: "out.tsv", writer });

    const kept = renderHook(() => {
      const csvWriter = { extension: "csv", build: vi.fn() };
      useTableFeatures({
        features: [plugin],
        exportCsv: { writer: csvWriter },
      });
      return resolveExportCsv({ writer: csvWriter });
    }).result.current;
    expect(kept?.writer?.extension).toBe("csv");

    const off = renderHook(() => {
      useTableFeatures({ features: [plugin], exportCsv: false });
      return resolveExportCsv(false);
    }).result.current;
    expect(off).toBeNull();
  });

  it("does not force a palette or menu that the host turned off", () => {
    const plugin: TableFeature = {
      id: "audit",
      setup(host) {
        host.registerCommand({
          key: "audit",
          label: "Open audit log",
          onSelect: () => undefined,
        });
        host.registerContextMenuItems(() => [
          { key: "ping", label: "Ping", onSelect: () => undefined },
        ]);
      },
    };
    const { result } = renderHook(() => {
      const props = useTableFeatures({
        features: [plugin],
        commandPalette: false,
        contextMenu: false,
      });
      return {
        props,
        palette: useCommandPalette({
          commandPalette: false,
          labels: defaultLabels,
        }),
      };
    });
    expect(result.current.props).toEqual({
      commandPalette: false,
      contextMenu: false,
    });
    expect(result.current.palette.commands).toEqual([]);
  });

  it("appends context-menu items and side-panel tabs onto existing chrome", () => {
    const plugin: TableFeature = {
      id: "extra",
      setup(host) {
        host.registerContextMenuItems(() => [
          { key: "plugin", label: "Plugin", onSelect: () => undefined },
        ]);
        host.registerPanel({ key: "audit", label: "Audit", content: null });
      },
    };
    function Harness() {
      const contextMenu = {
        items: () => [
          { key: "host", label: "Host", onSelect: () => undefined },
        ],
      };
      const props = useTableFeatures({
        features: [plugin],
        contextMenu,
        sidePanel: {
          panels: [{ key: "filters", label: "Filters", content: null }],
          open: null,
          onOpenChange: () => undefined,
        },
      });
      const menu = useTableContextMenu({
        contextMenu,
        columns: [{ key: "name", header: "Name" }],
        labels: defaultLabels,
        rowFor: () => undefined,
        actions: {},
      });
      return (
        <div>
          <table {...menu.regionProps}>
            <thead>
              <tr>
                <th data-adapttable-part="header-cell" data-column-key="name">
                  Name
                </th>
              </tr>
            </thead>
          </table>
          <output data-testid="items">
            {menu.items.map((item) => item.key).join(",")}
          </output>
          <output data-testid="panels">
            {(
              props as { sidePanel: { panels: { key: string }[] } }
            ).sidePanel.panels
              .map((panel) => panel.key)
              .join(",")}
          </output>
        </div>
      );
    }
    render(<Harness />);
    fireEvent.contextMenu(screen.getByText("Name"), { clientX: 5, clientY: 5 });
    expect(screen.getByTestId("items").textContent).toContain("host");
    expect(screen.getByTestId("items").textContent).toContain("plugin");
    expect(screen.getByTestId("panels").textContent).toBe("filters,audit");
  });

  it("leaves a registered panel inert without a sidePanel dock", () => {
    const plugin: TableFeature = {
      id: "orphan-panel",
      setup(host) {
        host.registerPanel({ key: "audit", label: "Audit", content: null });
      },
    };
    const { result } = renderHook(() =>
      useTableFeatures({ features: [plugin], extra: 1 })
    );
    expect(result.current).toEqual({ extra: 1 });
  });

  it("applies extendFilterType patches onto a registry", () => {
    const plugin: TableFeature = {
      id: "ops",
      setup(host) {
        host.extendFilterType("text", { defaultOp: "contains" });
      },
    };
    const { result } = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return applyFilterExtends(defaultFilterRegistry, currentFeatureHost());
    });
    expect(filterTypeDefaultOp({ type: "text" }, result.current)).toBe(
      "contains"
    );
  });

  it("reuses the host when the shell calls the hook on the resolved props", () => {
    const plugin: TableFeature = {
      id: "audit",
      setup(host) {
        host.registerCommand({
          key: "audit",
          label: "Open audit log",
          onSelect: () => undefined,
        });
      },
    };
    const { result } = renderHook(() => {
      const first = useTableFeatures({ features: [plugin] });
      return { first, second: useTableFeatures(first) };
    });
    expect(result.current.second).toBe(result.current.first);
  });

  it("appends several column-menu actions from one factory", () => {
    const plugin: TableFeature = {
      id: "pair",
      setup(host) {
        host.registerColumnMenuAction(() => [
          {
            id: "a",
            label: "A",
            disabled: false,
            run: () => undefined,
          },
          {
            id: "b",
            label: "B",
            disabled: false,
            run: () => undefined,
          },
        ]);
      },
    };
    const layout = {
      state: { order: ["name"], hidden: {}, pinned: {}, widths: {} },
      setOrder: vi.fn(),
      setHidden: vi.fn(),
      toggleVisible: vi.fn(),
      setPinned: vi.fn(),
      setWidth: vi.fn(),
    } as unknown as UseColumnLayoutResult<{ id: string }>;
    const { result } = renderHook(() => {
      useTableFeatures({ features: [plugin] });
      return columnMenuActions(
        {
          column: { key: "name" },
          key: "name",
          name: "Name",
          hidden: false,
          pinned: undefined,
          index: 0,
          canMove: true,
          canHide: true,
          canPin: true,
          canResize: false,
          canSort: false,
          canFilter: false,
        },
        { labels: defaultLabels, layout }
      );
    });
    expect(result.current.map((action) => action.id)).toEqual(
      expect.arrayContaining(["a", "b"])
    );
  });

  it("merges plugin commands onto an existing palette object", () => {
    const plugin: TableFeature = {
      id: "audit",
      setup(host) {
        host.registerCommand({
          key: "audit",
          label: "Open audit log",
          onSelect: () => undefined,
        });
      },
    };
    const { result } = renderHook(() => {
      const commandPalette = { shortcuts: [] };
      useTableFeatures({ features: [plugin], commandPalette });
      return useCommandPalette({
        commandPalette,
        labels: defaultLabels,
      });
    });
    expect(result.current.commands.map((command) => command.key)).toContain(
      "audit"
    );
  });

  it("keeps an unregistered editor name as the column wrote it", () => {
    expect(
      resolveCellEditor({
        key: "tint",
        editable: true,
        editor: "color" as CellEditor,
      })
    ).toBe("color");
  });
});

describe("getAppliedFeatures", () => {
  it("remembers the list on the resolved object after stripping features", () => {
    const plugin: TableFeature = { id: "marker" };
    const resolved = applyTableFeatures({ features: [plugin], extra: 1 });
    expect(getAppliedFeatures(resolved)).toEqual([plugin]);
  });
});

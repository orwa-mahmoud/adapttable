import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { StrictMode } from "react";
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
import {
  applyFilterExtends,
  currentFeatureHost,
  type FeatureHostState,
  runWithFeatureHost,
} from "./currentHost";
import { filterTypes } from "./factories";
import { featureHostOf, useTableFeatures } from "./featureHost";
import { FeatureHostProvider, useFeatureHost } from "./featureHostContext";
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
          featureHostOf(props)
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
        featureHostOf(props)
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
    } as unknown as UseColumnLayoutResult<unknown>;
    const { result } = renderHook(() => {
      const props = useTableFeatures({ features: [plugin] });
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
        { labels: defaultLabels, layout, featureHost: featureHostOf(props) }
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
      const props = useTableFeatures({ features: [plugin] });
      return resolveCellEditor(
        {
          key: "tint",
          editable: true,
          editor: "color" as CellEditor,
        },
        featureHostOf(props)
      );
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
      const props = useTableFeatures({ features: [plugin] });
      return runWithFeatureHost(featureHostOf(props), () =>
        aggregate({ team: "distinct" } as unknown as AggregateSpec)([
          { team: "A" },
          { team: "B" },
          { team: "A" },
        ])
      );
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
      const props = useTableFeatures({ features: [plugin] });
      return useCommandPalette({
        labels: defaultLabels,
        featureHost: featureHostOf(props),
      });
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
      const props = useTableFeatures({ features: [plugin] });
      return resolveExportCsv(undefined, featureHostOf(props));
    }).result.current;
    expect(armed?.writer).toBe(writer);

    const merged = renderHook(() => {
      const exportCsv = { filename: "out.tsv" };
      const props = useTableFeatures({ features: [plugin], exportCsv });
      return resolveExportCsv(exportCsv, featureHostOf(props));
    }).result.current;
    expect(merged).toEqual({ filename: "out.tsv", writer });

    const kept = renderHook(() => {
      const csvWriter = { extension: "csv", build: vi.fn() };
      const props = useTableFeatures({
        features: [plugin],
        exportCsv: { writer: csvWriter },
      });
      return resolveExportCsv({ writer: csvWriter }, featureHostOf(props));
    }).result.current;
    expect(kept?.writer?.extension).toBe("csv");

    const off = renderHook(() => {
      const props = useTableFeatures({ features: [plugin], exportCsv: false });
      return resolveExportCsv(false, featureHostOf(props));
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
        featureHost: featureHostOf(props),
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
      const props = useTableFeatures({ features: [plugin] });
      return applyFilterExtends(defaultFilterRegistry, featureHostOf(props));
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
    } as unknown as UseColumnLayoutResult<unknown>;
    const { result } = renderHook(() => {
      const props = useTableFeatures({ features: [plugin] });
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
        { labels: defaultLabels, layout, featureHost: featureHostOf(props) }
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
      const props = useTableFeatures({ features: [plugin], commandPalette });
      return useCommandPalette({
        commandPalette,
        labels: defaultLabels,
        featureHost: featureHostOf(props),
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

const menuRow = {
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
};

const menuLayout = {
  state: { order: ["name"], hidden: {}, pinned: {}, widths: {} },
  setOrder: () => undefined,
  setHidden: () => undefined,
  toggleVisible: () => undefined,
  setPinned: () => undefined,
  setWidth: () => undefined,
} as unknown as UseColumnLayoutResult<unknown>;

function HostMark({ testId }: Readonly<{ testId: string }>) {
  return (
    <output data-testid={testId}>
      {useFeatureHost()?.writers[0]?.extension}
    </output>
  );
}

function ownerPlugin(id: string): TableFeature {
  return {
    id,
    setup(host) {
      host.registerWriter({
        extension: id,
        build: vi.fn(),
      });
      host.registerColumnMenuAction(() => ({
        id,
        label: id,
        disabled: false,
        run: () => undefined,
      }));
      host.registerCommand({
        key: id,
        label: id,
        onSelect: () => undefined,
      });
    },
  };
}

function NestedInner() {
  const props = useTableFeatures({ features: [ownerPlugin("inner")] });
  return (
    <FeatureHostProvider host={featureHostOf(props)}>
      <HostMark testId="inner-host" />
    </FeatureHostProvider>
  );
}

function NestedOuter() {
  const props = useTableFeatures({ features: [ownerPlugin("outer")] });
  return (
    <FeatureHostProvider host={featureHostOf(props)}>
      <NestedInner />
      <HostMark testId="outer-host" />
    </FeatureHostProvider>
  );
}

function OwnedTable({
  id,
  onHost,
}: Readonly<{
  id: string;
  onHost: (id: string, host: FeatureHostState) => void;
}>) {
  const props = useTableFeatures({ features: [ownerPlugin(id)] });
  const host = featureHostOf(props);
  if (host) onHost(id, host);
  const palette = useCommandPalette({
    labels: defaultLabels,
    featureHost: host,
  });
  return (
    <FeatureHostProvider host={host}>
      <output data-testid={`palette-${id}`}>
        {palette.commands.map((command) => command.key).join(",")}
      </output>
    </FeatureHostProvider>
  );
}

function menuIds(host: FeatureHostState): string[] {
  return columnMenuActions(menuRow, {
    labels: defaultLabels,
    layout: menuLayout,
    featureHost: host,
  }).map((action) => action.id);
}

function bothHosts(hosts: Record<string, FeatureHostState>): {
  a: FeatureHostState;
  b: FeatureHostState;
} {
  const a = hosts.a;
  const b = hosts.b;
  if (!a || !b) throw new Error("expected sibling hosts a and b");
  return { a, b };
}

function assertOwned(hosts: {
  a: FeatureHostState;
  b: FeatureHostState;
}): void {
  expect(resolveExportCsv(undefined, hosts.a)?.writer?.extension).toBe("a");
  expect(resolveExportCsv(undefined, hosts.b)?.writer?.extension).toBe("b");
  expect(menuIds(hosts.a)).toContain("a");
  expect(menuIds(hosts.a)).not.toContain("b");
  expect(menuIds(hosts.b)).toContain("b");
  expect(menuIds(hosts.b)).not.toContain("a");
  expect(currentFeatureHost()).toBeUndefined();
}

describe("a table owns its feature host", () => {
  it("keeps sibling registrations after the other table rendered last", () => {
    const hosts: Record<string, FeatureHostState> = {};
    const capture = (id: string, host: FeatureHostState) => {
      hosts[id] = host;
    };
    const { rerender } = render(
      <>
        <OwnedTable id="a" onHost={capture} />
        <OwnedTable id="b" onHost={capture} />
      </>
    );
    assertOwned(bothHosts(hosts));
    expect(screen.getByTestId("palette-a").textContent).toContain("a");
    expect(screen.getByTestId("palette-b").textContent).toContain("b");

    rerender(
      <>
        <OwnedTable id="b" onHost={capture} />
        <OwnedTable id="a" onHost={capture} />
      </>
    );
    assertOwned(bothHosts(hosts));
    expect(screen.getByTestId("palette-a").textContent).toContain("a");
    expect(screen.getByTestId("palette-b").textContent).toContain("b");
  });

  it("lets the outer subtree keep the outer host after an inner table mounts", () => {
    render(<NestedOuter />);
    expect(screen.getByTestId("outer-host").textContent).toBe("outer");
    expect(screen.getByTestId("inner-host").textContent).toBe("inner");
    expect(currentFeatureHost()).toBeUndefined();
  });

  it("keeps sibling and nested hosts under StrictMode", () => {
    const hosts: Record<string, FeatureHostState> = {};
    const capture = (id: string, host: FeatureHostState) => {
      hosts[id] = host;
    };
    render(
      <StrictMode>
        <OwnedTable id="a" onHost={capture} />
        <OwnedTable id="b" onHost={capture} />
        <NestedOuter />
      </StrictMode>
    );
    assertOwned(bothHosts(hosts));
    expect(screen.getByTestId("outer-host").textContent).toBe("outer");
    expect(screen.getByTestId("inner-host").textContent).toBe("inner");
  });
});

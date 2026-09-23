import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useFindState } from "../find/findMarks";
import {
  type DataTableShellResult,
  useDataTableShell,
} from "../useDataTableShell";
import { cellNavigation } from "./cell-navigation";
import { DataTableShellView } from "./chromeBodyGate";
import { editing } from "./editing";
import { findInTable } from "./find-in-table";
import { FeatureProviders, FeatureSlot } from "./providers";
import { DISABLED_GRID_FOCUS } from "./shellLiveStubs";
import { FIND_LIVE } from "./slotKeys";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/**
 * The live stages drawn into real cells, the way an adapter draws them: the
 * find marks land on the cell props, the shortcut is scoped to the table's
 * root, and a keyboard grid opens the focused cell for editing.
 */
interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Oslo" },
  { id: "b", name: "Bob", city: "Lima" },
  { id: "c", name: "Carol", city: "Alicante" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, editable: true },
  { key: "city", header: "City", accessor: (r) => r.city },
];

const noForm = () => null;

/** What the toolbar would read through `useFindState()`. */
function FindProbe() {
  const find = useFindState();
  return <output data-testid="find-state">{find ? "live" : "none"}</output>;
}

function Cells({ view }: { readonly view: DataTableShellResult<Row> }) {
  const grid = view.gridFocus;
  return (
    <div ref={view.rootRef} data-testid="root">
      <table {...grid.getGridProps()}>
        <tbody>
          {view.chrome.source.rows.map((row, windowIndex) => (
            <tr key={row.id} {...grid.getRowPropsAt(windowIndex)}>
              {view.chrome.columnLayout.visibleColumns.map((column, col) => (
                <td
                  key={column.key}
                  data-testid={`${row.id}-${column.key}`}
                  {...(windowIndex === 0
                    ? grid.getCellProps({ row: windowIndex, col })
                    : grid.getCellPropsAt(windowIndex, col))}
                >
                  {column.key === "name" ? row.name : row.city}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <FindProbe />
    </div>
  );
}

function mount(features: readonly TableFeature<Row>[]) {
  const props = applyTableFeatures({
    features,
    data: ROWS,
    columns,
    rowKey: (r: Row) => r.id,
    urlSync: false,
    forceMobile: false,
  });
  let latest: DataTableShellResult<Row> | undefined;
  function Shell() {
    const shell = useDataTableShell(props, noForm);
    return (
      <DataTableShellView<Row> shell={shell}>
        {(view) => {
          latest = view;
          return <Cells view={view} />;
        }}
      </DataTableShellView>
    );
  }
  render(
    <FeatureProviders props={props}>
      <Shell />
      <button type="button">outside</button>
    </FeatureProviders>
  );
  return () => {
    if (!latest) throw new Error("the shell never rendered");
    return latest;
  };
}

const cell = (id: string) => screen.getByTestId(id);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("find without cell navigation", () => {
  it("marks every match on the cells, and the current one apart", () => {
    const view = mount([findInTable()]);

    // No query, no marks: the cell props are the plain ones.
    expect(cell("a-name")).not.toHaveAttribute("data-cell-match");

    act(() => {
      view().find.setOpen(true);
      view().find.setQuery("Ali");
    });

    // "Alice" (row 0, through getCellProps) and "Alicante" (row 2, through
    // getCellPropsAt) both match; the walk starts on the first.
    expect(cell("a-name")).toHaveAttribute("data-cell-match", "");
    expect(cell("a-name")).toHaveAttribute("data-cell-match-current", "");
    expect(cell("c-city")).toHaveAttribute("data-cell-match", "");
    expect(cell("c-city")).not.toHaveAttribute("data-cell-match-current");
    expect(cell("b-name")).not.toHaveAttribute("data-cell-match");

    act(() => {
      view().find.next();
    });
    expect(cell("a-name")).not.toHaveAttribute("data-cell-match-current");
    expect(cell("c-city")).toHaveAttribute("data-cell-match-current", "");
  });

  it("scrolls the current match into view itself", () => {
    const scrolled: Element[] = [];
    const scrollIntoView = vi.fn(function (this: Element) {
      scrolled.push(this);
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    try {
      const view = mount([findInTable()]);
      act(() => {
        view().find.setOpen(true);
        view().find.setQuery("Carol");
      });

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
      expect(scrolled.at(-1)).toBe(cell("c-name"));
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("opens the bar on Ctrl/Cmd+F from inside the table only", () => {
    const view = mount([findInTable()]);

    // Outside the table the browser's own find keeps the key.
    const outside = fireEvent.keyDown(screen.getByText("outside"), {
      key: "f",
      ctrlKey: true,
    });
    expect(outside).toBe(true);
    expect(view().find.open).toBe(false);

    // Other keys, a bare F, and the modified chords pass through untouched.
    fireEvent.keyDown(cell("a-name"), { key: "g", ctrlKey: true });
    fireEvent.keyDown(cell("a-name"), { key: "f" });
    fireEvent.keyDown(cell("a-name"), {
      key: "f",
      ctrlKey: true,
      altKey: true,
    });
    fireEvent.keyDown(cell("a-name"), {
      key: "F",
      metaKey: true,
      shiftKey: true,
    });
    expect(view().find.open).toBe(false);

    const inside = fireEvent.keyDown(cell("b-city"), {
      key: "F",
      metaKey: true,
    });
    expect(inside).toBe(false);
    expect(view().find.open).toBe(true);
  });

  it("hands the find state to a control drawn elsewhere in the table", () => {
    mount([findInTable()]);
    expect(screen.getByTestId("find-state")).toHaveTextContent("live");
  });

  it("leaves Ctrl/Cmd+F to the browser while find is switched off", () => {
    const props = applyTableFeatures({ features: [findInTable()] });
    const root = { current: null as HTMLDivElement | null };
    const seen: boolean[] = [];
    render(
      <FeatureProviders props={props}>
        <div
          ref={(element) => {
            root.current = element;
          }}
        >
          <FeatureSlot
            slot={FIND_LIVE}
            props={{
              enabled: false,
              rows: ROWS as never[],
              columns: columns as never[],
              urlSync: false,
              root,
              children: (find) => {
                seen.push(find.open);
                return <span>inside</span>;
              },
            }}
          />
        </div>
      </FeatureProviders>
    );

    const handled = fireEvent.keyDown(screen.getByText("inside"), {
      key: "f",
      ctrlKey: true,
    });
    expect(handled).toBe(true);
    expect(seen.at(-1)).toBe(false);
  });

  it("gives a control nothing when find is not composed", () => {
    mount([]);
    expect(screen.getByTestId("find-state")).toHaveTextContent("none");
  });
});

describe("find with cell navigation", () => {
  it("leaves the scrolling to the grid, which moves focus to the match", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    try {
      const view = mount([findInTable(), cellNavigation()]);
      act(() => {
        view().find.setOpen(true);
        view().find.setQuery("Lima");
      });

      expect(view().gridFocus.active).toEqual({ row: 1, col: 1 });
      expect(cell("b-city")).toHaveAttribute("data-cell-match-current", "");
      expect(scrollIntoView).not.toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });
});

describe("the keyboard grid over real cells", () => {
  it("walks the cells with the arrow keys", () => {
    const view = mount([cellNavigation()]);

    act(() => {
      view().gridFocus.focusCell({ row: 0, col: 0 });
    });
    fireEvent.keyDown(cell("a-name"), { key: "ArrowDown" });
    expect(view().gridFocus.active).toEqual({ row: 1, col: 0 });
    fireEvent.keyDown(cell("b-name"), { key: "ArrowRight" });
    expect(view().gridFocus.active).toEqual({ row: 1, col: 1 });
  });

  it("opens the focused editable cell on Enter", () => {
    const view = mount([cellNavigation(), editing<Row>(vi.fn())]);

    act(() => {
      view().gridFocus.focusCell({ row: 1, col: 0 });
    });
    fireEvent.keyDown(cell("b-name"), { key: "Enter" });

    expect(view().chrome.editing?.state.active).toEqual(
      expect.objectContaining({ rowId: "b", columnKey: "name" })
    );
  });

  it("does nothing on Enter when no editing is composed", () => {
    const view = mount([cellNavigation()]);

    act(() => {
      view().gridFocus.focusCell({ row: 1, col: 0 });
    });
    const notHandled = fireEvent.keyDown(cell("b-name"), { key: "Enter" });

    // The grid claims the key for the cell, and the stage has nothing to open.
    expect(notHandled).toBe(false);
    expect(view().chrome.editing).toBeUndefined();
  });

  it("does not open a cell the rendered window has no row for", () => {
    const view = mount([cellNavigation(), editing<Row>(vi.fn())]);

    // A focus address past the loaded rows — what a stale focus after the
    // data shrank looks like — opens nothing.
    act(() => {
      view().gridFocus.focusCell({ row: 7, col: 0 });
    });
    fireEvent.keyDown(cell("a-name"), { key: "Enter" });
    expect(view().chrome.editing?.state.active).toBeNull();
  });
});

describe("the grid stand-in without cell navigation", () => {
  it("answers every query inertly", () => {
    expect(DISABLED_GRID_FOCUS.getColumnHeaderProps(0)).toEqual({});
    expect(DISABLED_GRID_FOCUS.cellAt("a", "name")).toBeUndefined();
  });
});

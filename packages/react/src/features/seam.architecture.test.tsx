import { fireEvent, render, screen } from "@testing-library/react";
import { type KeyboardEvent, useCallback, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  type FeatureProviderProps,
  FeatureProviders,
  featureStateKey,
  FeatureStateScope,
  useFeatureState,
} from "./providers";
import { applyTableFeatures, type TableFeature } from "./tableFeature";

/**
 * The seam has to fit the hard feature, not just the one it was built for.
 *
 * Row reordering shipped on it first, but reordering is a mild case: one piece
 * of state, one handler, one control. Cell navigation is the shape that would
 * break a seam designed too narrowly — it addresses individual cells rather
 * than rows, it takes over keyboard handling the table already owns, and it
 * decorates cells the adapter renders. If those three fit here without core
 * learning anything about cell navigation, they fit for the rest.
 *
 * This is an architecture fixture: it builds a cell-navigation-shaped feature
 * out of the public seam and nothing else, so what it proves is that the seam
 * is sufficient. The real implementation belongs to item 4 — nothing here is
 * shipped, and nothing in core imports it.
 */

/** A cell, addressed the way a feature must be able to address one. */
interface CellAddress {
  readonly rowId: string;
  readonly columnId: string;
}

/** 1. Stable row-id x column-id addressing, plus what a chrome reads back. */
interface RangeSelection {
  readonly anchor: CellAddress | null;
  readonly extent: CellAddress | null;
  /** 3. Cell decoration: the chrome asks per cell, and renders the answer. */
  isSelected(cell: CellAddress): boolean;
  /** 2. Feature-extendable keyboard: the chrome offers keys it does not own. */
  onCellKeyDown(event: KeyboardEvent<HTMLElement>, cell: CellAddress): void;
  select(cell: CellAddress): void;
}

const CELL_RANGE = featureStateKey<RangeSelection>("cell-navigation");

const COLUMNS = ["name", "role", "team"];
const ROWS = ["r1", "r2", "r3"];
const at = (rowId: string, columnId: string): CellAddress => ({
  rowId,
  columnId,
});

/** The keys this feature claims, and how far each moves the extent. */
const STEP: Readonly<Record<string, number | undefined>> = {
  ArrowDown: 1,
  ArrowUp: -1,
};

/**
 * The whole feature: state, keyboard and decoration, defined outside core.
 *
 * Core has no import of this file, and this file imports only the seam — which
 * is the claim the fixture exists to make.
 */
function cellNavigation(onRangeChange?: (size: number) => void): TableFeature {
  return {
    id: "cell-navigation",
    provider: { Provider: CellNavigationProvider },
    onRangeChange,
  } as TableFeature & { onRangeChange?: (size: number) => void };
}

function CellNavigationProvider({
  feature,
  children,
}: Readonly<FeatureProviderProps>) {
  const { onRangeChange } = feature as TableFeature & {
    onRangeChange?: (size: number) => void;
  };
  const [anchor, setAnchor] = useState<CellAddress | null>(null);
  const [extent, setExtent] = useState<CellAddress | null>(null);

  const indexOf = (cell: CellAddress) => ({
    row: ROWS.indexOf(cell.rowId),
    column: COLUMNS.indexOf(cell.columnId),
  });

  const isSelected = useCallback(
    (cell: CellAddress) => {
      if (!anchor || !extent) return false;
      const a = indexOf(anchor);
      const b = indexOf(extent);
      const c = indexOf(cell);
      return (
        c.row >= Math.min(a.row, b.row) &&
        c.row <= Math.max(a.row, b.row) &&
        c.column >= Math.min(a.column, b.column) &&
        c.column <= Math.max(a.column, b.column)
      );
    },
    [anchor, extent]
  );

  const select = useCallback((cell: CellAddress) => {
    setAnchor(cell);
    setExtent(cell);
  }, []);

  const onCellKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, cell: CellAddress) => {
      if (!event.shiftKey || !anchor) return;
      const here = indexOf(cell);
      const step = STEP[event.key];
      if (step === undefined) return;
      const next =
        ROWS[Math.min(Math.max(here.row + step, 0), ROWS.length - 1)];
      if (!next) return;
      event.preventDefault();
      const grown = at(next, cell.columnId);
      setExtent(grown);
      const rows = Math.abs(ROWS.indexOf(next) - indexOf(anchor).row) + 1;
      onRangeChange?.(rows);
    },
    [anchor, onRangeChange]
  );

  const value: RangeSelection = {
    anchor,
    extent,
    isSelected,
    onCellKeyDown,
    select,
  };
  return (
    <FeatureStateScope stateKey={CELL_RANGE} value={value}>
      {children}
    </FeatureStateScope>
  );
}

/** A stand-in for the adapter's cell walk: asks per cell, offers the keys. */
function Grid() {
  const range = useFeatureState(CELL_RANGE);
  return (
    <table>
      <tbody>
        {ROWS.map((rowId) => (
          <tr key={rowId}>
            {COLUMNS.map((columnId) => {
              const cell = at(rowId, columnId);
              return (
                <td
                  key={columnId}
                  data-testid={`${rowId}-${columnId}`}
                  // Decoration: absent feature, absent attribute. The cell walk
                  // never learns what a range is.
                  data-selected={range?.isSelected(cell) ? "" : undefined}
                  tabIndex={0}
                  onClick={() => range?.select(cell)}
                  onKeyDown={(event) => range?.onCellKeyDown(event, cell)}
                >
                  {columnId}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const mount = (features: readonly TableFeature[]) =>
  render(
    <FeatureProviders props={applyTableFeatures({ features })}>
      <Grid />
    </FeatureProviders>
  );

const selected = () =>
  [...document.querySelectorAll("[data-selected]")].map(
    (node) => node.getAttribute("data-testid") ?? ""
  );

describe("the seam carries a cell-navigation shape", () => {
  it("decorates nothing when the feature is absent", () => {
    mount([]);
    fireEvent.click(screen.getByTestId("r1-name"));
    expect(selected()).toEqual([]);
  });

  it("addresses a cell by row id and column id", () => {
    mount([cellNavigation()]);
    fireEvent.click(screen.getByTestId("r2-role"));
    expect(selected()).toEqual(["r2-role"]);
  });

  it("takes over keys the table did not own, and grows a range", () => {
    const onRangeChange = vi.fn();
    mount([cellNavigation(onRangeChange)]);
    fireEvent.click(screen.getByTestId("r1-role"));
    fireEvent.keyDown(screen.getByTestId("r1-role"), {
      key: "ArrowDown",
      shiftKey: true,
    });
    expect(selected()).toEqual(["r1-role", "r2-role"]);
    expect(onRangeChange).toHaveBeenCalledWith(2);
  });

  it("leaves keys it does not claim to the table", () => {
    mount([cellNavigation()]);
    fireEvent.click(screen.getByTestId("r1-name"));
    // No shift: the feature declines, and the selection is untouched.
    fireEvent.keyDown(screen.getByTestId("r1-name"), { key: "ArrowDown" });
    expect(selected()).toEqual(["r1-name"]);
  });

  it("keeps two tables' ranges apart", () => {
    render(
      <>
        <div data-testid="left">
          <FeatureProviders
            props={applyTableFeatures({ features: [cellNavigation()] })}
          >
            <Grid />
          </FeatureProviders>
        </div>
        <div data-testid="right">
          <FeatureProviders
            props={applyTableFeatures({ features: [cellNavigation()] })}
          >
            <Grid />
          </FeatureProviders>
        </div>
      </>
    );
    const left = screen.getByTestId("left");
    fireEvent.click(left.querySelector('[data-testid="r1-name"]')!);
    expect(left.querySelectorAll("[data-selected]")).toHaveLength(1);
    expect(
      screen.getByTestId("right").querySelectorAll("[data-selected]")
    ).toHaveLength(0);
  });
});

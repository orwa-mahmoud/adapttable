/**
 * `copyCells`, the copy route that is not the keyboard.
 *
 * Ctrl+C always has a focused range to work from. A context menu does not:
 * a right-click on a cell with nothing selected has to copy that cell, and
 * that difference is the whole reason this exists beside the key handler.
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useGridFocus } from "./useGridFocus";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", city: "London" },
  { id: "2", name: "Grace", city: "New York" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city },
];

const written: string[] = [];

beforeEach(() => {
  written.length = 0;
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn((text: string) => {
        written.push(text);
        return Promise.resolve();
      }),
    },
  });
});

const setup = (enabled = true) =>
  renderHook(() =>
    useGridFocus<Row>({
      enabled,
      rowCount: ROWS.length,
      rows: ROWS,
      columns: COLUMNS,
      firstRowIndex: 0,
    })
  );

describe("copyCells", () => {
  it("copies the one cell it was given when nothing is selected", async () => {
    const { result } = setup();
    await act(async () => {
      result.current.copyCells({ row: 1, col: 1 });
      await Promise.resolve();
    });

    expect(written).toEqual(["New York"]);
  });

  it("copies the whole selection when it is given no cell", async () => {
    const { result } = setup();
    act(() => {
      result.current.selectRange({
        anchor: { row: 0, col: 0 },
        head: { row: 1, col: 1 },
      });
    });
    await act(async () => {
      result.current.copyCells();
      await Promise.resolve();
    });

    expect(written[0]).toContain("Ada\tLondon");
    expect(written[0]).toContain("Grace\tNew York");
  });

  it("prefers the cell it was given over whatever is selected", async () => {
    const { result } = setup();
    act(() => {
      result.current.selectRange({
        anchor: { row: 0, col: 0 },
        head: { row: 1, col: 1 },
      });
    });
    await act(async () => {
      result.current.copyCells({ row: 0, col: 0 });
      await Promise.resolve();
    });

    expect(written).toEqual(["Ada"]);
  });

  it("does nothing when there is neither a cell nor a selection", async () => {
    const { result } = setup();
    await act(async () => {
      result.current.copyCells();
      await Promise.resolve();
    });

    expect(written).toEqual([]);
  });
});

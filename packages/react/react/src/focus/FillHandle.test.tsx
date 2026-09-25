/**
 * The square itself.
 *
 * The gesture is covered in `fillRange.test.ts` and the wiring in each
 * adapter; what only exists once this component renders is where it appears —
 * on the selection's corner, and nowhere else — and that it disappears
 * entirely when there is nothing to fill or nobody to receive it.
 */
import type { CellRange } from "@adapttable/core";
import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { FillHandleChrome, type FillHandleSlots } from "./FillHandle";
import { useGridFocus } from "./useGridFocus";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A" },
  { id: "2", name: "B" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "N", editable: true },
  { key: "id", header: "I", editable: true },
];

const slots: FillHandleSlots = {
  Handle: ({ label, handleProps }) => (
    <span {...handleProps} title={label} data-adapttable-part="fill-handle" />
  ),
};

function Grid({
  selection,
  onFill,
  firstRowIndex = 0,
  renderSlots = slots,
}: Readonly<{
  selection?: CellRange;
  onFill?: (edits: unknown[]) => void;
  firstRowIndex?: number;
  renderSlots?: FillHandleSlots;
}>) {
  const focus = useGridFocus<Row>({
    enabled: true,
    rowCount: ROWS.length,
    columns: COLUMNS,
    rows: ROWS,
    firstRowIndex,
    onFill,
  });
  return (
    <table {...focus.getGridProps()}>
      <tbody>
        {ROWS.map((row, index) => (
          <tr key={row.id}>
            {COLUMNS.map((column, col) => (
              <td key={column.key}>
                <button
                  type="button"
                  onClick={() => selection && focus.selectRange(selection)}
                >
                  select
                </button>
                <FillHandleChrome
                  focus={focus}
                  windowIndex={index}
                  col={col}
                  firstRowIndex={firstRowIndex}
                  slots={renderSlots}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const handles = (container: HTMLElement) =>
  container.querySelectorAll('[data-adapttable-part="fill-handle"]');
const select = (container: HTMLElement) => {
  fireEvent.click(container.querySelectorAll("button")[0]!);
};

describe("FillHandleChrome", () => {
  const range = {
    anchor: { row: 0, col: 0 },
    head: { row: 1, col: 1 },
  };

  it("renders on the selection's bottom inline-end corner only", () => {
    const { container } = render(<Grid selection={range} onFill={vi.fn()} />);
    select(container);
    expect(handles(container)).toHaveLength(1);
    const cells = container.querySelectorAll("td");
    expect(cells[3]?.contains(handles(container)[0]!)).toBe(true);
  });

  it("mounts the adapter handle as a component so kit hooks stay valid", () => {
    const hookedSlots: FillHandleSlots = {
      Handle: ({ label, handleProps }) => {
        const [ready] = useState(true);
        return ready ? (
          <span
            {...handleProps}
            title={label}
            data-adapttable-part="fill-handle"
          />
        ) : null;
      },
    };
    const { container } = render(
      <Grid selection={range} onFill={vi.fn()} renderSlots={hookedSlots} />
    );
    select(container);
    expect(handles(container)).toHaveLength(1);
  });

  it("renders nothing while nothing is selected", () => {
    const { container } = render(<Grid onFill={vi.fn()} />);
    expect(handles(container)).toHaveLength(0);
  });

  it("renders nothing when no host can receive a fill", () => {
    const { container } = render(<Grid selection={range} />);
    select(container);
    expect(handles(container)).toHaveLength(0);
  });

  it("counts from where the rendered window starts", () => {
    // Paged tables address rows absolutely; a handle that ignored the offset
    // would appear on the wrong row of every page but the first.
    const { container } = render(
      <Grid
        selection={{ anchor: { row: 10, col: 0 }, head: { row: 11, col: 0 } }}
        onFill={vi.fn()}
        firstRowIndex={10}
      />
    );
    select(container);
    expect(handles(container)).toHaveLength(1);
    expect(
      container.querySelectorAll("td")[2]?.contains(handles(container)[0]!)
    ).toBe(true);
  });

  it("renders nothing at all when cell navigation is off", () => {
    render(
      <FillHandleChrome
        focus={undefined}
        windowIndex={0}
        col={0}
        slots={slots}
      />
    );
    // No focus state at all is the adapter's "cell navigation is off" case.
    expect(
      document.querySelectorAll('[data-adapttable-part="fill-handle"]')
    ).toHaveLength(0);
  });
});

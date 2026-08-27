import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef, CustomCellEditorCtrl } from "./index";

interface Task {
  id: string;
  colour: string;
}

const ROWS: Task[] = [{ id: "1", colour: "amber" }];
const SWATCHES = ["amber", "teal", "violet"];

/**
 * A picker, which is what a custom editor usually is: choosing IS the gesture,
 * so it commits on click rather than waiting for Enter.
 */
function SwatchPicker(ctrl: CustomCellEditorCtrl) {
  return (
    <fieldset data-testid="swatches">
      <legend>{ctrl.label}</legend>
      {SWATCHES.map((swatch, index) => (
        <button
          key={swatch}
          type="button"
          ref={index === 0 ? ctrl.focusRef : undefined}
          aria-label={swatch}
          aria-pressed={ctrl.draft === swatch}
          aria-describedby={ctrl.error === undefined ? undefined : ctrl.errorId}
          // The keyboard flow rides the interactive elements, not the wrapper.
          onKeyDown={ctrl.onKeyDown}
          onClick={() => {
            ctrl.setDraft(swatch);
            ctrl.commit();
          }}
        >
          {swatch}
        </button>
      ))}
    </fieldset>
  );
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

/**
 * A column's own React editor.
 *
 * The contract is that the table keeps everything it already owned —
 * activation, focus, the keyboard flow, validation, the commit — and the
 * component owns only what the reader looks at. These check each half of that.
 */
/**
 * A commit's save-state bookkeeping settles in a microtask after the host's
 * handler has already run. Flushing it inside `act` keeps that update inside
 * the test, which is what React asks for.
 */
const settleCommit = () => act(() => Promise.resolve());

describe("custom cell editor (mui)", () => {
  const table = (extra?: Partial<ColumnDef<Task>>) => {
    const onCellEdit = vi.fn();
    const columns: ColumnDef<Task>[] = [
      {
        key: "colour",
        header: "Colour",
        accessor: (r) => r.colour,
        editable: true,
        editor: { type: "custom", render: SwatchPicker },
        ...extra,
      },
    ];
    render(
      <DataTable
        data={ROWS}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        onCellEdit={onCellEdit}
      />
    );
    return { onCellEdit };
  };
  const open = () => {
    fireEvent.doubleClick(part("edit-cell-activate")!);
  };

  it("stays a plain cell until the table activates it", () => {
    table();
    expect(screen.queryByTestId("swatches")).toBeNull();
    open();
    expect(screen.getByTestId("swatches")).toBeInTheDocument();
  });

  it("seeds the component with the cell's value", () => {
    table();
    open();
    expect(screen.getByRole("button", { name: "amber" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("focuses what the component pointed the table at", () => {
    table();
    open();
    expect(screen.getByRole("button", { name: "amber" })).toHaveFocus();
  });

  it("commits when the component says the choice was made", async () => {
    const { onCellEdit } = table();
    open();
    fireEvent.click(screen.getByRole("button", { name: "teal" }));
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ROWS[0],
      "colour",
      "teal"
    );
    // The editor closed and focus came back to the cell.
    expect(screen.queryByTestId("swatches")).toBeNull();
    expect(part("edit-cell-activate")).toHaveFocus();
  });

  it("still cancels on Escape, through the component's own handler", async () => {
    const { onCellEdit } = table();
    open();
    fireEvent.keyDown(screen.getByRole("button", { name: "amber" }), {
      key: "Escape",
    });
    await settleCommit();
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("swatches")).toBeNull();
  });

  it("passes the column's parsed value to the host", async () => {
    // The draft is a string; `parseValue` is still the column's own way to turn
    // it into whatever gets stored.
    const { onCellEdit } = table({
      parseValue: (draft) => ({ name: draft }),
    });
    open();
    fireEvent.click(screen.getByRole("button", { name: "violet" }));
    await settleCommit();
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], "colour", {
      name: "violet",
    });
  });

  it("is gated by the same validators as any other editor", async () => {
    const { onCellEdit } = table({
      validate: (value) =>
        value === "violet" ? "Violet is retired" : undefined,
    });
    open();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "violet" }));
      await Promise.resolve();
    });
    await settleCommit();
    expect(onCellEdit).not.toHaveBeenCalled();
    // The component is still open, and told about the rejection.
    const message = part("edit-cell-error")!;
    expect(message).toHaveTextContent("Violet is retired");
    expect(screen.getByRole("button", { name: "violet" })).toHaveAttribute(
      "aria-describedby",
      message.id
    );
  });
});

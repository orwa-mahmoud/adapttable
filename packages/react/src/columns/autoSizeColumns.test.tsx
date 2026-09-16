/**
 * Sizing a column to what is in it.
 *
 * Measurement comes from the DOM because that is the only thing that knows how
 * wide a rendered cell is — a cell holding a badge, an avatar and a name has no
 * width the data could report.
 */
import {
  autoSizeColumns,
  MAX_COLUMN_WIDTH,
  measureColumnWidth,
  MIN_COLUMN_WIDTH,
} from "@adapttable/core";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/** jsdom lays nothing out, so each cell is told how wide its content is. */
function table(
  widths: Record<string, number[]>,
  clientWidths?: Record<string, number[]>
) {
  const { container } = render(
    <table>
      <tbody>
        {Object.entries(widths)[0]![1].map((_, row) => (
          <tr key={row}>
            {Object.keys(widths).map((key) => (
              <td key={key} data-column-key={key} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
  for (const [key, perRow] of Object.entries(widths)) {
    const cells = container.querySelectorAll<HTMLElement>(
      `[data-column-key="${key}"]`
    );
    cells.forEach((cell, index) => {
      Object.defineProperty(cell, "scrollWidth", {
        value: perRow[index] ?? 0,
        configurable: true,
      });
      const client = clientWidths?.[key]?.[index];
      if (client !== undefined) {
        Object.defineProperty(cell, "clientWidth", {
          value: client,
          configurable: true,
        });
      }
    });
  }
  return container.querySelector("table")!;
}

describe("measureColumnWidth", () => {
  it("takes the widest cell, with room to breathe", () => {
    const root = table({ name: [80, 200, 120] });
    expect(measureColumnWidth(root, "name")).toBe(224);
  });

  it("measures the CONTENT, not the box clipping it", () => {
    // `scrollWidth` is what the cell would need — which is the case
    // auto-sizing exists to fix.
    const root = table({ name: [500] });
    expect(measureColumnWidth(root, "name")).toBe(524);
  });

  it("stays inside the bounds a drag obeys", () => {
    expect(measureColumnWidth(table({ a: [1] }), "a")).toBe(MIN_COLUMN_WIDTH);
    expect(measureColumnWidth(table({ a: [99_999] }), "a")).toBe(
      MAX_COLUMN_WIDTH
    );
  });

  it("has no answer for a column with nothing on screen", () => {
    expect(measureColumnWidth(table({ a: [100] }), "ghost")).toBeNull();
    expect(measureColumnWidth(null, "a")).toBeNull();
  });

  it("has no answer when every cell measures zero", () => {
    // An unrendered table measures nothing; guessing a width there would
    // overwrite a good one with 84px.
    expect(measureColumnWidth(table({ a: [0, 0] }), "a")).toBeNull();
  });

  it("escapes a key that would otherwise break the selector", () => {
    const root = table({ "user.name": [120] });
    expect(measureColumnWidth(root, "user.name")).toBe(144);
  });

  it("does not grow a column that already fits its content", () => {
    // scrollWidth equals the box once padding is already in the width —
    // adding another 24px on every click is how a column ate the screen.
    const root = table({ name: [224] }, { name: [224] });
    expect(measureColumnWidth(root, "name")).toBe(224);
    expect(measureColumnWidth(root, "name")).toBe(224);
  });
});

describe("autoSizeColumns", () => {
  it("sizes every column it can measure", () => {
    const setWidth = vi.fn();
    const root = table({ a: [100], b: [300] });
    expect(autoSizeColumns(root, ["a", "b"], setWidth)).toBe(2);
    expect(setWidth).toHaveBeenNthCalledWith(1, "a", 124);
    expect(setWidth).toHaveBeenNthCalledWith(2, "b", 324);
  });

  it("skips what it cannot measure rather than guessing", () => {
    const setWidth = vi.fn();
    const root = table({ a: [100] });
    expect(autoSizeColumns(root, ["a", "ghost"], setWidth)).toBe(1);
    expect(setWidth).toHaveBeenCalledOnce();
  });
});

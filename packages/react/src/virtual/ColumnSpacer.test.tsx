/**
 * The cell that stands in for the columns outside the window.
 */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ColumnSpacer } from "./ColumnSpacer";

const inRow = (cell: React.ReactNode) =>
  render(
    <table>
      <tbody>
        <tr>{cell}</tr>
      </tbody>
    </table>
  );

describe("ColumnSpacer", () => {
  it("holds open exactly the width it was given", () => {
    const { container } = inRow(<ColumnSpacer width={420} side="start" />);
    const cell = container.querySelector<HTMLElement>("td")!;
    expect(cell.style.width).toBe("420px");
    expect(cell.style.minWidth).toBe("420px");
  });

  it("renders nothing when there is nothing to hold open", () => {
    // At the head of the table there are no columns before the window; an
    // empty cell there would still be a cell the row has to account for.
    const { container } = inRow(<ColumnSpacer width={0} side="start" />);
    expect(container.querySelector("td")).toBeNull();
  });

  it("names which side it sits on", () => {
    const { container } = inRow(<ColumnSpacer width={10} side="end" />);
    expect(
      container.querySelector('[data-adapttable-part="column-spacer-end"]')
    ).not.toBeNull();
  });

  it("is scaffolding, not data — a screen reader walks past it", () => {
    const { container } = inRow(<ColumnSpacer width={10} side="start" />);
    expect(container.querySelector("td")?.getAttribute("aria-hidden")).toBe(
      "true"
    );
  });

  it("renders as a header cell when the row is a header", () => {
    const { container } = render(
      <table>
        <thead>
          <tr>
            <ColumnSpacer width={10} side="start" as="th" />
          </tr>
        </thead>
      </table>
    );
    expect(container.querySelector("th")).not.toBeNull();
  });
});

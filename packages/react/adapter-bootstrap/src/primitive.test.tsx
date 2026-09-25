import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Table } from "./components/primitives";

describe("primitives", () => {
  it("renders Table with default props", () => {
    render(
      <Table>
        <tbody>
          <tr>
            <td>Default Cell</td>
          </tr>
        </tbody>
      </Table>
    );

    const cell = screen.getByText("Default Cell");
    const tableEl = cell.closest("table");
    expect(tableEl).toBeInTheDocument();
    expect(tableEl).toHaveClass("align-middle");
  });

  it("renders Table with explicit custom props, custom className, and false flags", () => {
    render(
      <Table
        className="custom-tbl"
        striped={false}
        bordered={false}
        hover={false}
        responsive={false}
        id="test-table"
      >
        <tbody>
          <tr>
            <td>Custom Cell</td>
          </tr>
        </tbody>
      </Table>
    );

    const cell = screen.getByText("Custom Cell");
    const tableEl = cell.closest("table");
    expect(tableEl).toHaveClass("custom-tbl");
    expect(tableEl).toHaveAttribute("id", "test-table");
  });
});

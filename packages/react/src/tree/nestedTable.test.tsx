/**
 * A nested table under a row.
 *
 * What these cover is the part a host cannot be trusted to remember: a table
 * inside a row must not write to the URL its parent owns, must not grow a second
 * search box, and must be announced as a region — plus the fall back for rows
 * that have no nested table at all.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { nestedTableDefaults, nestedTableDetail } from "./nestedTable";

interface Row {
  id: string;
  name: string;
}

const ADA: Row = { id: "1", name: "Ada" };
const GRACE: Row = { id: "2", name: "Grace" };

const region = () =>
  document.querySelector<HTMLElement>('[data-adapttable-part="nested-table"]');

describe("nestedTableDefaults", () => {
  it("never lets a nested table own the URL", () => {
    // Two tables writing `?page=` fight over it, and the loser silently resets
    // while the reader is using it.
    expect(nestedTableDefaults("Orders").urlSync).toBe(false);
  });

  it("hides the search box, and takes the parent's chrome", () => {
    const defaults = nestedTableDefaults("Orders", {
      density: "compact",
      labels: { search: "ابحث" },
    });
    expect(defaults.searchable).toBe(false);
    expect(defaults.density).toBe("compact");
    expect(defaults.labels).toEqual({ search: "ابحث" });
    expect(defaults.tableLabel).toBe("Orders");
  });
});

describe("nestedTableDetail", () => {
  it("passes the host's own panel through when nothing is declared", () => {
    const renderRowDetail = vi.fn(() => <p>hand-built</p>);
    const detail = nestedTableDetail<Row>({
      nestedTable: undefined,
      renderRowDetail,
    });
    expect(detail).toBe(renderRowDetail);
  });

  it("has no detail panel at all when neither is declared", () => {
    expect(nestedTableDetail<Row>({ nestedTable: undefined })).toBeUndefined();
  });

  it("mounts the host's table inside a named region", () => {
    const detail = nestedTableDetail<Row>({
      nestedTable: (row) => ({
        label: `Orders for ${row.name}`,
        table: (defaults) => (
          <table aria-label={defaults.tableLabel}>
            <caption>{String(defaults.urlSync)}</caption>
            <thead>
              <tr>
                <th scope="col">Item</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Analytical Engine</td>
              </tr>
            </tbody>
          </table>
        ),
      }),
      parent: { density: "compact" },
    })!;
    render(<>{detail(ADA)}</>);
    expect(region()?.tagName).toBe("SECTION");
    expect(region()).toHaveAttribute("aria-label", "Orders for Ada");
    // The defaults reached the host's own component.
    expect(screen.getByRole("table")).toHaveAttribute(
      "aria-label",
      "Orders for Ada"
    );
    expect(screen.getByText("false")).toBeInTheDocument();
  });

  it("names a nested table that the host did not name", () => {
    const detail = nestedTableDetail<Row>({
      nestedTable: () => ({ table: () => <p>rows</p> }),
    })!;
    render(<>{detail(ADA)}</>);
    expect(region()).toHaveAttribute("aria-label", "Row details");
  });

  it("falls back to the host's panel for a row with no nested table", () => {
    const detail = nestedTableDetail<Row>({
      nestedTable: (row) =>
        row.id === "1" ? { table: () => <p>orders</p> } : undefined,
      renderRowDetail: (row) => <p>notes for {row.name}</p>,
    })!;

    const nested = render(<>{detail(ADA)}</>);
    expect(screen.getByText("orders")).toBeInTheDocument();
    nested.unmount();

    render(<>{detail(GRACE)}</>);
    expect(screen.getByText("notes for Grace")).toBeInTheDocument();
    // The host's panel is its own; no region is invented around it.
    expect(region()).toBeNull();
  });

  it("renders nothing for a row with neither", () => {
    const detail = nestedTableDetail<Row>({
      nestedTable: () => undefined,
      renderRowDetail: () => null,
    })!;
    const { container } = render(<>{detail(ADA)}</>);
    expect(container).toBeEmptyDOMElement();
  });
});

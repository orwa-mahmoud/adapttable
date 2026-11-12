import { computePagination, defaultLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { testPrimitives } from "../internal/testPrimitives";
import {
  createPageButtons,
  createPager,
  type KitPagerFrameProps,
  type KitPagerView,
} from "./pager";
import type { KitRowsPerPageProps } from "./toolbar";

const Pages = createPageButtons(testPrimitives, { row: {}, ellipsis: {} });

function Frame({ rowsPerPage, range, pageOf, pages }: KitPagerFrameProps) {
  return (
    <footer>
      {rowsPerPage}
      {range}
      {pageOf}
      {pages}
    </footer>
  );
}

function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: KitRowsPerPageProps) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

const Caption = ({ children }: { readonly children: ReactNode }) => (
  <span>{children}</span>
);

const footer = createPager({ Frame, RowsPerPage, Caption, Pages });

function view(page: number, total: number, grouping?: unknown) {
  const setPage = vi.fn<(page: number) => void>();
  const setLimit = vi.fn<(limit: number) => void>();
  const shown: KitPagerView = {
    table: { pagination: computePagination({ page, limit: 10, total }) },
    source: { limit: 10, defaultLimit: 25, total, setPage, setLimit },
    labels: defaultLabels,
    chrome: { grouping },
  };
  return { shown, setPage, setLimit };
}

describe("createPager", () => {
  it("offers the page sizes, says which rows show and moves between pages", () => {
    const current = view(5, 120);
    render(footer(current.shown));
    const size = screen.getByLabelText(defaultLabels.rowsPerPage);
    expect(
      [...size.querySelectorAll("option")].map((option) => option.value)
    ).toContain("25");
    fireEvent.change(size, { target: { value: "25" } });
    expect(current.setLimit).toHaveBeenCalledWith(25);
    expect(
      screen.getByText(defaultLabels.showing({ from: 41, to: 50, total: 120 }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(defaultLabels.pageOf({ page: 5, total: 12 }))
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      document.querySelectorAll('[data-adapttable-part="page-ellipsis"]')
    ).toHaveLength(2);
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.nextPage })
    );
    expect(current.setPage).toHaveBeenCalledWith(6);
  });

  it("drops the page-size choice from a grouped table and the range from an empty one", () => {
    render(footer(view(1, 0, { by: ["team"] }).shown));
    expect(screen.queryByLabelText(defaultLabels.rowsPerPage)).toBeNull();
    expect(screen.queryByText(/of 0/)).toBeNull();
    expect(
      screen.getByRole("button", { name: defaultLabels.previousPage })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: defaultLabels.nextPage })
    ).toBeDisabled();
  });
});

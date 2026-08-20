import type { PaginationInfo, TableLabels } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Footer } from "./components/PaginationFooter";

const labels = {
  rowsPerPage: "Rows per page",
  previousPage: "Previous page",
  nextPage: "Next page",
  showing: ({ from, to, total }: { from: number; to: number; total: number }) =>
    `Showing ${from}-${to} of ${total}`,
  pageOf: ({ page, total }: { page: number; total: number }) =>
    `Page ${page} of ${total}`,
} as Required<TableLabels>;

describe("PaginationFooter", () => {
  it("renders full pagination layout with custom className and ellipsis slots", () => {
    const pagination: PaginationInfo = {
      safePage: 5,
      totalPages: 10,
      fromIndex: 41,
      toIndex: 50,
    };

    const { container } = render(
      <Footer
        pagination={pagination}
        total={100}
        limit={10}
        setPage={vi.fn()}
        setLimit={vi.fn()}
        labels={labels}
        className="custom-footer"
      />
    );

    expect(container.firstChild).toHaveClass("custom-footer");
    expect(screen.getByLabelText(labels.rowsPerPage)).toBeInTheDocument();
    expect(
      screen.getByText(labels.pageOf({ page: 5, total: 10 }))
    ).toBeInTheDocument();
    expect(
      screen.getByText(labels.showing({ from: 41, to: 50, total: 100 }))
    ).toBeInTheDocument();

    expect(
      container.querySelector(
        ".page-item:not(.active) span[aria-hidden='true']"
      ) ?? container.querySelector(".page-item.disabled")
    ).toBeInTheDocument();
  });

  it("clicks Previous and Next buttons on intermediate active pages", () => {
    const setPage = vi.fn();
    const pagination: PaginationInfo = {
      safePage: 2,
      totalPages: 5,
      fromIndex: 11,
      toIndex: 20,
    };

    render(
      <Footer
        pagination={pagination}
        total={50}
        limit={10}
        setPage={setPage}
        setLimit={vi.fn()}
        labels={labels}
      />
    );

    // Prev Button click
    const prevLink = screen.getByLabelText(labels.previousPage);
    fireEvent.click(prevLink);
    expect(setPage).toHaveBeenCalledWith(1);

    // Next Button click
    const nextLink = screen.getByLabelText(labels.nextPage);
    fireEvent.click(nextLink);
    expect(setPage).toHaveBeenCalledWith(3);
  });

  it("clicks a numbered page item to change page", () => {
    const setPage = vi.fn();
    const pagination: PaginationInfo = {
      safePage: 1,
      totalPages: 5,
      fromIndex: 1,
      toIndex: 10,
    };

    render(
      <Footer
        pagination={pagination}
        total={50}
        limit={10}
        setPage={setPage}
        setLimit={vi.fn()}
        labels={labels}
      />
    );

    const pageThreeBtn = screen.getByRole("button", { name: "3" });
    fireEvent.click(pageThreeBtn);
    expect(setPage).toHaveBeenCalledWith(3);
  });

  it("changes page limit through rows-per-page selector", () => {
    const setLimit = vi.fn();
    const pagination: PaginationInfo = {
      safePage: 1,
      totalPages: 5,
      fromIndex: 1,
      toIndex: 10,
    };

    render(
      <Footer
        pagination={pagination}
        total={50}
        limit={10}
        setPage={vi.fn()}
        setLimit={setLimit}
        labels={labels}
      />
    );

    const select = screen.getByLabelText(labels.rowsPerPage);
    fireEvent.change(select, { target: { value: "25" } });
    expect(setLimit).toHaveBeenCalledWith(25);
  });

  it("disables Previous on page 1 and Next on totalPages", () => {
    const { rerender } = render(
      <Footer
        pagination={{ safePage: 1, totalPages: 3, fromIndex: 1, toIndex: 10 }}
        total={30}
        limit={10}
        setPage={vi.fn()}
        setLimit={vi.fn()}
        labels={labels}
      />
    );

    expect(
      screen.getByLabelText(labels.previousPage).closest(".page-item")
    ).toHaveClass("disabled");

    rerender(
      <Footer
        pagination={{ safePage: 3, totalPages: 3, fromIndex: 21, toIndex: 30 }}
        total={30}
        limit={10}
        setPage={vi.fn()}
        setLimit={vi.fn()}
        labels={labels}
      />
    );

    expect(
      screen.getByLabelText(labels.nextPage).closest(".page-item")
    ).toHaveClass("disabled");
  });

  it("hides rows-per-page controls and summary when total is 0 and showRowsPerPage is false", () => {
    render(
      <Footer
        pagination={{ safePage: 1, totalPages: 1, fromIndex: 0, toIndex: 0 }}
        total={0}
        limit={10}
        setPage={vi.fn()}
        setLimit={vi.fn()}
        labels={labels}
        showRowsPerPage={false}
      />
    );

    expect(screen.queryByLabelText(labels.rowsPerPage)).not.toBeInTheDocument();
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
  it("clicks Next page button when safePage < totalPages (covers lines 88-89)", () => {
    const setPage = vi.fn();
    render(
      <Footer
        pagination={{ safePage: 2, totalPages: 4, fromIndex: 11, toIndex: 20 }}
        total={40}
        limit={10}
        setPage={setPage}
        setLimit={vi.fn()}
        labels={labels}
      />
    );

    const nextBtn = screen.getByLabelText(labels.nextPage);
    fireEvent.click(nextBtn);
    expect(setPage).toHaveBeenCalledWith(3);
  });
});

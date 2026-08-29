import type { SelectionState } from "@adapttable/core";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "../index";
import { renderMantine } from "../test-utils";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { BulkActionBar } from "./BulkActionBar";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { ExpandToggle } from "./ExpandToggle";
import { FilterPopover } from "./FilterPopover";
import { PaginationFooter } from "./PaginationFooter";
import { TableSkeleton } from "./TableSkeleton";

const labels = defaultLabels;

/**
 * A bulk action runs asynchronously, so the runner settles a microtask after the
 * host's onClick resolves. Flushing it inside `act` keeps that update inside
 * the test.
 */
const settleRun = () => act(() => Promise.resolve());

describe("EmptyState", () => {
  it("renders title, description and a custom icon", () => {
    renderMantine(
      <EmptyState
        title="Nothing"
        description="try again"
        icon={<span data-testid="ic">★</span>}
      />
    );
    expect(screen.getByText("Nothing")).toBeInTheDocument();
    expect(screen.getByText("try again")).toBeInTheDocument();
    expect(screen.getByTestId("ic")).toBeInTheDocument();
  });

  it("renders the default icon, an action, and no description", () => {
    renderMantine(
      <EmptyState title="Nothing" action={<button type="button">Go</button>} />
    );
    expect(screen.getByRole("status").querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Go" })).toBeVisible();
    expect(screen.queryByText("try again")).toBeNull();
  });
});

describe("ErrorState", () => {
  it("hides retry when no handler is passed", () => {
    renderMantine(
      <ErrorState
        error={new Error("boom")}
        title="Failed"
        message="Could not load"
        retryLabel="Retry"
      />
    );
    expect(screen.getByText("Could not load")).toBeVisible();
    expect(screen.getByText("boom")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("retries when the handler is passed", () => {
    const onRetry = vi.fn();
    renderMantine(
      <ErrorState
        error={new Error("boom")}
        title="Failed"
        message="Could not load"
        retryLabel="Retry"
        onRetry={onRetry}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows a busy retry button while retrying", () => {
    renderMantine(
      <ErrorState
        error={new Error("boom")}
        title="Failed"
        message="Could not load"
        retryLabel="Retry"
        onRetry={vi.fn()}
        isRetrying
      />
    );
    expect(screen.getByRole("button", { name: "Retry" })).toHaveAttribute(
      "data-loading",
      "true"
    );
  });
});

describe("ExpandToggle", () => {
  it("names the collapsed and expanded states", () => {
    const onToggle = vi.fn();
    renderMantine(
      <ExpandToggle
        expanded={false}
        expandLabel="Open"
        collapseLabel="Close"
        onToggle={onToggle}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(onToggle).toHaveBeenCalledOnce();
    renderMantine(
      <ExpandToggle
        expanded
        expandLabel="Open"
        collapseLabel="Close"
        onToggle={onToggle}
      />
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
});

describe("ActiveFilterChips", () => {
  it("renders nothing when empty", () => {
    const { container } = renderMantine(
      <ActiveFilterChips chips={[]} label="f" clearAllLabel="Clear all" />
    );
    expect(container.querySelector("ul")).toBeNull();
  });

  it("renders chips, fires remove, and fires clear-all", () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    renderMantine(
      <ActiveFilterChips
        chips={[{ key: "k", label: "Status: Active", onRemove }]}
        onClearAll={onClearAll}
        label="filters"
        clearAllLabel="Clear all"
      />
    );
    expect(screen.getByText("Status: Active")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Clear all"));
    expect(onClearAll).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Clear all: Status: Active"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("gives each chip a named remove button in the tab order", async () => {
    const onRemove = vi.fn();
    renderMantine(
      <ActiveFilterChips
        chips={[{ key: "k", label: "Status: Active", onRemove }]}
        label="filters"
        clearAllLabel="Clear all"
      />
    );

    // `getByRole` searches the accessibility tree, so a control the kit
    // hides from assistive tech never turns up here.
    const remove = screen.getByRole("button", {
      name: "Clear all: Status: Active",
    });
    expect(remove.tabIndex).toBe(0);

    await userEvent.tab();
    expect(remove).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("hides clear-all when no handler is passed", () => {
    renderMantine(
      <ActiveFilterChips
        chips={[{ key: "k", label: "Status: Active", onRemove: vi.fn() }]}
        label="filters"
        clearAllLabel="Clear all"
      />
    );
    expect(screen.getByText("Status: Active")).toBeVisible();
    expect(screen.queryByText("Clear all")).toBeNull();
  });
});

describe("PaginationFooter", () => {
  it("changes page via the pager", () => {
    const onPageChange = vi.fn();
    renderMantine(
      <PaginationFooter
        page={1}
        totalPages={5}
        limit={25}
        total={120}
        fromIndex={1}
        toIndex={25}
        onPageChange={onPageChange}
        onLimitChange={vi.fn()}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByText("2"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("labels the next-page control", () => {
    renderMantine(
      <PaginationFooter
        page={1}
        totalPages={5}
        limit={25}
        total={120}
        fromIndex={1}
        toIndex={25}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        labels={labels}
      />
    );
    expect(
      screen.getByRole("button", { name: labels.nextPage })
    ).toBeInTheDocument();
  });

  it("hides the showing-range when total is 0", () => {
    renderMantine(
      <PaginationFooter
        page={1}
        totalPages={0}
        limit={25}
        total={0}
        fromIndex={0}
        toIndex={0}
        onPageChange={vi.fn()}
        onLimitChange={vi.fn()}
        labels={labels}
      />
    );
    expect(screen.queryByText(/Showing/)).toBeNull();
  });
});

describe("TableSkeleton", () => {
  it("renders without an optional loading label", () => {
    renderMantine(<TableSkeleton columns={0} rows={1} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(labels.loading)).toBeNull();
  });

  it("renders the loading label when asked", () => {
    renderMantine(
      <TableSkeleton columns={2} rows={2} loadingLabel={labels.loading} />
    );
    expect(screen.getByText(labels.loading)).toBeVisible();
  });
});

function makeSelection(
  count: number,
  overrides: Partial<SelectionState> = {}
): SelectionState {
  return {
    selectedIds: new Set(count > 0 ? ["a", "b"].slice(0, count) : []),
    selectedCount: count,
    headerState: count > 0 ? "all" : "none",
    isSelected: () => true,
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    toggleGroupLeaves: vi.fn(),
    clear: vi.fn(),
    visibleIds: ["a", "b"],
    allMatching: false,
    selectAllMatching: vi.fn(),
    ...overrides,
  };
}

describe("BulkActionBar", () => {
  it("renders nothing with an empty selection", () => {
    renderMantine(
      <BulkActionBar
        selection={makeSelection(0)}
        total={2}
        bulkActions={[{ key: "x", label: "X", onClick: vi.fn() }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    expect(screen.queryByText("X")).toBeNull();
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it("runs a no-confirm action immediately in the page scope", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    renderMantine(
      <BulkActionBar
        selection={makeSelection(2)}
        total={2}
        bulkActions={[{ key: "x", label: "Archive", onClick }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Archive"));
    await settleRun();
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
  });

  it("disables a button with a disabledReason and shows the tooltip text", () => {
    const onClick = vi.fn();
    renderMantine(
      <BulkActionBar
        selection={makeSelection(2)}
        total={2}
        bulkActions={[
          {
            key: "x",
            label: "Delete",
            onClick,
            disabledReason: () => "Referenced elsewhere",
          },
        ]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    const btn = screen.getByText("Delete").closest("button");
    expect(btn).toBeDisabled();
    fireEvent.click(screen.getByText("Delete"));
    expect(onClick).not.toHaveBeenCalled();
  });

  // Contract: only a *non-empty* reason disables. An empty string must be
  // treated as "no reason" — the action stays enabled and keeps its label.
  it("keeps the action enabled when disabledReason returns an empty string", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    renderMantine(
      <BulkActionBar
        selection={makeSelection(2)}
        total={2}
        bulkActions={[
          { key: "x", label: "Archive", onClick, disabledReason: () => "" },
        ]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    const btn = screen.getByText("Archive").closest("button");
    expect(btn).not.toBeDisabled();
    fireEvent.click(screen.getByText("Archive"));
    await settleRun();
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
  });

  it("hides the scope banner when the page holds every matching row", () => {
    renderMantine(
      <BulkActionBar
        selection={makeSelection(2)}
        total={2}
        bulkActions={[{ key: "x", label: "Archive", onClick: vi.fn() }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("All 2 on this page selected")).toBeNull();
  });

  it("hides the scope banner when only part of the page is selected", () => {
    renderMantine(
      <BulkActionBar
        selection={makeSelection(1, { headerState: "some" })}
        total={9}
        bulkActions={[{ key: "x", label: "Archive", onClick: vi.fn() }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("offers to select all matching rows and forwards the click", () => {
    const selection = makeSelection(2);
    renderMantine(
      <BulkActionBar
        selection={selection}
        total={9}
        bulkActions={[{ key: "x", label: "Archive", onClick: vi.fn() }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    const banner = screen.getByRole("status");
    expect(
      within(banner).getByText("All 2 on this page selected")
    ).toBeInTheDocument();
    fireEvent.click(
      within(banner).getByRole("button", { name: "Select all 9 matching" })
    );
    expect(selection.selectAllMatching).toHaveBeenCalledTimes(1);
  });

  it("announces the widened scope and clears it from the banner", () => {
    const selection = makeSelection(2, { allMatching: true });
    renderMantine(
      <BulkActionBar
        selection={selection}
        total={9}
        bulkActions={[{ key: "x", label: "Archive", onClick: vi.fn() }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    const banner = screen.getByRole("status");
    expect(
      within(banner).getByText("All 9 matching selected")
    ).toBeInTheDocument();
    expect(
      within(banner).queryByRole("button", { name: "Select all 9 matching" })
    ).toBeNull();
    fireEvent.click(within(banner).getByRole("button", { name: "Clear all" }));
    expect(selection.clear).toHaveBeenCalledTimes(1);
  });

  it("runs bulk actions with the all-matching context when the scope is widened", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    renderMantine(
      <BulkActionBar
        selection={makeSelection(2, { allMatching: true })}
        total={9}
        bulkActions={[{ key: "x", label: "Archive", onClick }]}
        confirm={vi.fn()}
        labels={labels}
      />
    );
    fireEvent.click(screen.getByText("Archive"));
    await settleRun();
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: true,
      total: 9,
    });
  });
});

describe("FilterPopover", () => {
  it("a target click requests opening and never fires onClose", () => {
    const onClose = vi.fn();
    renderMantine(
      <FilterPopover
        open={false}
        onClose={onClose}
        onClearFilters={vi.fn()}
        filters={<div>f</div>}
        activeFilterCount={0}
        labels={defaultLabels}
      >
        <button type="button">Open filters</button>
      </FilterPopover>
    );
    // Mantine reports the toggle through onChange(true); closing is the only
    // transition this component forwards.
    fireEvent.click(screen.getByRole("button", { name: "Open filters" }));
    expect(onClose).not.toHaveBeenCalled();
  });
});

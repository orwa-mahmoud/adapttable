/**
 * The status bar, checked on what it says rather than how it looks.
 *
 * Its whole job is composition — counts from the source, the selection
 * size, and the sums from {@link SelectionStatsChrome} — so the tests are
 * about what reaches the slot and in what order, and about the one
 * editorial decision it makes: an empty selection is not reported.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBarChrome, type StatusBarSlots } from "./StatusBarChrome";

const slots: StatusBarSlots = {
  Bar: ({ items, stats, className }) => (
    <div data-testid="bar" className={className}>
      {items.map((item) => (
        <span key={item.key} data-testid={`item-${item.key}`}>
          {item.text}
        </span>
      ))}
      {stats}
    </div>
  ),
  stats: {
    Stats: ({ parts }) => (
      <output data-testid="stats">{parts.map((p) => p.text).join(" ")}</output>
    ),
  },
};

const RANGE = {
  cells: 4,
  numeric: 4,
  sum: 10,
  average: 2.5,
  min: 1,
  max: 4,
};

describe("StatusBarChrome", () => {
  it("reads how many rows are shown out of how many there are", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        total={200}
        selected={0}
        stats={null}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-rows")).toHaveTextContent(
      "Showing 1–10 of 200"
    );
  });

  it("says nothing about a selection there is none of", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        total={10}
        selected={0}
        stats={null}
        slots={slots}
      />
    );

    expect(screen.queryByTestId("item-selected")).toBeNull();
  });

  it("counts the selection once there is one", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        total={10}
        selected={3}
        stats={null}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-selected")).toHaveTextContent("3 selected");
  });

  it("falls back to the row count when the source has no total", () => {
    render(
      <StatusBarChrome
        enabled
        shown={7}
        selected={0}
        stats={null}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-rows")).toHaveTextContent(
      "Showing 1–7 of 7"
    );
  });

  it("reads the range of the page it is actually on", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        page={6}
        limit={10}
        total={200}
        selected={0}
        stats={null}
        slots={slots}
      />
    );

    // The footer says 51–60 on this page, and so must this.
    expect(screen.getByTestId("item-rows")).toHaveTextContent(
      "Showing 51–60 of 200"
    );
  });

  it("counts from zero rather than one when there are no rows", () => {
    render(
      <StatusBarChrome
        enabled
        shown={0}
        total={0}
        selected={0}
        stats={null}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-rows")).toHaveTextContent(
      "Showing 0–0 of 0"
    );
  });

  it("hands the selection figures to the stats slot it was given", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        total={10}
        selected={4}
        stats={RANGE}
        slots={slots}
      />
    );

    expect(screen.getByTestId("stats").textContent).toContain("Sum 10");
  });

  it("renders the statistics alone when the host did not ask for a bar", () => {
    render(
      <StatusBarChrome
        enabled={false}
        shown={10}
        total={10}
        selected={4}
        stats={RANGE}
        slots={slots}
      />
    );

    expect(screen.queryByTestId("bar")).toBeNull();
    expect(screen.getByTestId("stats").textContent).toContain("Sum 10");
  });

  it("draws no stats strip when nothing is range-selected", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        total={10}
        selected={0}
        stats={null}
        slots={slots}
      />
    );

    expect(screen.queryByTestId("stats")).toBeNull();
  });

  it("uses the host's own words when it has them", () => {
    render(
      <StatusBarChrome
        enabled
        shown={5}
        total={50}
        selected={2}
        stats={null}
        labels={{
          showing: ({ from, to, total }) => `${from} bis ${to} von ${total}`,
          selectedCount: (count) => `${count} ausgewählt`,
        }}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-rows")).toHaveTextContent("1 bis 5 von 50");
    expect(screen.getByTestId("item-selected")).toHaveTextContent(
      "2 ausgewählt"
    );
  });

  it("lists feature notices ahead of the counts when the bar is on", () => {
    render(
      <StatusBarChrome
        enabled
        shown={10}
        total={10}
        selected={0}
        stats={null}
        notices={[
          {
            kind: "virtualize-paged",
            appearance: "one-page",
            message: "One page at a time",
          },
        ]}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-virtualize-paged")).toHaveTextContent(
      "One page at a time"
    );
    expect(screen.getByTestId("item-rows")).toBeInTheDocument();
  });

  it("shows a notice even when the host did not ask for the status bar", () => {
    render(
      <StatusBarChrome
        enabled={false}
        shown={10}
        total={10}
        selected={0}
        stats={null}
        notices={[
          {
            kind: "edit-without-writer",
            appearance: "off",
            message: "Editing is off",
          },
        ]}
        slots={slots}
      />
    );

    expect(screen.getByTestId("item-edit-without-writer")).toHaveTextContent(
      "Editing is off"
    );
    expect(screen.queryByTestId("item-rows")).toBeNull();
  });

  it("passes the kit's class straight through", () => {
    render(
      <StatusBarChrome
        enabled
        shown={1}
        total={1}
        selected={0}
        stats={null}
        className="kit-strip"
        slots={slots}
      />
    );

    expect(screen.getByTestId("bar")).toHaveClass("kit-strip");
  });
});

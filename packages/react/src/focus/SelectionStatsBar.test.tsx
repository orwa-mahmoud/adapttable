/**
 * The strip itself: when it appears, and what it says.
 */
import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  SelectionStatsChrome,
  type SelectionStatsChromeProps,
  type SelectionStatsSlots,
} from "./SelectionStatsBar";

const STATS = {
  cells: 4,
  numeric: 3,
  sum: 1240.5,
  average: 413.5,
  min: 12,
  max: 900,
};

const slots: SelectionStatsSlots = {
  Stats: ({ parts }) => (
    <output>
      {parts.map((part) => (
        <span key={part.key}>{part.text}</span>
      ))}
    </output>
  ),
};

function SelectionStatsBar(
  props: Readonly<Omit<SelectionStatsChromeProps, "slots">>
) {
  return <SelectionStatsChrome {...props} slots={slots} />;
}

describe("SelectionStatsChrome", () => {
  it("says nothing without statistics", () => {
    const { container } = render(<SelectionStatsBar stats={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("says nothing about a single cell", () => {
    // One cell has no total worth reading, and a strip that flickers in on
    // every arrow press is noise.
    const { container } = render(
      <SelectionStatsBar stats={{ ...STATS, cells: 1 }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mounts the adapter strip as a component so kit hooks stay valid", () => {
    const hookedSlots: SelectionStatsSlots = {
      Stats: ({ parts }) => {
        const [ready] = useState(true);
        return ready ? <output>{parts[0]?.text}</output> : null;
      },
    };
    const { rerender } = render(
      <SelectionStatsChrome stats={null} slots={hookedSlots} />
    );
    rerender(<SelectionStatsChrome stats={STATS} slots={hookedSlots} />);
    expect(screen.getByText("Count 4")).toBeInTheDocument();
  });

  it("reads the figures in the host's number format", () => {
    render(<SelectionStatsBar stats={STATS} locale="en-US" />);
    expect(screen.getByText("Count 4")).toBeInTheDocument();
    expect(screen.getByText("Sum 1,240.5")).toBeInTheDocument();
    expect(screen.getByText("Avg 413.5")).toBeInTheDocument();
    expect(screen.getByText("Min 12")).toBeInTheDocument();
    expect(screen.getByText("Max 900")).toBeInTheDocument();
  });

  it("shows only the count when the selection holds no numbers", () => {
    render(
      <SelectionStatsBar
        stats={{
          cells: 4,
          numeric: 0,
          sum: null,
          average: null,
          min: null,
          max: null,
        }}
      />
    );
    expect(screen.getByText("Count 4")).toBeInTheDocument();
    expect(screen.queryByText(/Sum/)).not.toBeInTheDocument();
  });

  it("takes each figure's word from the labels", () => {
    render(
      <SelectionStatsBar
        stats={STATS}
        locale="en-US"
        labels={{ selectionSum: "Total" }}
      />
    );
    expect(screen.getByText("Total 1,240.5")).toBeInTheDocument();
  });

  it("is a status region, so it is read after the range announcement", () => {
    render(<SelectionStatsBar stats={STATS} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

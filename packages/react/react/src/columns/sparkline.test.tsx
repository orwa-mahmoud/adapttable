import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  finiteSparklineValues,
  Sparkline,
  sparklineColumn,
  sparklineExportValue,
  sparklineSummary,
} from "./sparkline";

describe("finiteSparklineValues", () => {
  it("drops non-finite points", () => {
    expect(finiteSparklineValues([1, Number.NaN, 2, Infinity, 3])).toEqual([
      1, 2, 3,
    ]);
  });
});

describe("sparklineSummary", () => {
  it("describes empty, single and multi series", () => {
    expect(sparklineSummary([])).toBe("no values");
    expect(sparklineSummary([42])).toBe("1 value, 42");
    expect(sparklineSummary([2, 8, 5])).toBe("3 values, min 2, max 8, last 5");
  });
});

describe("sparklineExportValue", () => {
  it("joins the finite numbers", () => {
    expect(sparklineExportValue([1, Number.NaN, 2])).toBe("1, 2");
  });
});

describe("Sparkline", () => {
  it("renders an accessible line chart", () => {
    render(<Sparkline values={[1, 3, 2]} />);
    const chart = screen.getByRole("img", {
      name: "3 values, min 1, max 3, last 2",
    });
    expect(chart).toHaveAttribute("data-kind", "line");
    expect(chart.querySelector("path")).not.toBeNull();
  });

  it("draws bars and an area", () => {
    const { rerender } = render(<Sparkline values={[1, 2, 3]} kind="bar" />);
    expect(screen.getByRole("img").querySelectorAll("rect")).toHaveLength(3);
    rerender(<Sparkline values={[1, 2, 3]} kind="area" />);
    expect(screen.getByRole("img").querySelectorAll("path")).toHaveLength(2);
  });

  it("draws a one-point line", () => {
    render(<Sparkline values={[7]} kind="line" />);
    expect(
      screen.getByRole("img").querySelector("path")?.getAttribute("d")
    ).toContain("M");
  });

  it("accepts a host label and stays empty-safe", () => {
    render(<Sparkline values={[]} label="quiet" />);
    expect(screen.getByRole("img", { name: "quiet" })).toBeInTheDocument();
  });

  it("keeps a flat series on the midline", () => {
    render(<Sparkline values={[5, 5, 5]} width={40} height={20} color="red" />);
    expect(screen.getByRole("img")).toHaveAttribute("width", "40");
  });
});

describe("sparklineColumn", () => {
  interface Row {
    id: string;
    history: number[];
  }

  const column = sparklineColumn<Row>({
    key: "trend",
    header: "Trend",
    values: (row) => row.history,
    kind: "bar",
  });

  it("sorts and exports the numbers, not the SVG", () => {
    const row = { id: "a", history: [4, 9, 6] };
    expect(column.sortValue?.(row)).toBe(6);
    expect(column.exportValue?.(row)).toBe("4, 9, 6");
    expect(column.sortValue?.({ id: "b", history: [] })).toBeUndefined();
  });

  it("renders the chart from the row", () => {
    const node = column.accessor?.({ id: "a", history: [1, 4, 2] });
    render(<>{node}</>);
    expect(
      screen.getByRole("img", { name: "3 values, min 1, max 4, last 2" })
    ).toHaveAttribute("data-kind", "bar");
  });

  it("forwards a host label", () => {
    const labeled = sparklineColumn<Row>({
      key: "trend",
      values: (row) => row.history,
      label: (values, row) => `${row.id}:${values.length}`,
    });
    render(<>{labeled.accessor?.({ id: "z", history: [1, 2] })}</>);
    expect(screen.getByRole("img", { name: "z:2" })).toBeInTheDocument();
  });
});

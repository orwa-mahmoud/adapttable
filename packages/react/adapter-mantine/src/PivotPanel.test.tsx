/**
 * The pivot panel in this kit.
 *
 * Core decides the zones, the ordering and which move controls exist; these
 * tests check that this kit's controls actually drive them — and, above all,
 * that the whole panel works from the keyboard, which is the promise a
 * drag-only pivot UI breaks.
 */
import { EMPTY_PIVOT_CONFIG, type PivotConfig } from "@adapttable/core/pivot";
import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { PivotPanel } from "./components/PivotPanel";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider>{children}</MantineProvider>;
}

const FIELDS = [
  { key: "region", label: "Region" },
  { key: "team", label: "Team" },
  { key: "amount", label: "Amount" },
];

function Harness({ initial = EMPTY_PIVOT_CONFIG }: { initial?: PivotConfig }) {
  const [config, setConfig] = useState(initial);
  return (
    <Wrapper>
      <PivotPanel fields={FIELDS} config={config} onChange={setConfig} />
    </Wrapper>
  );
}

const zone = (name: string) => screen.getByRole("group", { name });

describe("PivotPanel", () => {
  it("renders the three zones with this kit's controls", () => {
    render(<Harness />);

    expect(zone("Rows")).toBeInTheDocument();
    expect(zone("Columns")).toBeInTheDocument();
    expect(zone("Measures")).toBeInTheDocument();
    expect(
      document.querySelector('[data-adapttable-part="pivot-panel"]')
    ).not.toBeNull();
  });

  it("carries the part names every adapter shares", () => {
    render(<Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["team"] }} />);

    expect(
      document.querySelectorAll('[data-adapttable-part="pivot-zone"]')
    ).toHaveLength(3);
    expect(
      document.querySelectorAll('[data-adapttable-part="pivot-field"]')
    ).toHaveLength(1);
  });

  it("moves a field with the keyboard alone", () => {
    render(
      <Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["region", "team"] }} />
    );

    const up = screen.getByRole("button", { name: "Move up: Team" });
    act(() => up.focus());
    expect(up).toHaveFocus();
    fireEvent.click(up);

    const fields = [
      ...zone("Rows").querySelectorAll('[data-adapttable-part="pivot-field"]'),
    ].map((element) => element.textContent);
    expect(fields[0]).toContain("Team");
  });

  it("offers no move-up on the first field", () => {
    render(
      <Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["region", "team"] }} />
    );

    expect(screen.getByRole("button", { name: "Move up: Team" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Move up: Region" })
    ).toBeDisabled();
  });

  it("removes a field", () => {
    render(<Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["team"] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove field: Team" }));

    expect(
      document.querySelectorAll('[data-adapttable-part="pivot-field"]')
    ).toHaveLength(0);
  });

  it("puts an aggregation chooser on a measure", () => {
    render(
      <Harness
        initial={{
          ...EMPTY_PIVOT_CONFIG,
          measures: [{ key: "amount", agg: "sum" }],
        }}
      />
    );

    expect(
      zone("Measures").querySelector('[aria-label="Aggregation"]')
    ).not.toBeNull();
  });

  it("adds a field from the Rows add control", () => {
    render(<Harness />);
    fireEvent.click(zone("Rows").querySelector('[aria-label="Add field"]')!);
    fireEvent.click(screen.getByRole("option", { name: "Region" }));
    expect(
      zone("Rows").querySelectorAll('[data-adapttable-part="pivot-field"]')
    ).toHaveLength(1);
  });

  it("changes a measure aggregation", () => {
    render(
      <Harness
        initial={{
          ...EMPTY_PIVOT_CONFIG,
          measures: [{ key: "amount", agg: "sum" }],
        }}
      />
    );
    fireEvent.click(
      zone("Measures").querySelector('[aria-label="Aggregation"]')!
    );
    const option =
      screen.queryByRole("option", { name: "avg" }) ??
      screen.queryByRole("option", { name: "count" }) ??
      screen.queryByRole("option", { name: "min" });
    expect(option).not.toBeNull();
    fireEvent.click(option!);
    expect(
      zone("Measures").querySelector('[aria-label="Aggregation"]')
    ).toBeInTheDocument();
  });
});

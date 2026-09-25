/**
 * The pivot panel's structure and keyboard path, against a minimal slot set.
 *
 * The slots here are plain HTML on purpose: what is being tested is what core
 * decides — which zones exist, which move buttons are offered, what each
 * button does to the configuration — not what any kit's button looks like.
 */
import {
  EMPTY_PIVOT_CONFIG,
  type PivotConfig,
  type PivotField,
} from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PivotPanelChrome, type PivotPanelSlots } from "./PivotPanelChrome";

const FIELDS: PivotField[] = [
  { key: "region", label: "Region" },
  { key: "team", label: "Team" },
  { key: "amount", label: "Amount" },
];

const slots: PivotPanelSlots = {
  Surface: ({ children, ...rest }) => <div {...rest}>{children}</div>,
  Zone: ({ zone, label, children, ...rest }) => (
    <section aria-label={label} data-zone={zone} {...rest}>
      {children}
    </section>
  ),
  Field: ({
    label,
    onMoveUp,
    onMoveDown,
    onRemove,
    moveUpLabel,
    moveDownLabel,
    removeLabel,
    aggregation,
    ...rest
  }) => (
    <div data-field={label} {...rest}>
      <span>{label}</span>
      {onMoveUp && (
        <button type="button" onClick={onMoveUp}>
          {`${moveUpLabel} ${label}`}
        </button>
      )}
      {onMoveDown && (
        <button type="button" onClick={onMoveDown}>
          {`${moveDownLabel} ${label}`}
        </button>
      )}
      <button type="button" onClick={onRemove}>
        {`${removeLabel} ${label}`}
      </button>
      {aggregation}
    </div>
  ),
  Add: ({ label, options, onAdd }) => (
    <select
      aria-label={label}
      value=""
      onChange={(event) => {
        onAdd(event.target.value);
      }}
    >
      <option value="" />
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Agg: ({ label, value, options, onChange }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value as never);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
};

function Harness({
  initial = EMPTY_PIVOT_CONFIG,
  onChange,
}: Readonly<{
  initial?: PivotConfig;
  onChange?: (next: PivotConfig) => void;
}>) {
  const [config, setConfig] = useState(initial);
  return (
    <PivotPanelChrome
      fields={FIELDS}
      config={config}
      slots={slots}
      onChange={(next) => {
        setConfig(next);
        onChange?.(next);
      }}
    />
  );
}

const zone = (name: string) => screen.getByRole("region", { name });

describe("PivotPanelChrome", () => {
  it("shows the three zones", () => {
    render(<Harness />);

    expect(zone("Rows")).toBeInTheDocument();
    expect(zone("Columns")).toBeInTheDocument();
    expect(zone("Measures")).toBeInTheDocument();
  });

  it("adds a field to the zone whose control was used", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.change(zone("Rows").querySelector("select")!, {
      target: { value: "team" },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ rows: ["team"] })
    );
  });

  it("offers a dimension only where it is not already used", () => {
    render(<Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["team"] }} />);
    const columnOptions = [
      ...(zone("Columns").querySelectorAll("option") ?? []),
    ].map((option) => option.textContent);

    expect(columnOptions).not.toContain("Team");
    expect(columnOptions).toContain("Region");
  });

  it("offers every field as a measure, because measures may repeat", () => {
    render(
      <Harness
        initial={{
          ...EMPTY_PIVOT_CONFIG,
          measures: [{ key: "amount", agg: "sum" }],
        }}
      />
    );
    const options = [...zone("Measures").querySelectorAll("option")].map(
      (option) => option.textContent
    );

    expect(options).toContain("Amount");
  });

  it("withholds the move controls at each end", () => {
    render(
      <Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["region", "team"] }} />
    );

    // The first field cannot go up, the last cannot go down.
    expect(screen.queryByRole("button", { name: "Move up Region" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Move down Team" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Move down Region" })
    ).toBeInTheDocument();
  });

  it("reorders a field with the keyboard alone", () => {
    render(
      <Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["region", "team"] }} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Move up Team" }));

    const fields = [...zone("Rows").querySelectorAll("[data-field]")].map(
      (element) => element.getAttribute("data-field")
    );
    expect(fields).toEqual(["Team", "Region"]);
  });

  it("removes a field", () => {
    render(<Harness initial={{ ...EMPTY_PIVOT_CONFIG, rows: ["team"] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove field Team" }));

    expect(zone("Rows").querySelectorAll("[data-field]")).toHaveLength(0);
  });

  it("puts an aggregation chooser on measures and nowhere else", () => {
    render(
      <Harness
        initial={{
          ...EMPTY_PIVOT_CONFIG,
          rows: ["team"],
          measures: [{ key: "amount", agg: "sum" }],
        }}
      />
    );

    expect(
      zone("Measures").querySelector('[aria-label="Aggregation"]')
    ).not.toBeNull();
    expect(zone("Rows").querySelector('[aria-label="Aggregation"]')).toBeNull();
  });

  it("changes what a measure computes", () => {
    const onChange = vi.fn();
    render(
      <Harness
        onChange={onChange}
        initial={{
          ...EMPTY_PIVOT_CONFIG,
          measures: [{ key: "amount", agg: "sum" }],
        }}
      />
    );

    fireEvent.change(
      zone("Measures").querySelector('[aria-label="Aggregation"]')!,
      { target: { value: "avg" } }
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ measures: [{ key: "amount", agg: "avg" }] })
    );
  });

  it("shows a custom aggregator as sum rather than breaking the chooser", () => {
    render(
      <Harness
        initial={{
          ...EMPTY_PIVOT_CONFIG,
          measures: [{ key: "amount", agg: () => 1, label: "Custom" }],
        }}
      />
    );

    expect(screen.getByText("Custom")).toBeInTheDocument();
  });
});

/**
 * The per-column header filter, drawn with MUI's own controls.
 *
 * These are the smallest controls in the table and the easiest to wire
 * wrongly: each one writes straight into the active filter model, so a change
 * handler that drops its value leaves a filter the reader set and the table
 * never applied.
 */
import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
} from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { FilterHeaderControl } from "./components/kitControls";
import { renderMui } from "./test-utils";

function Harness<T>({
  def,
  onWrite,
}: Readonly<{ def: FilterDef<T>; onWrite: (extra: ExtraFilters) => void }>) {
  const [extra, setExtra] = useState<ExtraFilters>({});
  return (
    <FilterHeaderControl
      def={def}
      labels={defaultLabels}
      source={{
        extra,
        setExtra: (key, value) => {
          const next = { ...extra, [key]: value };
          onWrite(next);
          setExtra(next);
        },
        setExtras: (updates) => {
          const next = { ...extra, ...updates };
          onWrite(next);
          setExtra(next);
        },
      }}
    />
  );
}

describe("MUI header filter controls", () => {
  it("writes what was typed into a text filter", () => {
    const writes: ExtraFilters[] = [];
    renderMui(
      <Harness
        def={{ key: "person", type: "text", label: "Person" }}
        onWrite={(extra) => writes.push(extra)}
      />
    );

    fireEvent.change(screen.getByLabelText("Person"), {
      target: { value: "Ada" },
    });

    expect(writes.at(-1)).toMatchObject({ person: "Ada" });
  });

  it("writes the number a range end was given", () => {
    const writes: ExtraFilters[] = [];
    renderMui(
      <Harness
        def={{
          key: "salary",
          type: "numberRange",
          label: "Salary",
        }}
        onWrite={(extra) => writes.push(extra)}
      />
    );

    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0]!, { target: { value: "100" } });

    // The pair writes two keys; what matters is that the value survives the
    // control rather than being dropped on its way to the filter model.
    expect(JSON.stringify(writes.at(-1))).toContain("100");
  });
});

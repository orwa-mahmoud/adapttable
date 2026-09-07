/**
 * The relative-date filter widget in Base UI's own controls.
 *
 * It is the one range widget whose value is a TOKEN rather than a date — a
 * preset name, sometimes with a count — so a kit that renders it wrongly
 * writes a filter the table cannot read back. Every kit draws it, so every
 * kit proves it.
 */
import {
  defaultLabels,
  type ExtraFilters,
  type FilterDef,
} from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { AutoFilterForm } from "./components/AutoFilterForm";
import { renderBaseUi } from "./test-utils";

const SHIPPED: FilterDef<unknown>[] = [{ key: "shipped", type: "dateRange" }];

function RangeHarness({
  initial,
  onPatch,
}: Readonly<{
  initial: ExtraFilters;
  onPatch: (updates: ExtraFilters) => void;
}>) {
  const [extra, setExtra] = useState<ExtraFilters>(initial);
  return (
    <AutoFilterForm
      defs={SHIPPED}
      labels={defaultLabels}
      source={{
        extra,
        setExtra: () => undefined,
        setExtras: (updates) => {
          onPatch(updates);
          setExtra((prev) => ({ ...prev, ...updates }));
        },
      }}
    />
  );
}

describe("Base UI relative date filter", () => {
  it("shows the count a last-N preset carries, and writes a new token", () => {
    const patches: ExtraFilters[] = [];
    renderBaseUi(
      <RangeHarness
        initial={{ shippedOp: "relative", shippedFrom: "last:7" }}
        onPatch={(updates) => patches.push(updates)}
      />
    );

    // The rendered control differs per kit — a number input here, a spin
    // button there — so what is asserted is the token it writes, not how it
    // draws the seven.
    const count = screen.getByLabelText(defaultLabels.value);

    fireEvent.change(count, { target: { value: "14" } });

    // The token, not a date: "last:14" is what the table reads back.
    expect(patches.at(-1)).toMatchObject({ shippedFrom: "last:14" });
  });

  it("draws no count for a preset that does not take one", () => {
    renderBaseUi(
      <RangeHarness
        initial={{ shippedOp: "relative", shippedFrom: "today" }}
        onPatch={() => undefined}
      />
    );

    // "Today" needs no number, and offering one would invite a token the
    // table cannot parse.
    expect(screen.queryByLabelText(defaultLabels.value)).toBeNull();
  });
});

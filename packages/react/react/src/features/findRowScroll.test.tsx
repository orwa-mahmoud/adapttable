import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { FindInTableState } from "../find/useFindInTable";
import { RowScrollContext } from "../virtual/rowScroll";
import { findInTable, LiveFind } from "./find-in-table";
import { FeatureProviders } from "./providers";
import type { FindLiveSlotProps } from "./slotKeys";
import { applyTableFeatures } from "./tableFeature";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 1000 }, (_, i) => ({
  id: String(i),
  name: i === 40 || i === 900 ? `Needle ${i}` : `Person ${i}`,
}));
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * Find hands the virtualized body each row its walk lands on, so the window
 * can bring it into view: the body is mounted above find, and this context is
 * the only way down.
 */
function mount(scrollToRow: ((row: Row) => void) | null) {
  const props = applyTableFeatures({ features: [findInTable()] });
  let find: FindInTableState | undefined;
  render(
    <FeatureProviders props={props}>
      <RowScrollContext.Provider value={scrollToRow}>
        <LiveFind<Row>
          {...({
            enabled: true,
            rows: ROWS,
            columns,
            urlSync: false,
            children: (state) => {
              find = state;
              return null;
            },
          } satisfies FindLiveSlotProps<Row>)}
        />
      </RowScrollContext.Provider>
    </FeatureProviders>
  );
  return () => find!;
}

describe("find brings its match into a virtual window", () => {
  it("asks the window for the row of each match the walk lands on", () => {
    const scrollToRow = vi.fn();
    const find = mount(scrollToRow);

    act(() => {
      find().setOpen(true);
      find().setQuery("Needle");
    });
    expect(scrollToRow).toHaveBeenLastCalledWith(ROWS[40]);

    act(() => find().next());
    expect(scrollToRow).toHaveBeenLastCalledWith(ROWS[900]);

    act(() => find().previous());
    expect(scrollToRow).toHaveBeenLastCalledWith(ROWS[40]);
  });

  it("walks as before where no window is mounted", () => {
    const find = mount(null);

    act(() => {
      find().setOpen(true);
      find().setQuery("Needle");
    });
    act(() => find().next());

    expect(find().current).toEqual({ row: 900, col: 0 });
  });
});

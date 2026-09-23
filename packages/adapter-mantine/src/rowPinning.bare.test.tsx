/**
 * A bare `rowPinning()` pins rows: the table holds the lists, writes them to
 * the URL and reads them back.
 */
import { createMemoryAdapter } from "@adapttable/react";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { grouping } from "./grouping";
import type { ColumnDef } from "./index";
import { rowPinning } from "./row-pinning";
import { renderMantine as renderKit } from "./test-utils";
import { tree } from "./tree";

interface Row {
  id: string;
  name: string;
  team: string;
  parentId?: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Zoe", team: "Core" },
  { id: "2", name: "Ada", team: "Data" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "team", header: "Team", accessor: (r) => r.team },
];

const pinnedTop = () =>
  document.querySelector('[data-adapttable-part="pinned-top"]');
const pinnedBottom = () =>
  document.querySelector('[data-adapttable-part="pinned-bottom"]');

describe("a bare rowPinning() (mantine)", () => {
  it("pins and unpins a row, writing the lists to the URL", () => {
    const adapter = createMemoryAdapter("");
    renderKit(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlAdapter={adapter}
        forceMobile={false}
        features={[rowPinning()]}
      />
    );

    const pin = screen.getAllByRole("button", { name: "Pin to top" });
    expect(pin).toHaveLength(ROWS.length);
    fireEvent.click(pin[1]!);

    expect(pinnedTop()).toHaveTextContent("Ada");
    expect(new URLSearchParams(adapter.getSearch()).get("rowPin")).toBe(
      "2:top"
    );

    fireEvent.click(screen.getByRole("button", { name: "Unpin row" }));
    expect(pinnedTop()).toBeNull();
  });

  it("restores pins from the URL", () => {
    renderKit(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlAdapter={createMemoryAdapter("rowPin=2:top")}
        forceMobile={false}
        features={[rowPinning()]}
      />
    );

    expect(pinnedTop()).toHaveTextContent("Ada");
  });

  it("still refuses to pin a grouped table", () => {
    renderKit(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        features={[rowPinning(), grouping("team")]}
      />
    );

    expect(screen.queryByRole("button", { name: "Pin to top" })).toBeNull();
  });

  it("refuses to pin a tree the same way", () => {
    renderKit(
      <DataTable<Row>
        data={[...ROWS, { id: "3", name: "Kid", team: "Core", parentId: "1" }]}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        features={[
          rowPinning({ pinnedRowIds: { top: ["2"], bottom: [] } }),
          tree({ getParentId: (r) => r.parentId }),
        ]}
      />
    );

    expect(screen.queryByRole("button", { name: "Pin to top" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pin to bottom" })).toBeNull();
    expect(pinnedTop()).toBeNull();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("pins a row to the bottom, uncontrolled with urlSync off", () => {
    renderKit(
      <DataTable<Row>
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile={false}
        features={[rowPinning()]}
      />
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Pin to bottom" })[0]!
    );

    expect(pinnedBottom()).toHaveTextContent("Zoe");
    expect(pinnedTop()).toBeNull();
    expect(
      new URLSearchParams(globalThis.location.search).get("rowPin")
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Unpin row" }));
    expect(pinnedBottom()).toBeNull();
  });
});

import type { GroupAggregateOverrides } from "@adapttable/core";
import { resolveLabels } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/react";
import type { GroupingPanelState } from "@adapttable/react/adapter";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { GroupingPanel } from "./components/GroupingPanel";
import { DataTable } from "./DataTable";
import { groupingPanel } from "./grouping-panel";

interface Row {
  region: string;
  team: string;
  amount: number;
}

const columns: ColumnDef<Row>[] = [
  { key: "region", header: "Region", accessor: (row) => row.region },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
];

function Harness({
  initial = [],
  mobile = false,
  drag,
}: Readonly<{
  initial?: readonly string[];
  mobile?: boolean;
  drag?: NonNullable<GroupingPanelState["drag"]>;
}>) {
  const [groupBy, setGroupBy] = useState(initial);
  const [aggregateOverrides, setAggregateOverrides] =
    useState<GroupAggregateOverrides>({});
  const state: GroupingPanelState = {
    groupBy,
    aggregateOverrides,
    canSetAggregates: true,
    drag,
    announcement: "",
    headerDragProps: () => ({ draggable: true }),
    chipDragProps: () => ({ draggable: true }),
    chipKeyboardProps: (key, label) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Move ${label} grouping`,
      onKeyDown: (event) => {
        const from = groupBy.indexOf(key);
        const delta =
          event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const to = from + delta;
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key
          ) ||
          from < 0 ||
          to < 0 ||
          to >= groupBy.length
        ) {
          return;
        }
        const next = [...groupBy];
        [next[from], next[to]] = [next[to]!, next[from]!];
        setGroupBy(next);
      },
    }),
    dropProps: (index) => ({
      "data-drop-active": drag?.overIndex === index,
    }),
    removeDropProps: () => ({
      "data-drop-active": drag?.overRemove === true,
    }),
    add: (key) => setGroupBy((current) => [...current, key]),
    remove: (key) =>
      setGroupBy((current) => current.filter((item) => item !== key)),
    moveBy: () => undefined,
    setAggregate: (key, value) =>
      setAggregateOverrides((current) => {
        const next = { ...current };
        if (value === undefined) delete next[key];
        else next[key] = value;
        return next;
      }),
  };

  return (
    <GroupingPanel
      state={state}
      columns={columns}
      labels={resolveLabels(undefined)}
      mobile={mobile}
    />
  );
}

const chips = () =>
  [...document.querySelectorAll('[data-adapttable-part="grouping-chip"]')].map(
    (chip) => chip.textContent
  );

describe("GroupingPanel", () => {
  it("renders the shared parts with MUI controls", () => {
    render(<Harness initial={["region"]} />);

    expect(
      screen.getByRole("region", { name: "Row grouping" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Move Region grouping" })
    ).toHaveAttribute("draggable", "true");
    expect(
      screen.getByRole("button", { name: "Remove Region from grouping" })
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-adapttable-part="grouping-drop-zone"]')
    ).toHaveLength(2);
  });

  it("adds a grouping column from the labelled select", () => {
    render(<Harness />);

    fireEvent.mouseDown(
      document.querySelector('[aria-label="Add grouping column"]')!
    );
    fireEvent.click(screen.getByRole("option", { name: "Team" }));

    expect(chips()).toHaveLength(1);
    expect(chips()[0]).toContain("Team");
  });

  it("reorders a chip with an arrow key", () => {
    render(<Harness initial={["region", "team"]} />);

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Move Team grouping" }),
      { key: "ArrowLeft" }
    );

    expect(chips()[0]).toContain("Team");
    expect(chips()[1]).toContain("Region");
  });

  it("removes a grouping chip", () => {
    render(<Harness initial={["region", "team"]} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Region from grouping" })
    );

    expect(chips()).toHaveLength(1);
    expect(chips()[0]).toContain("Team");
  });

  it("sets an aggregate override with labelled selects", () => {
    render(<Harness initial={["team"]} />);

    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Aggregate column" })
    );
    fireEvent.click(screen.getByRole("option", { name: "Amount" }));
    const aggregation = screen.getByRole("combobox", {
      name: "Group aggregation",
    });
    fireEvent.mouseDown(aggregation);
    fireEvent.click(screen.getByRole("option", { name: "Sum" }));

    expect(aggregation).toHaveTextContent("Sum");
  });

  it("wraps controls and omits drag insertion targets on mobile", () => {
    render(<Harness initial={["region"]} mobile />);

    expect(
      document.querySelectorAll('[data-adapttable-part="grouping-drop-zone"]')
    ).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Move Region grouping" })
    ).toHaveStyle({ minHeight: "44px" });
  });

  it("shows active insertion and drop-to-remove states", () => {
    render(
      <Harness
        initial={["region"]}
        drag={{
          key: "region",
          source: "chip",
          overIndex: 0,
          overRemove: true,
        }}
      />
    );

    expect(
      document.querySelector(
        '[data-adapttable-part="grouping-drop-zone"][data-drop-active="true"]'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", {
        name: "Drop here to remove grouping",
      })
    ).toHaveAttribute("data-drop-active", "true");
  });
});

describe("grouping-panel feature", () => {
  it("mounts the panel above the body and enables header dragging", () => {
    render(
      <DataTable
        data={[{ region: "EMEA", team: "Core", amount: 12 }]}
        columns={columns}
        rowKey={(row) => row.team}
        urlSync={false}
        features={[groupingPanel(["team"])]}
      />
    );

    const panel = document.querySelector(
      '[data-adapttable-part="grouping-panel"]'
    );
    const body = document.querySelector('[data-adapttable-part="tbody"]');
    expect(panel).toBeInTheDocument();
    expect(body).toBeInTheDocument();
    expect(
      panel!.compareDocumentPosition(body!) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      document.querySelector(
        '[data-adapttable-part="header-cell"][data-column-key="team"]'
      )
    ).toHaveAttribute("draggable", "true");
  });
});

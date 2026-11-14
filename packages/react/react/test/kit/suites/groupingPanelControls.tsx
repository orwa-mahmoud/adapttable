import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import {
  type ColumnDef,
  createMemoryAdapter,
  useFrontendData,
} from "@adapttable/react";
import { fireEvent, screen } from "@testing-library/react";
import { useMemo } from "react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

interface Row {
  id: string;
  team: string;
  status: string;
}

const ROWS: readonly Row[] = [
  { id: "1", team: "Core", status: "Open" },
  { id: "2", team: "Web", status: "Done" },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "status", header: "Status", accessor: (row) => row.status },
];

/**
 * The shared grouping-panel suite: every kit's panel reorders its chips from
 * the keyboard, removes one from its own control, and leaves drag-only
 * targets out of the phone layout.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function groupingPanelControlsTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { Table, render } = kit;
  const { groupingPanel } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    function Harness({
      initial,
      mobile,
    }: Readonly<{ initial: readonly string[]; mobile?: boolean }>) {
      const urlAdapter = useMemo(() => createMemoryAdapter(""), []);
      const source = useFrontendData({
        data: ROWS,
        columns: COLUMNS,
        urlAdapter,
      });
      const features = useMemo(
        () => [groupingPanel<Row>(initial, {})],
        [initial]
      );
      return (
        <Table
          source={source}
          columns={COLUMNS}
          rowKey={(row: Row) => row.id}
          forceMobile={mobile}
          features={features}
        />
      );
    }

    /** The grouped columns, in chip order. */
    function grouped(): string[] {
      return [
        ...document.querySelectorAll(
          '[data-adapttable-part="grouping-chip"]'
        ),
      ].map((chip) =>
        chip.textContent?.includes("Team") === true ? "team" : "status"
      );
    }

    describe(`the ${kit.name} grouping panel`, () => {
      it("moves a chip with the arrow keys", () => {
        render(<Harness initial={["team", "status"]} />);
        expect(grouped()).toEqual(["team", "status"]);
        fireEvent.keyDown(
          screen.getByRole("button", { name: "Move Team grouping" }),
          { key: "ArrowRight" }
        );
        expect(grouped()).toEqual(["status", "team"]);
      });

      it("removes a chip from its own control", () => {
        render(<Harness initial={["team"]} />);
        fireEvent.click(
          screen.getByRole("button", { name: "Remove Team from grouping" })
        );
        expect(grouped()).toEqual([]);
      });

      it("leaves the drag-only targets out of the phone layout", () => {
        render(<Harness initial={["team"]} mobile />);
        expect(grouped()).toEqual(["team"]);
        expect(
          document.querySelector('[data-adapttable-part="grouping-drop-zone"]')
        ).toBeNull();
        expect(
          screen.getByRole("button", { name: "Remove Team from grouping" })
        ).toBeInTheDocument();
      });
    });
  });
}

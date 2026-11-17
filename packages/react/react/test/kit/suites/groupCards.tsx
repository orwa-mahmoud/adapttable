import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { resolveLabels } from "@adapttable/react/adapter";
import { fireEvent, screen } from "@testing-library/react";
import { expect, vi } from "vitest";

import { kitComponent, type ReactKitUnderTest } from "../kit";

/**
 * The shared `GroupCards.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function groupCardsTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { render } = kit;
  const GroupHeaderCard = kitComponent(kit, "GroupHeaderCard");
  return collectConformanceTests(({ describe, it }) => {
    interface Row {
      id: string;
      team: string;
    }
    const COLUMNS: ColumnDef<Row>[] = [{ key: "team", header: "Team" }];
    const LABELS = resolveLabels(undefined);

    /**
     * The mobile card version of a group's three rows.
     *
     * Cards are a list, not a grid, so the footer and the "show more" row have to
     * read as their own blocks rather than as a header that lost its chevron.
     */
    describe(`group cards (${kit.name})`, () => {
      it("shows a footer card as a total, with no chevron", () => {
        render(
          <GroupHeaderCard
            entry={{
              kind: "groupFooter",
              key: "group:team:s:Core:footer",
              groupKey: "group:team:s:Core",
              level: 0,
              groupBy: "team",
              label: "Core",
              leafRows: [],
              leafIds: ["1"],
              aggregateCells: { team: "2" },
            }}
            columns={COLUMNS}
            selection={null}
            labels={LABELS}
            onToggleCollapse={() => undefined}
            onShowMore={() => undefined}
          />
        );
        expect(screen.getByText("Core total")).toBeInTheDocument();
        expect(
          document.querySelector('[data-adapttable-part="group-toggle"]')
        ).toBeNull();
      });

      it("shows a more card as a button that asks for the next page", () => {
        const onShowMore = vi.fn();
        render(
          <GroupHeaderCard
            entry={{
              kind: "groupMore",
              key: "group-more:0:",
              level: 0,
              scope: "groups",
              remaining: 7,
              leafRows: [],
              leafIds: [],
              label: "",
            }}
            columns={COLUMNS}
            selection={null}
            labels={LABELS}
            onToggleCollapse={() => undefined}
            onShowMore={onShowMore}
          />
        );
        fireEvent.click(screen.getByText("Show 7 more groups"));
        expect(onShowMore).toHaveBeenCalledExactlyOnceWith({
          scope: "groups",
          groupKey: undefined,
        });
      });
    });
  });
}

import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `serverProps.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function serverPropsTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { Table: DataTable, render } = kit;
  const { filters } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The server-tier props the shared shell reads, typed and honoured here.
     *
     * `error` renders this kit's own error state; `supports` and `facetKeys`
     * reach the query the table sends, and the server's `facets` reach the
     * checklist this kit draws.
     */

    interface Row {
      id: string;
      team: string;
    }
    const ROWS: Row[] = [{ id: "1", team: "Core" }];
    const COLS: ColumnDef<Row>[] = [{ key: "team", header: "Team" }];

    describe(`server-tier props (${kit.name})`, () => {
      it("renders the kit's error state for a forwarded error", () => {
        render(
          <DataTable<Row>
            data={ROWS}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            error={new Error("Backend unavailable")}
          />
        );
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Backend unavailable"
        );
      });

      it("sends the declared facet keys to the server", async () => {
        const seen: { facets?: readonly string[] }[] = [];
        render(
          <DataTable<Row>
            data={ROWS}
            total={1}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            supports={{ facets: true }}
            facetKeys={["team"]}
            facets={{ team: [{ value: "Core", label: "Core", count: 1 }] }}
            onQueryChange={(query) => {
              seen.push(query);
            }}
          />
        );
        await waitFor(() => expect(seen.length).toBeGreaterThan(0));
        expect(seen.at(-1)?.facets).toEqual(["team"]);
      });

      it("counts the checklist from the server's facets, not the loaded page", async () => {
        render(
          <DataTable<Row>
            data={ROWS}
            total={10}
            columns={COLS}
            rowKey={(r) => r.id}
            urlSync={false}
            forceMobile={false}
            supports={{ facets: true }}
            facets={{
              team: [
                { value: "Core", label: "Core", count: 7 },
                { value: "Web", label: "Web", count: 3 },
              ],
            }}
            onQueryChange={() => undefined}
            features={[
              filters([{ key: "team", type: "checklist", label: "Team" }]),
            ]}
          />
        );
        fireEvent.click(screen.getByRole("button", { name: "Filters" }));
        // A kit may mount the popover's content a tick after it opens.
        expect(
          await screen.findByRole("checkbox", { name: /Web/ })
        ).toBeInTheDocument();

        const counts = [
          ...document.querySelectorAll(
            '[data-adapttable-part="filter-checklist-count"]'
          ),
        ].map((node) => node.textContent);
        expect(counts).toEqual(["(7)", "(3)"]);

        fireEvent.keyDown(document.body, { key: "Escape" });
        await waitFor(() => {
          expect(screen.queryByRole("checkbox", { name: /Web/ })).toBeNull();
        });
      });
    });
  });
}

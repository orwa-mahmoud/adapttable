/**
 * The server-tier props the shared shell reads, typed and honoured here.
 *
 * `error` renders this kit's own error state; `supports` and `facetKeys`
 * reach the query the table sends, and the server's `facets` reach the
 * checklist this kit draws.
 */
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import { filters } from "./filters";
import type { ColumnDef } from "./index";
import { renderMantine } from "./test-utils";

interface Row {
  id: string;
  team: string;
}
const ROWS: Row[] = [{ id: "1", team: "Core" }];
const COLS: ColumnDef<Row>[] = [{ key: "team", header: "Team" }];

describe("server-tier props (mantine)", () => {
  it("renders the kit's error state for a forwarded error", () => {
    render(
      <MantineProvider>
        <DataTable<Row>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          error={new Error("Backend unavailable")}
        />
      </MantineProvider>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
  });

  it("sends the declared facet keys to the server", async () => {
    const seen: { facets?: readonly string[] }[] = [];
    render(
      <MantineProvider>
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
      </MantineProvider>
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen.at(-1)?.facets).toEqual(["team"]);
  });
  it("counts the checklist from the server's facets, not the loaded page", () => {
    renderMantine(
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
    fireEvent.click(screen.getByRole("button", { name: /filters/i }));

    const counts = [
      ...document.querySelectorAll(
        '[data-adapttable-part="filter-checklist-count"]'
      ),
    ].map((node) => node.textContent);
    expect(screen.getByRole("checkbox", { name: /Web/ })).toBeInTheDocument();
    expect(counts).toEqual(["(7)", "(3)"]);
  });
});

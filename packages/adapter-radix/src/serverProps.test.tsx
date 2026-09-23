/**
 * The server-tier props the shared shell reads, typed and honoured here.
 *
 * `error` renders this kit's own error state; `supports` and `facetKeys`
 * reach the query the table sends.
 */
import { Theme } from "@radix-ui/themes";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  team: string;
}
const ROWS: Row[] = [{ id: "1", team: "Core" }];
const COLS: ColumnDef<Row>[] = [{ key: "team", header: "Team" }];

describe("server-tier props (radix)", () => {
  it("renders the kit's error state for a forwarded error", () => {
    render(
      <Theme>
        <DataTable<Row>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          error={new Error("Backend unavailable")}
        />
      </Theme>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
  });

  it("sends the declared facet keys to the server", async () => {
    const seen: { facets?: readonly string[] }[] = [];
    render(
      <Theme>
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
      </Theme>
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen.at(-1)?.facets).toEqual(["team"]);
  });
});

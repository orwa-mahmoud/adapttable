/**
 * The server-tier props the shared shell reads, typed and honoured here.
 *
 * `error` renders this kit's own error state; `supports` and `facetKeys`
 * reach the query the table sends.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
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

describe("server-tier props (chakra)", () => {
  it("renders the kit's error state for a forwarded error", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable<Row>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          error={new Error("Backend unavailable")}
        />
      </ChakraProvider>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Backend unavailable");
  });

  it("sends the declared facet keys to the server", async () => {
    const seen: { facets?: readonly string[] }[] = [];
    render(
      <ChakraProvider value={defaultSystem}>
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
      </ChakraProvider>
    );
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen.at(-1)?.facets).toEqual(["team"]);
  });
});

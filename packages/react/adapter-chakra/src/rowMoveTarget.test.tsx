import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { rowReorder } from "./row-reorder";

interface Task {
  id: string;
  title: string;
}
const ROWS: Task[] = [
  { id: "1", title: "Ship" },
  { id: "2", title: "Test" },
];
const COLS: ColumnDef<Task>[] = [{ key: "title", header: "Title" }];

describe("card move controls (chakra)", () => {
  it("give each move a 44 px touch target", () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable<Task>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile
          features={[rowReorder(() => undefined)]}
        />
      </ChakraProvider>
    );
    const up = document.querySelector<HTMLElement>(
      '[data-adapttable-part="row-reorder-up"]'
    )!;
    expect(up).toBeInTheDocument();
    // The `11` size token is 2.75rem (44 px).
    const style = getComputedStyle(up);
    expect(style.minWidth).toContain("sizes-11");
    expect(style.minHeight).toContain("sizes-11");
  });
});

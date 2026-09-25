import { MantineProvider } from "@mantine/core";
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

describe("card move controls (mantine)", () => {
  it("give each move a 44 px touch target", () => {
    render(
      <MantineProvider>
        <DataTable<Task>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile
          features={[rowReorder(() => undefined)]}
        />
      </MantineProvider>
    );
    const up = document.querySelector<HTMLElement>(
      '[data-adapttable-part="row-reorder-up"]'
    )!;
    expect(up).toBeInTheDocument();
    // ActionIcon's xl size is 44 px; jsdom cannot lay it out, so assert the size.
    expect(up.style.getPropertyValue("--ai-size")).toBe("var(--ai-size-xl)");
  });
});

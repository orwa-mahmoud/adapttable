import { Theme } from "@radix-ui/themes";
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

describe("card move controls (radix)", () => {
  it("give each move a 44 px touch target", () => {
    render(
      <Theme>
        <DataTable<Task>
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          forceMobile
          features={[rowReorder(() => undefined)]}
        />
      </Theme>
    );
    const up = document.querySelector<HTMLElement>(
      '[data-adapttable-part="row-reorder-up"]'
    )!;
    expect(up).toBeInTheDocument();
    expect(up.style.minWidth).toBe("44px");
    expect(up.style.minHeight).toBe("44px");
  });
});

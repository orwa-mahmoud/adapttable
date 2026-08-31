import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";

interface Node {
  id: string;
  name: string;
  size: number;
  children?: Node[];
}
const ROWS: Node[] = [
  {
    id: "src",
    name: "src",
    size: 3,
    children: [
      { id: "index", name: "index.ts", size: 1 },
      {
        id: "lib",
        name: "lib",
        size: 2,
        children: [{ id: "util", name: "util.ts", size: 2 }],
      },
    ],
  },
  { id: "readme", name: "README.md", size: 1 },
];
const COLS: ColumnDef<Node>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "size", header: "Size", accessor: (r) => r.size },
];

/**
 * Tree data through the shadcn table.
 *
 * A tree is declared by the data, so arming it is a matter of passing
 * `getChildren` — there is no mode to switch on, and without it the table is
 * the flat list it always was. The chevron, the indent step and the
 * accessible name come from core, so what each kit has to get right is
 * rendering core's flattened entries instead of the plain rows.
 */
describe("tree data (shadcn)", () => {
  const wrap = (node: React.ReactNode) => <>{node}</>;
  const table = (extra?: Record<string, unknown>) =>
    render(
      wrap(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          getChildren={(row: Node) => row.children}
          {...extra}
        />
      )
    );
  /** The name a reader sees, without the decorative chevron beside it. */
  const names = () =>
    [...document.querySelectorAll("tbody tr")].map((row) => {
      const cell = row.querySelector("td");
      if (!cell) return undefined;
      const clone = cell.cloneNode(true) as HTMLElement;
      // Drop the chevron and the leaf's placeholder; the name stays, indented
      // inside the tree cell that wraps it.
      clone
        .querySelectorAll(
          '[data-adapttable-part="tree-toggle"], [data-adapttable-part="tree-spacer"]'
        )
        .forEach((node) => {
          node.remove();
        });
      return clone.textContent?.trim();
    });
  const toggles = () =>
    document.querySelectorAll('[data-adapttable-part="tree-toggle"]');

  it("shows the roots folded", () => {
    table();
    expect(names()).toEqual(["src", "README.md"]);
  });

  it("renders nothing tree-shaped without the prop", () => {
    render(
      wrap(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      )
    );
    expect(toggles()).toHaveLength(0);
  });

  it("opens a node when its chevron is clicked", () => {
    table();
    fireEvent.click(toggles()[0]!);
    expect(names()).toEqual(["src", "index.ts", "lib", "README.md"]);
  });

  it("gives a chevron only to rows that have children", () => {
    table();
    // Two roots, one of them a leaf: one chevron, one spacer holding its place.
    expect(toggles()).toHaveLength(1);
    expect(
      document.querySelectorAll('[data-adapttable-part="tree-spacer"]')
    ).toHaveLength(1);
  });

  it("indents each level logically, so RTL mirrors it", () => {
    table();
    fireEvent.click(toggles()[0]!);
    const cells = [
      ...document.querySelectorAll<HTMLElement>(
        'tbody [data-adapttable-part="tree-cell"]'
      ),
    ];
    expect(cells[0]?.style.paddingInlineStart).toBe("");
    expect(cells[1]?.style.paddingInlineStart).toBe("1.5rem");
  });

  it("says whether a node is open, for a screen reader", () => {
    table();
    expect(toggles()[0]!.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggles()[0]!);
    // The row re-rendered, so read the chevron again rather than the stale one.
    const open = [...toggles()].find(
      (el) => el.getAttribute("aria-expanded") === "true"
    );
    expect(open).toBeDefined();
  });

  it("lets the host hold the open set", () => {
    const onExpandedIdsChange = vi.fn();
    table({ expandedIds: [], onExpandedIdsChange });
    fireEvent.click(toggles()[0]!);
    expect(onExpandedIdsChange).toHaveBeenCalledExactlyOnceWith(["src"]);
    // Controlled: the table asked, and changed nothing itself.
    expect(names()).toEqual(["src", "README.md"]);
  });

  it("reads a flat table with a parent column the same way", () => {
    render(
      wrap(
        <DataTable
          data={[
            { id: "src", name: "src", size: 3 },
            { id: "index", name: "index.ts", size: 1, parentId: "src" },
          ]}
          columns={COLS}
          rowKey={(r: Node) => r.id}
          urlSync={false}
          getParentId={(row: Node & { parentId?: string }) => row.parentId}
          expandedIds={["src"]}
        />
      )
    );
    expect(names()).toEqual(["src", "index.ts"]);
  });

  it("puts the chevron in the column the host names", () => {
    table({ treeColumn: "size" });
    const cell = document.querySelector<HTMLElement>(
      'tbody [data-adapttable-part="tree-cell"]'
    );
    // The second data cell of the first row — the column the host named.
    expect(cell?.closest("td")).toBe(
      document.querySelectorAll("tbody tr")[0]?.querySelectorAll("td")[1]
    );
  });
  it("keeps the hierarchy on cards, stepped in and foldable", () => {
    // A phone gets the same tree, not a flattened list: the card itself steps
    // in by its depth and carries the chevron that folds it.
    table({ forceMobile: true });
    expect(toggles()).toHaveLength(1);
    fireEvent.click(toggles()[0]!);
    // Every kit renders its own card element; all of them stamp the row index
    // on it, so that is the one selector that finds a card in nine kits.
    const cards = [...document.querySelectorAll<HTMLElement>("[data-index]")];
    expect(cards).toHaveLength(4);
    expect(cards[0]?.style.marginInlineStart).toBe("");
    expect(cards[1]?.style.marginInlineStart).toBe("1.25rem");
  });
});

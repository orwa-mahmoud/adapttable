/**
 * The shared desktop table and mobile cards structure.
 *
 * Kits fill the element slots. These tests check the nesting, the part
 * names and that a kit element is the one that actually renders.
 */
import { defaultConfirm } from "@adapttable/core";
import { render, screen } from "@testing-library/react";
import { type ElementType, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useFrontendData } from "../source/useFrontendData";
import { createMemoryAdapter } from "../url/adapter";
import { useTableChrome } from "../useTableChrome";
import { useDesktopTableAssembly } from "./desktopTableAssembly";
import { DesktopTableChrome } from "./desktopTableChrome";
import { MobileCardsChrome } from "./mobileCardsChrome";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const cols: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

function Desktop({
  hosts,
}: {
  readonly hosts?: { readonly Table: ElementType };
}) {
  const source = useFrontendData<Row>({
    data: ROWS,
    columns: cols,
    urlAdapter: createMemoryAdapter(""),
    paginationMode: "paged",
  });
  const chrome = useTableChrome<Row>({
    source,
    columns: cols,
    rowKey: (r) => r.id,
  });
  const assembly = useDesktopTableAssembly({
    table: chrome.table,
    rows: ROWS,
    getRowId: chrome.getRowId,
    confirm: defaultConfirm,
    summaryRow: (rows) => ({ name: String(rows.length) }),
  });
  return (
    <DesktopTableChrome
      assembly={assembly}
      hosts={hosts}
      classNames={{ table: "kit-table", headerRow: "kit-head" }}
      renderLeading={() => null}
      renderTrailing={() => null}
      renderPlanCell={() => null}
      renderLeaf={(leaf) => <th key={leaf.column.key}>{leaf.caption}</th>}
      renderRow={(slot) =>
        slot.kind === "row" ? (
          <tr {...slot.wiring.rowDomProps}>
            <td>{slot.wiring.row.name}</td>
          </tr>
        ) : null
      }
      renderGroup={() => null}
      renderExtra={() => null}
    />
  );
}

describe("DesktopTableChrome", () => {
  it("nests the table, head, body and summary under the part names", () => {
    const { container } = render(<Desktop />);
    const table = container.querySelector('[data-adapttable-part="table"]');
    expect(table?.tagName).toBe("TABLE");
    expect(table?.className).toBe("kit-table");
    expect(
      container.querySelector('[data-adapttable-part="thead"]')
    ).toBeTruthy();
    expect(
      container.querySelector('[data-adapttable-part="tbody"]')
    ).toBeTruthy();
    expect(
      container.querySelector('[data-adapttable-part="header-row"]')?.className
    ).toBe("kit-head");
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(
      container.querySelector('[data-adapttable-part="summary"]')
    ).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("draws the table with the kit's element", () => {
    function KitTable({
      children,
      ...rest
    }: {
      readonly children?: ReactNode;
    } & Record<string, unknown>) {
      return (
        <table data-kit="yes" {...rest}>
          {children}
        </table>
      );
    }
    const { container } = render(
      <Desktop hosts={{ Table: KitTable }} />
    );
    expect(
      container.querySelector('[data-adapttable-part="table"]')?.getAttribute(
        "data-kit"
      )
    ).toBe("yes");
  });
});

describe("MobileCardsChrome", () => {
  it("lists cards between the virtual spacers and the summary", () => {
    const { container } = render(
      <MobileCardsChrome
        regionProps={{ "aria-label": "People" }}
        classNames={{ cards: "kit-cards", card: "kit-card" }}
        paddingTop={12}
        paddingBottom={8}
        cards={[
          { key: "a", content: "Alice" },
          {
            key: "gap",
            part: "separator-row",
            props: { className: "rule" },
            content: null,
          },
        ]}
        summary={<li data-adapttable-part="summary-card">Total</li>}
      />
    );
    const list = container.querySelector('[data-adapttable-part="cards"]');
    expect(list?.tagName).toBe("UL");
    expect(list?.className).toBe("kit-cards");
    const parts = [...container.querySelectorAll("[data-adapttable-part]")].map(
      (node) => node.getAttribute("data-adapttable-part")
    );
    expect(parts).toEqual([
      "cards",
      "virtual-spacer",
      "card",
      "separator-row",
      "virtual-spacer",
      "summary-card",
    ]);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
  });

  it("draws each card with the kit's element", () => {
    function KitCard({
      children,
      ...rest
    }: {
      readonly children?: ReactNode;
    } & Record<string, unknown>) {
      return (
        <li data-kit="card" {...rest}>
          {children}
        </li>
      );
    }
    const { container } = render(
      <MobileCardsChrome
        regionProps={{}}
        hosts={{ Card: KitCard }}
        cards={[{ key: "a", content: "Alice" }]}
      />
    );
    expect(
      container.querySelector('[data-adapttable-part="card"]')?.getAttribute(
        "data-kit"
      )
    ).toBe("card");
  });
});

import "@mantine/core/styles.css";

import { DataTable } from "@adapttable/mantine";
import { filters } from "@adapttable/mantine/filters";
import { multiSort } from "@adapttable/mantine/multi-sort";
import { rowDetail } from "@adapttable/mantine/row-detail";
import { MantineProvider } from "@mantine/core";

interface Order {
  id: string;
  customer: string;
  region: string;
  status: string;
  amount: number;
  detail: string;
}

const ORDERS: Order[] = [
  {
    id: "1",
    customer: "Acme",
    region: "EU",
    status: "open",
    amount: 1200,
    detail: "3 line items — net 30",
  },
  {
    id: "2",
    customer: "Globex",
    region: "US",
    status: "paid",
    amount: 800,
    detail: "1 line item — prepaid",
  },
  {
    id: "3",
    customer: "Initech",
    region: "EU",
    status: "open",
    amount: 2500,
    detail: "7 line items — net 60",
  },
];

/**
 * The power features in one table: header GROUPS (contiguous `group`
 * columns merge under one cell), row DETAILS (chevron per row), a SUMMARY
 * footer aligned under its column, MULTI-SORT (shift-click chains columns,
 * with order badges), and a declarative status filter — all from
 * declarations.
 */
export function MantinePowerExample() {
  return (
    <MantineProvider>
      <DataTable
        data={ORDERS}
        columns={[
          { key: "customer", group: "Who", sortable: true },
          { key: "region", group: "Who", sortable: true },
          {
            key: "status",
            filter: { type: "multiSelect", options: "auto" },
          },
          {
            key: "amount",
            group: "Money",
            accessor: (o) => `$${o.amount.toLocaleString()}`,
            sortValue: (o) => o.amount,
            sortable: true,
          },
        ]}
        rowKey={(o) => o.id}
        features={[multiSort(), rowDetail((o: Order) => o.detail), filters([])]}
        summaryRow={(rows) => ({
          amount: (
            <b>
              ${rows.reduce((sum, o) => sum + o.amount, 0).toLocaleString()}
            </b>
          ),
        })}
      />
    </MantineProvider>
  );
}

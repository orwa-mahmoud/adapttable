import { DataTable } from "@adapttable/mui";
import { filters } from "@adapttable/mui/filters";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
}

const INVOICES: Invoice[] = [
  { id: "1", number: "INV-001", amount: 120, status: "paid" },
  { id: "2", number: "INV-002", amount: 980, status: "open" },
  { id: "3", number: "INV-003", amount: 50, status: "void" },
  { id: "4", number: "INV-004", amount: 300, status: "open" },
];

const STATUS_OPTIONS = [
  { value: "paid", label: "Paid" },
  { value: "open", label: "Open" },
  { value: "void", label: "Void" },
];

/**
 * Declarative filters: one definition drives the widget, the URL parsing,
 * the removable chip, and the row predicate — nothing else to wire. The
 * column-level `filter` shorthand covers columns; the table-level `filters`
 * array covers anything that is not a column (here: an amount range).
 *
 * No provider and no stylesheet import — MUI renders with its default theme.
 * Wrap your app in MUI's `ThemeProvider` to control light/dark mode and RTL.
 *
 * Need a fully custom form or matching logic instead? See
 * `mantine-custom-filters.tsx` — the declarative path is the default, not
 * the ceiling.
 */
export function MuiFiltersExample() {
  return (
    <DataTable
      data={INVOICES}
      columns={[
        { key: "number", sortable: true },
        { key: "amount", sortable: true },
        {
          key: "status",
          filter: { type: "multiSelect", options: STATUS_OPTIONS },
        },
      ]}
      rowKey={(r) => r.id}
      features={[
        filters<Invoice>([
          { key: "amount", type: "numberRange", label: "Amount" },
        ]),
      ]}
    />
  );
}

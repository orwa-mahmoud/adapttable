import { type ColumnDef, DataTable } from "@adapttable/chakra";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: string;
}

const INVOICES: Invoice[] = [
  { id: "1", number: "INV-001", amount: 120, status: "paid" },
  { id: "2", number: "INV-002", amount: 480, status: "due" },
  { id: "3", number: "INV-003", amount: 75, status: "due" },
];

const columns: ColumnDef<Invoice>[] = [
  { key: "number", header: "Invoice", sortable: true },
  {
    key: "amount",
    accessor: (r) => `$${r.amount}`,
    sortValue: (r) => r.amount,
    sortable: true,
    align: "end",
  },
  { key: "status" },
];

/** Selection + bulk actions with a confirmation dialog. */
export function ChakraSelectionExample() {
  return (
    <ChakraProvider value={defaultSystem}>
      <DataTable
        data={INVOICES}
        columns={columns}
        rowKey={(r) => r.id}
        accentColor="teal"
        bulkActions={[
          {
            key: "remind",
            label: "Send reminder",
            onClick: (ids) => alert(`Reminding ${ids.length}`),
          },
          {
            key: "delete",
            label: "Delete",
            color: "red",
            confirm: {
              title: "Delete invoices?",
              message: (count) => `Permanently delete ${count} invoice(s)?`,
              confirmLabel: "Delete",
              danger: true,
            },
            onClick: (ids) => alert(`Deleted ${ids.join(", ")}`),
          },
        ]}
      />
    </ChakraProvider>
  );
}

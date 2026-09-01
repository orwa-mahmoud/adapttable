import { type ColumnDef, DataTable } from "@adapttable/antd";
import { rowActions } from "@adapttable/antd/row-actions";
import { ConfigProvider, theme } from "antd";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "Keyboard", category: "Peripherals", price: 80 },
  { id: "2", name: "Monitor", category: "Displays", price: 320 },
  { id: "3", name: "Mouse", category: "Peripherals", price: 40 },
];

// Bare keys render and title themselves; `accessor` appears only where a
// cell needs real formatting (money), with `sortValue` keeping sorts numeric.
const columns: ColumnDef<Product>[] = [
  { key: "name", sortable: true },
  { key: "category" },
  {
    key: "price",
    accessor: (r) => `$${r.price}`,
    sortValue: (r) => r.price,
    sortable: true,
    align: "end",
  },
];

/**
 * Ant Design table with dark mode (via `ConfigProvider` `darkAlgorithm`),
 * row actions, and a confirm-guarded delete — on the same headless source
 * as every other adapter.
 */
export function AntdBasicExample() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <DataTable
        data={PRODUCTS}
        columns={columns}
        rowKey={(r) => r.id}
        features={[
          rowActions<Product>([
            {
              key: "edit",
              label: "Edit",
              onClick: (row) => alert(`Edit ${row.name}`),
            },
            {
              key: "delete",
              label: "Delete",
              color: "danger",
              confirm: {
                title: "Delete product?",
                message: (row) => `Permanently delete "${row.name}"?`,
                confirmLabel: "Delete",
                danger: true,
              },
              onClick: (row) => alert(`Deleted ${row.name}`),
            },
          ]),
        ]}
        bordered
      />
    </ConfigProvider>
  );
}

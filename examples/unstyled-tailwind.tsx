import { getDirection, getLabels } from "@adapttable/i18n";
import { type ColumnDef, DataTable } from "@adapttable/unstyled";

interface Product {
  id: string;
  name: string;
  price: number;
}

const PRODUCTS: Product[] = [
  { id: "1", name: "Keyboard", price: 49 },
  { id: "2", name: "Mouse", price: 25 },
  { id: "3", name: "Monitor", price: 199 },
];

const columns: ColumnDef<Product>[] = [
  { key: "name", sortable: true },
  {
    key: "price",
    accessor: (r) => `$${r.price}`,
    sortValue: (r) => r.price,
    sortable: true,
  },
];

/**
 * Unstyled adapter styled with Tailwind utility classes, localized to a
 * given `locale` (e.g. "ar" for Arabic + RTL).
 */
export function UnstyledTailwindExample({
  locale = "en",
}: Readonly<{
  locale?: string;
}>) {
  return (
    <DataTable
      data={PRODUCTS}
      columns={columns}
      rowKey={(r) => r.id}
      labels={getLabels(locale)}
      dir={getDirection(locale)}
      classNames={{
        root: "rounded-lg border border-zinc-200 p-3",
        toolbar: "flex items-center gap-2 mb-2",
        search: "rounded border px-2 py-1 text-sm",
        table: "w-full text-sm",
        headerCell: "text-start font-medium text-zinc-500 px-3 py-2",
        sortButton: "inline-flex items-center gap-1",
        row: "border-t hover:bg-zinc-50 data-[selected]:bg-blue-50",
        cell: "px-3 py-2",
        footer: "flex items-center gap-2 mt-2 text-sm",
        pagePrev: "rounded border px-2 py-1 disabled:opacity-40",
        pageNext: "rounded border px-2 py-1 disabled:opacity-40",
        pageNumber: "rounded border px-2 py-1 disabled:opacity-40",
      }}
    />
  );
}

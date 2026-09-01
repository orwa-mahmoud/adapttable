import "@mantine/core/styles.css";

import {
  type ColumnDef,
  DataTable,
  type ExtraFilters,
  useFrontendData,
} from "@adapttable/mantine";
import { filters } from "@adapttable/mantine/filters";
import { Checkbox, MantineProvider, Stack } from "@mantine/core";

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
];

const columns: ColumnDef<Invoice>[] = [
  { key: "number", sortable: true },
  { key: "amount", sortable: true },
  { key: "status", sortable: true },
];

const STATUSES = ["paid", "open", "void"];

/** Normalise the `status` extra value to a string[]. */
function selectedStatuses(value: ExtraFilters["status"]): string[] {
  if (Array.isArray(value)) return value;
  if (value != null) return [String(value)];
  return [];
}

/**
 * The ESCAPE HATCH: when the built-in filter shapes are not enough, take
 * over any layer — draw the form yourself (`filters` as JSX), match rows
 * yourself (`filterFn`), label chips yourself (`filterLabels`). The four
 * pieces share one key ("status"); start from the declarative version in
 * `mantine-filters.tsx` and replace only the layer you have outgrown.
 */
export function MantineCustomFiltersExample() {
  const source = useFrontendData({
    data: INVOICES,
    columns,
    arrayExtraKeys: ["status"],
    filterFn: (row, extra) => {
      const selected = selectedStatuses(extra.status);
      return selected.length === 0 || selected.includes(row.status);
    },
  });
  const selected = selectedStatuses(source.extra.status);

  return (
    <MantineProvider>
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        features={[
          filters(
            <Checkbox.Group
              label="Status"
              value={selected}
              onChange={(value) => source.setExtra("status", value)}
            >
              <Stack gap="xs" mt="xs">
                {STATUSES.map((s) => (
                  <Checkbox key={s} value={s} label={s} />
                ))}
              </Stack>
            </Checkbox.Group>
          ),
        ]}
        filterLabels={{ status: (value) => `Status: ${value}` }}
        onClearFilters={() => source.setExtra("status", undefined)}
      />
    </MantineProvider>
  );
}

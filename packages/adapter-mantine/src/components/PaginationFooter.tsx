import { pageSizeOptions, type TableLabels } from "@adapttable/core";
import { Group, Pagination, Select, Text } from "@mantine/core";

/** Props for {@link PaginationFooter}. */
export interface PaginationFooterProps {
  page: number;
  totalPages: number;
  limit: number;
  total: number;
  fromIndex: number;
  toIndex: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  labels: Required<TableLabels>;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}

/** Desktop pagination bar: page-size + range on the left, pager on the right. */
export function PaginationFooter({
  page,
  totalPages,
  limit,
  total,
  fromIndex,
  toIndex,
  onPageChange,
  onLimitChange,
  labels,
  showRowsPerPage = true,
}: Readonly<PaginationFooterProps>) {
  const safeTotalPages = Math.max(totalPages, 1);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);
  const options = pageSizeOptions(limit).map((n) => ({
    value: String(n),
    label: String(n),
  }));

  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md" pt="xs">
      <Group gap="xs" align="center" wrap="nowrap">
        {showRowsPerPage && (
          <>
            <Text fz="xs" c="dimmed">
              {labels.rowsPerPage}
            </Text>
            <Select
              aria-label={labels.rowsPerPage}
              data={options}
              value={String(limit)}
              // `allowDeselect={false}` keeps the value non-null.
              onChange={(v) => onLimitChange(Number(v!))}
              size="xs"
              w={76}
              allowDeselect={false}
              comboboxProps={{ withinPortal: false }}
            />
          </>
        )}
        {total > 0 && (
          <Text fz="xs" c="dimmed">
            {labels.showing({ from: fromIndex, to: toIndex, total })}
          </Text>
        )}
      </Group>
      <Group gap="sm" align="center" wrap="nowrap">
        <Text fz="xs" c="dimmed">
          {labels.pageOf({ page: safePage, total: safeTotalPages })}
        </Text>
        <Pagination
          total={safeTotalPages}
          value={safePage}
          onChange={onPageChange}
          size="sm"
          siblings={1}
          boundaries={1}
          // Only previous/next control buttons render (boundaries keep
          // first/last away), so a total ternary labels them both.
          getControlProps={(control) => ({
            "aria-label":
              control === "previous" ? labels.previousPage : labels.nextPage,
          })}
        />
      </Group>
    </Group>
  );
}

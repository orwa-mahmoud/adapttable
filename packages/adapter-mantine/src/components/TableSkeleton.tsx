import { Skeleton, Table, VisuallyHidden } from "@mantine/core";

/**
 * Props for {@link TableSkeleton}.
 *
 * @public
 */
export interface TableSkeletonProps {
  /** Number of placeholder columns. */
  columns: number;
  /** Number of placeholder rows. Defaults to 5. */
  rows?: number;
  /** Screen-reader text announcing the loading state. */
  loadingLabel?: string;
}

/**
 * Loading placeholder that mirrors the table shape to avoid layout shift.
 *
 * @public
 */
export function TableSkeleton({
  columns,
  rows = 5,
  loadingLabel,
}: Readonly<TableSkeletonProps>) {
  const colKeys = Array.from({ length: Math.max(columns, 1) }, (_, i) => i);
  const rowKeys = Array.from({ length: rows }, (_, i) => i);
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <Table>
        <Table.Thead>
          <Table.Tr>
            {colKeys.map((c) => (
              <Table.Th key={c}>
                <Skeleton
                  height={12}
                  radius="sm"
                  width={c === 0 ? "55%" : "40%"}
                />
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rowKeys.map((r) => (
            <Table.Tr key={r}>
              {colKeys.map((c) => (
                <Table.Td key={c}>
                  <Skeleton
                    height={14}
                    radius="sm"
                    width={c === 0 ? "70%" : "55%"}
                  />
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </div>
  );
}

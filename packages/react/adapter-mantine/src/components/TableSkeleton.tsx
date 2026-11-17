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
  /** The body will be the mobile cards, so the placeholder is cards too. */
  mobile?: boolean;
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
  mobile = false,
}: Readonly<TableSkeletonProps>) {
  const colKeys = Array.from({ length: Math.max(columns, 1) }, (_, i) => i);
  const rowKeys = Array.from({ length: rows }, (_, i) => i);
  const lines = Math.min(4, colKeys.length);
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      data-adapttable-part="loading"
    >
      {mobile ? (
        <div data-adapttable-part="loading-cards">
          {rowKeys.map((r) => (
            <div key={r} data-adapttable-part="loading-card">
              {colKeys.slice(0, lines).map((c) => (
                <Skeleton
                  key={c}
                  height={14}
                  radius="sm"
                  width={c === 0 ? "70%" : "55%"}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <Table data-adapttable-part="loading-table">
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
      )}
      {loadingLabel ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </div>
  );
}

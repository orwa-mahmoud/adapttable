/** Row count and the pager, drawn by the binding with Mantine's controls. */
import {
  createPager,
  type KitPagerFrameProps,
  type KitPagesProps,
  type KitRowsPerPageProps,
  type TableLabels,
} from "@adapttable/react/adapter";
import { Group, Pagination, Select, Text } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";

/**
 * Props for {@link PaginationFooter}.
 *
 * @public
 */
export interface PaginationFooterProps {
  /** 1-based current page. */
  page: number;
  /** Pages in the whole matching set. */
  totalPages: number;
  /** Rows per page. */
  limit: number;
  /** Page size offered alongside the standard ones when it is not one of them. */
  defaultLimit?: number;
  /** Rows in the whole matching set. */
  total: number;
  /** 1-based index of the first row on this page. */
  fromIndex: number;
  /** 1-based index of the last row on this page. */
  toIndex: number;
  /** Moves to a page. */
  onPageChange: (page: number) => void;
  /** Changes the page size. */
  onLimitChange: (limit: number) => void;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}

/** Page size and range at the start, "page n of m" and the pager at the end. */
function Frame({ rowsPerPage, range, pageOf, pages }: KitPagerFrameProps) {
  "use no memo";
  return (
    <Group justify="space-between" align="center" wrap="wrap" gap="md" pt="xs">
      <Group gap="xs" align="center" wrap="nowrap">
        {rowsPerPage}
        {range}
      </Group>
      <Group gap="sm" align="center" wrap="nowrap">
        {pageOf}
        {pages}
      </Group>
    </Group>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <Text fz="xs" c="dimmed">
      {children}
    </Text>
  );
}

/** The page size, named by its visible caption. */
function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <>
      <Caption>{label}</Caption>
      <Select
        aria-label={label}
        data={options.map((size) => ({
          value: String(size),
          label: String(size),
        }))}
        value={String(value)}
        // `allowDeselect={false}` keeps the value non-null.
        onChange={(next) => onValueChange(Number(next!))}
        size="xs"
        w={76}
        allowDeselect={false}
        comboboxProps={{ withinPortal: false }}
      />
    </>
  );
}

/** Mantine's own pagination, its controls named in the table's labels. */
function Pages({ page, totalPages, onPageChange, labels }: KitPagesProps) {
  "use no memo";
  return (
    <Pagination
      total={totalPages}
      value={page}
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
  );
}

/** The table's footer: page size, range, "page n of m" and the pager. */
export const footer = /* @__PURE__ */ createPager({
  Frame,
  RowsPerPage,
  Caption,
  Pages,
});

/**
 * Desktop pagination bar: page-size + range on the left, pager on the right.
 *
 * @public
 */
export function PaginationFooter({
  page,
  totalPages,
  limit,
  defaultLimit = limit,
  total,
  fromIndex,
  toIndex,
  onPageChange,
  onLimitChange,
  labels,
  showRowsPerPage = true,
}: Readonly<PaginationFooterProps>): ReactElement {
  const safeTotalPages = Math.max(totalPages, 1);
  return footer({
    table: {
      pagination: {
        safePage: Math.min(Math.max(page, 1), safeTotalPages),
        totalPages: safeTotalPages,
        fromIndex,
        toIndex,
      },
    },
    source: {
      limit,
      defaultLimit,
      total,
      setLimit: onLimitChange,
      setPage: onPageChange,
    },
    labels,
    chrome: { grouping: showRowsPerPage ? undefined : true },
  });
}

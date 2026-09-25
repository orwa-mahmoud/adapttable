/** Row count and the windowed pager. */
import {
  pageSizeOptions,
  type PaginationInfo,
  type TableLabels,
} from "@adapttable/core";
import { paginationSlots } from "@adapttable/react/adapter";
import { Button, HStack, Text } from "@chakra-ui/react";

import { subtleText } from "../styles";
import { NativeSelect } from "./primitives";

/** Paged footer with prev/next. */
export function Footer({
  pagination,
  total,
  limit,
  defaultLimit = limit,
  setPage,
  setLimit,
  labels,
  className,
  showRowsPerPage = true,
}: Readonly<{
  pagination: PaginationInfo;
  total: number;
  limit: number;
  defaultLimit?: number;
  setPage: (n: number) => void;
  setLimit: (n: number) => void;
  labels: Required<TableLabels>;
  /** Class hook for the footer row. */
  className?: string;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}>) {
  const { safePage, totalPages, fromIndex, toIndex } = pagination;
  return (
    <HStack
      gap={3}
      justify="space-between"
      flexWrap="wrap"
      className={className}
    >
      <HStack gap={2}>
        {showRowsPerPage && (
          <>
            <Text fontSize="xs" {...subtleText}>
              {labels.rowsPerPage}
            </Text>
            <NativeSelect
              size="xs"
              w="72px"
              aria-label={labels.rowsPerPage}
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {pageSizeOptions([limit, defaultLimit]).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </>
        )}
        {total > 0 && (
          <Text fontSize="xs" {...subtleText}>
            {labels.showing({ from: fromIndex, to: toIndex, total })}
          </Text>
        )}
      </HStack>
      <HStack gap={1}>
        <Text fontSize="xs" {...subtleText}>
          {labels.pageOf({ page: safePage, total: totalPages })}
        </Text>
        <Button
          size="xs"
          variant="outline"
          aria-label={labels.previousPage}
          disabled={safePage <= 1}
          onClick={() => setPage(safePage - 1)}
        >
          ‹
        </Button>
        {paginationSlots(safePage, totalPages).map(({ item, key }) =>
          item === "ellipsis" ? (
            <Text key={key} fontSize="xs" px={1} {...subtleText}>
              …
            </Text>
          ) : (
            <Button
              key={key}
              size="xs"
              variant={item === safePage ? "solid" : "outline"}
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          size="xs"
          variant="outline"
          aria-label={labels.nextPage}
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
        >
          ›
        </Button>
      </HStack>
    </HStack>
  );
}

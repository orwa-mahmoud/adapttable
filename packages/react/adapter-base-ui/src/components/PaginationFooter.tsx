/** Row count and the windowed pager. */
import type { PaginationInfo, TableLabels } from "@adapttable/core";
import { paginationSlots } from "@adapttable/react/adapter";

import { subtleText } from "../styles";
import { Button, Flex, Text } from "../ui";
import { NativeSelect } from "./primitives";
import { pageSizeSelectOptions } from "./Toolbar";

/** Paged footer with numbered page buttons. */
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
    <Flex
      gap="3"
      justify="between"
      wrap="wrap"
      align="center"
      className={className}
    >
      <Flex gap="2" align="center">
        {showRowsPerPage && (
          <>
            <Text size="1" {...subtleText}>
              {labels.rowsPerPage}
            </Text>
            <NativeSelect
              size="1"
              width="72px"
              aria-label={labels.rowsPerPage}
              value={String(limit)}
              options={pageSizeSelectOptions(limit, defaultLimit)}
              onValueChange={(value) => setLimit(Number(value))}
            />
          </>
        )}
        {total > 0 && (
          <Text size="1" {...subtleText}>
            {labels.showing({ from: fromIndex, to: toIndex, total })}
          </Text>
        )}
      </Flex>
      <Flex gap="1" align="center">
        <Text size="1" {...subtleText}>
          {labels.pageOf({ page: safePage, total: totalPages })}
        </Text>
        <Button
          size="1"
          variant="soft"
          color="gray"
          aria-label={labels.previousPage}
          disabled={safePage <= 1}
          onClick={() => setPage(safePage - 1)}
        >
          ‹
        </Button>
        {paginationSlots(safePage, totalPages).map(({ item, key }) =>
          item === "ellipsis" ? (
            <Text
              key={key}
              size="1"
              {...subtleText}
              style={{ paddingInline: "var(--space-1)" }}
            >
              …
            </Text>
          ) : (
            <Button
              key={key}
              size="1"
              variant={item === safePage ? "solid" : "soft"}
              aria-current={item === safePage ? "page" : undefined}
              onClick={() => setPage(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          size="1"
          variant="soft"
          color="gray"
          aria-label={labels.nextPage}
          disabled={safePage >= totalPages}
          onClick={() => setPage(safePage + 1)}
        >
          ›
        </Button>
      </Flex>
    </Flex>
  );
}

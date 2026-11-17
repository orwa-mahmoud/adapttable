/**
 * The table footer, laid out by the binding and drawn with antd's select,
 * text and pagination: page size and range at the start, the pages at the
 * end, as antd's own footer reads (it shows no "page n of m").
 */
import {
  createPager,
  type KitPagerFrameProps,
  type KitPagesProps,
  type KitRowsPerPageProps,
} from "@adapttable/react/adapter";
import { Flex, Pagination, Select, Typography } from "antd";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

function Frame({ rowsPerPage, range, pages }: Readonly<KitPagerFrameProps>) {
  "use no memo";
  return (
    <Flex justify="space-between" align="center" wrap gap={8}>
      <Flex align="center" gap={8}>
        {rowsPerPage}
        {range}
      </Flex>
      {pages}
    </Flex>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return <Typography.Text type="secondary">{children}</Typography.Text>;
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
        size="small"
        aria-label={label}
        value={value}
        onChange={(next: number) => onValueChange(next)}
        options={options.map((size) => ({ value: size, label: size }))}
      />
    </>
  );
}

/** The attributes antd's own pagination item lacks. */
function itemAttributes(
  item: number,
  type: string,
  page: number,
  labels: KitPagesProps["labels"]
): Record<string, unknown> | null {
  if (type === "page") {
    return { "aria-current": item === page ? "page" : undefined };
  }
  if (type === "prev") return { "aria-label": labels.previousPage };
  if (type === "next") return { "aria-label": labels.nextPage };
  return null;
}

/** antd's item, with the attributes it lacks. */
function named(
  original: ReactNode,
  extra: Record<string, unknown> | null
): ReactNode {
  return extra && isValidElement(original)
    ? cloneElement(original as ReactElement<Record<string, unknown>>, extra)
    : original;
}

/**
 * antd's pagination, one item per page. It exposes neither `aria-current` nor
 * names for its arrows, so its own items are cloned with them.
 */
function Pages({
  page,
  totalPages,
  onPageChange,
  labels,
}: Readonly<KitPagesProps>) {
  "use no memo";
  return (
    <Pagination
      current={page}
      pageSize={1}
      total={totalPages}
      showSizeChanger={false}
      onChange={onPageChange}
      itemRender={(item, type, original) =>
        named(original, itemAttributes(item, type, page, labels))
      }
    />
  );
}

/** The table's footer: page size, range and the pages. */
export const footer = /* @__PURE__ */ createPager({
  Frame,
  RowsPerPage,
  Caption,
  Pages,
});

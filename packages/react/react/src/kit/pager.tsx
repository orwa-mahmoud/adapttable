/**
 * The pager, built once from a kit's pieces.
 *
 * The binding decides what the footer holds: the rows-per-page choice (none
 * in a grouped table, where the page size does nothing), the range shown,
 * the "page n of m" caption and the page controls. A kit lays them out and
 * draws each, with its own pagination component or with the windowed page
 * buttons {@link createPageButtons} builds from its primitives.
 */
import {
  pageSizeOptions,
  type PaginationInfo,
  paginationSlots,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import type {
  ComponentType,
  CSSProperties,
  ReactElement,
  ReactNode,
} from "react";

import type { KitPrimitivesOf } from "./primitives";
import type { KitRowsPerPageProps } from "./toolbar";

/**
 * The pager's regions, for a kit's frame to lay out.
 *
 * @public
 */
export interface KitPagerFrameProps {
  /** The page-size choice; absent in a grouped table. */
  readonly rowsPerPage: ReactNode;
  /** Which rows are shown; absent while there are none. */
  readonly range: ReactNode;
  /** "Page n of m". */
  readonly pageOf: ReactNode;
  /** The page controls. */
  readonly pages: ReactNode;
}

/**
 * The page controls' props.
 *
 * @public
 */
export interface KitPagesProps {
  /** The current page, from 1. */
  readonly page: number;
  /** How many pages there are, at least 1. */
  readonly totalPages: number;
  /** Go to a page. */
  readonly onPageChange: (page: number) => void;
  /** The controls' names. */
  readonly labels: Pick<
    Required<TableLabels>,
    "previousPage" | "nextPage" | "goToPage"
  >;
}

/**
 * What the pager reads from the finished table.
 *
 * @public
 */
export interface KitPagerView {
  /** The page geometry. */
  readonly table: { readonly pagination: PaginationInfo };
  /** The page size, the row count and the moves between pages. */
  readonly source: Pick<
    TableSource<unknown>,
    "limit" | "defaultLimit" | "total" | "setLimit" | "setPage"
  >;
  /** Resolved labels. */
  readonly labels: Required<TableLabels>;
  /** The grouping, when rows are grouped: every row is then on one page. */
  readonly tableProps: { readonly grouping?: unknown };
}

/**
 * What a kit hands {@link createPager}.
 *
 * @public
 */
export interface KitPager {
  /** Lays the regions out. */
  readonly Frame: ComponentType<KitPagerFrameProps>;
  /** The page-size choice. */
  readonly RowsPerPage: ComponentType<KitRowsPerPageProps>;
  /** The range and "page n of m" captions. */
  readonly Caption: ComponentType<{ readonly children: ReactNode }>;
  /** The page controls. */
  readonly Pages: ComponentType<KitPagesProps>;
}

/**
 * Build the pager a kit's table draws in its footer.
 *
 * @param kit - The kit's frame, page-size choice, caption and page controls.
 * @returns The footer, for `KitTable.footer`.
 *
 * @public
 */
export function createPager(
  kit: KitPager
): (view: KitPagerView) => ReactElement {
  const { Frame, RowsPerPage, Caption, Pages } = kit;
  return function footer(view: KitPagerView): ReactElement {
    const { pagination } = view.table;
    const { source, labels } = view;
    const { safePage, totalPages, fromIndex, toIndex } = pagination;
    return (
      <Frame
        rowsPerPage={
          // Every row of a grouped table is on one page.
          view.tableProps.grouping ? null : (
            <RowsPerPage
              label={labels.rowsPerPage}
              value={source.limit}
              options={pageSizeOptions([source.limit, source.defaultLimit])}
              onValueChange={source.setLimit}
            />
          )
        }
        range={
          source.total > 0 ? (
            <Caption>
              {labels.showing({
                from: fromIndex,
                to: toIndex,
                total: source.total,
              })}
            </Caption>
          ) : null
        }
        pageOf={
          <Caption>
            {labels.pageOf({ page: safePage, total: totalPages })}
          </Caption>
        }
        pages={
          <Pages
            page={safePage}
            totalPages={totalPages}
            onPageChange={source.setPage}
            labels={labels}
          />
        }
      />
    );
  };
}

/**
 * The spacing of {@link createPageButtons}' controls.
 *
 * @public
 */
export interface KitPageButtonsLook {
  /** The row of buttons. */
  readonly row: CSSProperties;
  /** The ellipsis between page numbers. */
  readonly ellipsis: CSSProperties;
}

/** The parts of the page buttons. */
const PAGE_PARTS = {
  previous: "page-prev",
  number: "page-number",
  ellipsis: "page-ellipsis",
  next: "page-next",
} as const;

/**
 * Build windowed page buttons from a kit's primitives: previous, the first,
 * last and nearby page numbers with an ellipsis where pages are skipped, and
 * next. The current page is filled and marked `aria-current="page"`.
 *
 * @param kit - The kit's button and text.
 * @param look - The spacing of the row and the ellipsis.
 * @returns The page controls, for {@link KitPager}'s `Pages`.
 *
 * @public
 */
export function createPageButtons(
  kit: KitPrimitivesOf<"Button" | "Text">,
  look: KitPageButtonsLook
): (props: Readonly<KitPagesProps>) => ReactElement {
  const { Button, Text } = kit;
  return function Pages({
    page,
    totalPages,
    onPageChange,
    labels,
  }: Readonly<KitPagesProps>): ReactElement {
    return (
      <span style={look.row}>
        <Button
          aria-label={labels.previousPage}
          data-adapttable-part={PAGE_PARTS.previous}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </Button>
        {paginationSlots(page, totalPages).map(({ item, key }) =>
          item === "ellipsis" ? (
            <Text
              key={key}
              variant="caption"
              tone="secondary"
              aria-hidden="true"
              data-adapttable-part={PAGE_PARTS.ellipsis}
              style={look.ellipsis}
            >
              …
            </Text>
          ) : (
            <Button
              key={key}
              variant={item === page ? "filled" : "outlined"}
              aria-current={item === page ? "page" : undefined}
              data-adapttable-part={PAGE_PARTS.number}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          aria-label={labels.nextPage}
          data-adapttable-part={PAGE_PARTS.next}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </Button>
      </span>
    );
  };
}

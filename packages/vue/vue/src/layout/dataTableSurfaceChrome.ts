import { TOOLBAR_EXTRAS } from "@adapttable/core/binding";
import {
  createCommentVNode,
  createTextVNode,
  Fragment,
  h,
  isVNode,
  mergeProps,
  renderSlot,
  type SetupContext,
  type VNode,
  type VNodeChild,
} from "vue";

import { SidePanelLayoutChrome } from "../actions/sidePanelChrome";
import { type Attrs, type ElementRef, elementRef } from "../attrs";
import { COLUMN_MENU } from "../columns/columnMenuContracts";
import { FIND_BUTTON } from "../navigation/contracts";
import type {
  DataTableClassNames,
  DataTableProps,
  DataTableSlots,
} from "../tableAdapterContracts";
import type { UseDataTableShellResult } from "../useDataTableShell";
import {
  DENSITY_CONTROL,
  FULLSCREEN_CONTROL,
  SAVED_VIEWS_CONTROL,
} from "../viewControls/contracts";
import { TableFooterChrome } from "./tableSummaryChrome";

/** Required kit paint for the shared table surface. */
export interface DataTableSurfaceSlots<TRow> {
  readonly Search: (props: {
    /** Includes native onInput; model-driven controls consume it when wiring onChange. */
    readonly attrs: Attrs;
    readonly label: string;
    readonly value: string;
    readonly onChange: (value: string) => void;
    readonly classNames: DataTableClassNames;
  }) => VNodeChild;
  readonly Select: (props: {
    readonly attrs: Attrs;
    readonly label: string;
    readonly value: string;
    readonly options: readonly {
      readonly value: string;
      readonly label: string;
    }[];
    readonly onChange: (value: string) => void;
  }) => VNodeChild;
  readonly Button: (props: {
    readonly attrs: Attrs;
    readonly content: VNodeChild;
  }) => VNodeChild;
  readonly Loading: (props: {
    readonly rows: number;
    readonly columns: number;
    readonly mobile: boolean;
    readonly classNames: DataTableClassNames;
  }) => VNodeChild;
  readonly Desktop: (props: {
    readonly model: UseDataTableShellResult<TRow>["desktop"]["value"];
    readonly classNames: DataTableClassNames;
  }) => VNodeChild;
  readonly Mobile: (props: {
    readonly model: UseDataTableShellResult<TRow>["mobile"]["value"];
    readonly classNames: DataTableClassNames;
  }) => VNodeChild;
}

/** The shell remains the sole state owner; this component renders structure. */
export interface DataTableSurfaceChromeProps<TRow> {
  readonly model: UseDataTableShellResult<TRow>;
  readonly options: Pick<
    DataTableProps<TRow>,
    "searchable" | "skeletonRows" | "classNames"
  >;
  readonly slots: DataTableSurfaceSlots<TRow>;
  readonly content: DataTableSlots<TRow>;
  readonly rootRef: ElementRef;
  readonly scrollRef: ElementRef;
}

const liveStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

function slotNodes(value: VNodeChild): VNode[] {
  if (Array.isArray(value)) return value.flatMap(slotNodes);
  if (isVNode(value)) return [value];
  if (value == null || typeof value === "boolean")
    return [createCommentVNode()];
  return [createTextVNode(String(value))];
}
function contentSlot<TProps>(
  slot: ((props: TProps) => VNodeChild) | undefined,
  props: TProps,
  fallback?: () => VNode[]
): VNode {
  return renderSlot(
    slot ? { default: () => slotNodes(slot(props)) } : {},
    "default",
    {},
    fallback
  );
}

function bodyContent<TRow>(props: DataTableSurfaceChromeProps<TRow>): VNode {
  const { model: shell, options, slots, content } = props;
  const { table } = shell;
  const names = options.classNames ?? {};
  const labels = table.labels.value;
  const source = shell.source.value;
  const button = (attrs: Attrs, child: VNodeChild) =>
    slots.Button({ attrs, content: child });
  if (table.bodyRegion.value === "skeleton")
    return h(
      "div",
      {
        role: "status",
        "aria-busy": "true",
        "data-adapttable-part": "loading",
        class: names.loading,
      },
      [
        contentSlot(content.loading, {}, () => [
          h(Fragment, null, [
            slots.Loading({
              rows: options.skeletonRows ?? source.limit,
              columns: shell.desktop.value.columnCount,
              mobile: table.isMobile.value,
              classNames: names,
            }),
          ]),
          h("span", { style: liveStyle }, labels.loading),
        ]),
      ]
    );
  if (table.bodyRegion.value === "empty" && !table.errorState.value)
    return h(
      "output",
      {
        "data-adapttable-part": "empty",
        class: names.empty,
      },
      [
        contentSlot(
          content.empty,
          {
            noResults: table.emptyVariant.value === "noResults",
            clear: table.clearSearchAndFilters,
          },
          () => [
            h(Fragment, null, [
              table.emptyVariant.value === "noResults"
                ? labels.noResults
                : labels.noData,
              table.emptyVariant.value === "noResults"
                ? button(
                    {
                      type: "button",
                      "data-adapttable-part": "empty-clear",
                      class: names.emptyClear,
                      onClick: table.clearSearchAndFilters,
                    },
                    labels.clearAll
                  )
                : null,
            ]),
          ]
        ),
      ]
    );
  if (!table.rows.value.length) return createCommentVNode();
  const body = table.isMobile.value
    ? slots.Mobile({ model: shell.mobile.value, classNames: names })
    : slots.Desktop({ model: shell.desktop.value, classNames: names });
  return h(Fragment, null, [body]);
}

function toolbarContent<TRow>(
  props: DataTableSurfaceChromeProps<TRow>
): VNodeChild {
  const { model: shell, options, slots, content } = props;
  const { table } = shell;
  const names = options.classNames ?? {};
  const labels = table.labels.value;
  const button = (attrs: Attrs, child: VNodeChild) =>
    slots.Button({ attrs, content: child });
  const hasToolbarExtras =
    [
      TOOLBAR_EXTRAS,
      DENSITY_CONTROL,
      FULLSCREEN_CONTROL,
      SAVED_VIEWS_CONTROL,
      FIND_BUTTON,
      COLUMN_MENU,
    ].some((slot) => Boolean(shell.slotFills.value.get(slot.id)?.length)) ||
    shell.hasActionToolbar.value;
  return options.searchable !== false ||
    table.isMobile.value ||
    content.toolbar ||
    hasToolbarExtras ||
    shell.rowActions.value?.canAdd
    ? h("div", { "data-adapttable-part": "toolbar", class: names.toolbar }, [
        options.searchable !== false
          ? slots.Search({
              attrs: {
                ...table.searchInputAttrs(),
                "data-adapttable-part": "search",
                class: names.searchInput,
              },
              label: labels.search,
              value: table.searchValue.value,
              onChange: table.setSearchValue,
              classNames: names,
            })
          : null,
        table.isMobile.value && table.sortByOptions.value.length
          ? [
              h("div", [
                h("span", labels.sortBy),
                slots.Select({
                  attrs: {
                    "aria-label": labels.sortBy,
                    "data-adapttable-part": "sort-select",
                    class: names.sortSelect,
                  },
                  label: labels.sortBy,
                  value: table.sortBy.value ?? "",
                  options: [
                    { value: "", label: labels.sortBy },
                    ...table.sortByOptions.value,
                  ],
                  onChange: (value) =>
                    shell.source.value.setSort(
                      value || undefined,
                      table.sortDir.value
                    ),
                }),
              ]),
              button(
                {
                  type: "button",
                  disabled: !table.sortBy.value,
                  "aria-label":
                    table.sortDir.value === "asc"
                      ? labels.sortDescending
                      : labels.sortAscending,
                  "data-adapttable-part": "sort-direction",
                  class: names.sortDirectionButton,
                  onClick: () =>
                    shell.source.value.setSort(
                      table.sortBy.value,
                      table.sortDir.value === "asc" ? "desc" : "asc"
                    ),
                },
                table.sortDir.value === "asc"
                  ? labels.sortAscending
                  : labels.sortDescending
              ),
            ]
          : null,
        shell.renderToolbarExtras({ ...names }),
        shell.rowActions.value?.canAdd
          ? button(
              {
                type: "button",
                "data-adapttable-part": "add-row",
                class: names.addRow,
                onClick: () => shell.rowActions.value?.addRow(),
              },
              labels.addRow
            )
          : null,
        contentSlot(content.toolbar, {}),
      ])
    : null;
}

/** Shared table structure; the adapter supplies every visible control. */
export const DataTableSurfaceChrome = /* @__PURE__ */ Object.assign(
  function DataTableSurfaceChrome<TRow>(
    props: DataTableSurfaceChromeProps<TRow>,
    context: Pick<SetupContext, "attrs">
  ): VNodeChild {
    const { model: shell, options, slots, content } = props;
    for (const name of [
      "Search",
      "Select",
      "Button",
      "Loading",
      "Desktop",
      "Mobile",
    ] as const)
      if (typeof slots[name] !== "function")
        throw new Error(
          `AdaptTable: DataTableSurfaceChrome requires the ${name} slot.`
        );
    const { table } = shell;
    const names = options.classNames ?? {};
    const labels = table.labels.value;
    const source = shell.source.value;
    const pagination = table.pagination.value;
    const button = (attrs: Attrs, child: VNodeChild) =>
      slots.Button({ attrs, content: child });
    const scroll = () =>
      h(
        "div",
        {
          ref: elementRef(props.scrollRef),
          tabindex: "-1",
          "data-adapttable-part": "scroll-box",
          style:
            typeof shell.featureOptions.value.maxHeight === "number"
              ? {
                  maxHeight: `${shell.featureOptions.value.maxHeight}px`,
                  overflow: "auto",
                }
              : undefined,
          class: names.scroll,
          "aria-busy":
            source.isLoading || table.isRefreshing.value ? "true" : undefined,
        },
        [
          bodyContent(props),
          table.canLoadMore.value
            ? h(
                "div",
                {
                  ...table.loadMoreAttrs(),
                  "data-adapttable-part": "load-more",
                  class: names.loadMore,
                },
                [
                  button(
                    {
                      ...table.loadMoreButtonAttrs(),
                      "data-adapttable-part": "load-more-button",
                      class: names.loadMoreButton,
                    },
                    labels.loadMore
                  ),
                ]
              )
            : null,
        ]
      );
    return h(
      "div",
      mergeProps(context.attrs, {
        ref: elementRef(props.rootRef),
        dir: table.dir.value,
        "data-adapttable-part": "root",
        "data-density": shell.density.value,
        class: names.root,
      }),
      [
        shell.rowReorder.value
          ? h(
              "span",
              {
                role: "status",
                "aria-live": "polite",
                "aria-atomic": "true",
                "data-adapttable-part": "row-reorder-announcer",
                class: names.rowReorderAnnouncer,
                style: liveStyle,
              },
              shell.rowReorder.value.snapshot.announcement
            )
          : null,
        toolbarContent(props),
        shell.renderActiveFilterChips(),
        shell.renderBulkActions({ ...names }),
        shell.renderBatchEditBar(),
        shell.renderAgentApproval({ ...names }),
        shell.renderNavigationBefore({ ...names }),
        table.errorState.value
          ? h(
              "div",
              {
                role: "alert",
                "data-adapttable-part": "error",
                class: names.error,
              },
              [
                contentSlot(content.error, table.errorState.value, () => [
                  h("strong", labels.errorTitle),
                  h("p", labels.errorMessage),
                  h(Fragment, null, [
                    table.errorState.value?.retry
                      ? button(
                          {
                            type: "button",
                            disabled: table.errorState.value.retrying,
                            "data-adapttable-part": "retry-button",
                            class: names.retry,
                            onClick: () => table.errorState.value?.retry?.(),
                          },
                          labels.retry
                        )
                      : null,
                  ]),
                ]),
              ]
            )
          : null,
        table.isRefreshing.value
          ? h(
              "div",
              {
                role: "status",
                "data-adapttable-part": "refresh-indicator",
                class: names.refreshing,
              },
              labels.loading
            )
          : null,
        shell.groupingPanel.value ? shell.renderGroupingPanel() : null,
        h(
          SidePanelLayoutChrome,
          {
            open: shell.sidePanel.value?.open != null,
            side: shell.sidePanel.value?.side,
            mobile: table.isMobile.value,
            panel: () => shell.renderSidePanel({ ...names }),
          },
          { default: scroll }
        ),
        shell.renderActionOverlays({ ...names }),
        content.tableFooter
          ? h(TableFooterChrome, {
              content: content.tableFooter,
              className: names.tableFooter,
            })
          : null,
        table.showFooter.value
          ? h(
              "div",
              { "data-adapttable-part": "footer", class: names.footer },
              [
                h("div", [
                  h("span", labels.rowsPerPage),
                  slots.Select({
                    attrs: {
                      "aria-label": labels.rowsPerPage,
                      "data-adapttable-part": "rows-per-page",
                      class: names.rowsPerPage,
                    },
                    label: labels.rowsPerPage,
                    value: String(source.limit),
                    options: table.pageSizeOptions.value.map((size) => ({
                      value: String(size),
                      label: String(size),
                    })),
                    onChange: (value) => table.setLimit(Number(value)),
                  }),
                ]),
                h(
                  "span",
                  labels.showing({
                    from: pagination.fromIndex,
                    to: pagination.toIndex,
                    total: source.total,
                  })
                ),
                h(
                  "div",
                  { "data-adapttable-part": "pager", class: names.pager },
                  [
                    h(
                      "span",
                      labels.pageOf({
                        page: pagination.safePage,
                        total: pagination.totalPages,
                      })
                    ),
                    button(
                      {
                        type: "button",
                        "aria-label": labels.previousPage,
                        disabled: pagination.safePage <= 1,
                        "data-adapttable-part": "page-prev",
                        class: names.pagePrev,
                        onClick: () =>
                          table.setPage(table.pagination.value.safePage - 1),
                      },
                      labels.previousPage
                    ),
                    ...table.pagerSlots.value.map(({ item, key }) =>
                      item === "ellipsis"
                        ? h(
                            "span",
                            {
                              key,
                              "aria-hidden": "true",
                              "data-adapttable-part": "page-ellipsis",
                              class: names.pageEllipsis,
                            },
                            "…"
                          )
                        : h(Fragment, { key }, [
                            button(
                              {
                                type: "button",
                                "aria-label": labels.goToPage(item),
                                "aria-current":
                                  item === pagination.safePage
                                    ? "page"
                                    : undefined,
                                "data-adapttable-part": "page-number",
                                class: names.pageNumber,
                                onClick: () => table.setPage(item),
                              },
                              item
                            ),
                          ])
                    ),
                    button(
                      {
                        type: "button",
                        "aria-label": labels.nextPage,
                        disabled: pagination.safePage >= pagination.totalPages,
                        "data-adapttable-part": "page-next",
                        class: names.pageNext,
                        onClick: () =>
                          table.setPage(table.pagination.value.safePage + 1),
                      },
                      labels.nextPage
                    ),
                  ]
                ),
              ]
            )
          : null,
        shell.renderNavigationAfter({ ...names }),
        h(
          "span",
          {
            role: "status",
            "aria-live": "polite",
            "aria-atomic": "true",
            "data-adapttable-part": "table-status-announcer",
            class: [names.tableStatusAnnouncer, names.status],
            style: liveStyle,
          },
          table.statusAnnouncement.value
        ),
        shell.renderTableAssistant(),
      ]
    );
  },
  {
    props: ["model", "options", "slots", "content", "rootRef", "scrollRef"],
    inheritAttrs: false,
  }
);

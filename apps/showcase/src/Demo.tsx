import {
  type ColumnLayoutState,
  type TableSource,
  useColumnLayoutUrlState,
  useFrontendData,
  useQuerySource,
} from "@adapttable/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useState } from "react";

import {
  BASE_COLUMNS,
  DEMO_FILTER_RUNTIME,
  DEMO_GROUP_AGGREGATES,
  PEOPLE,
  type Person,
} from "./data";
import { fetchPeople, type PeoplePage, type PeopleParams } from "./mockApi";

export type DataMode = "frontend" | "backend";
export type PageMode = "paged" | "infinite";
export type Density = "comfortable" | "compact";
export type FiltersUi = "popover" | "drawer";

/** A small page size so both modes show real pagination over 30 rows. */
// Five rows by default: enough to show real data while keeping the
// whole table (and often the footer) on one screen.
const DEFAULTS = { limit: 5 };

/**
 * The URL-persisted column controls every adapter demo spreads onto its
 * `<DataTable>`. Wiring these makes pin / hide / reorder / resize survive a
 * kit remount and a page reload. Density / locale / filters update as props
 * without tearing the table down.
 *
 * `onCellEdit` is frontend-only: mutable local rows. Backend mode omits it
 * so editing stays fully dormant (package DNA — nothing forced).
 *
 * `groupBy` / `groupAggregates` follow the same rule — frontend tier only;
 * server-paginated sources cannot regroup a full result set.
 */
export interface DemoColumnProps {
  columnLayout: ColumnLayoutState;
  onColumnLayoutChange: (next: ColumnLayoutState) => void;
  onCellEdit?: (row: Person, key: string, nextValue: unknown) => void;
  /** `null` forces grouping off even if the URL carries a groupBy. */
  groupBy?: string | null;
  groupAggregates?: (
    rows: readonly Person[]
  ) => Partial<Record<string, ReactNode>>;
}

/** Adapter demos provide this — given a source + column controls, render. */
export type TableRender = (
  source: TableSource<Person>,
  columns: DemoColumnProps
) => ReactNode;

/**
 * Demo affordance: pinning a column reveals every hidden column, so the table
 * widens past its container and the pin's stickiness becomes visible while
 * scrolling. Only fires when a *new* pin is added (not on unpin/resize).
 */
function revealHiddenOnPin(
  prev: ColumnLayoutState,
  next: ColumnLayoutState
): ColumnLayoutState {
  const pinAdded = Object.keys(next.pinned).some(
    (key) => !(key in prev.pinned)
  );
  return pinAdded && next.hidden.length > 0 ? { ...next, hidden: [] } : next;
}

function usePeopleQuery(params: PeopleParams) {
  return useInfiniteQuery({
    queryKey: ["people", params],
    queryFn: ({ pageParam }) => fetchPeople({ ...params, page: pageParam }),
    initialPageParam: params.page ?? 1,
    getNextPageParam: (last: PeoplePage) => last.nextPage ?? undefined,
  });
}

interface DataProps {
  render: TableRender;
  columns: DemoColumnProps;
  pageMode?: PageMode;
  /** URL-param namespace, so each table on the page has isolated state. */
  urlKey?: string;
  /** Opt-in feature toggles — off renders the plain table (package DNA). */
  grouping?: boolean;
  editing?: boolean;
}

/** Column key → row field for composite cells (person shows name; load
 * shows utilisation). Every other column key IS the field name. */
const EDIT_FIELD: Record<string, keyof Person> = {
  person: "name",
  load: "utilization",
};

function Frontend({
  render,
  columns,
  pageMode,
  urlKey,
  grouping,
  editing,
}: Readonly<DataProps>) {
  // Clone so cell edits never mutate the shared PEOPLE seed.
  const [data, setData] = useState(() => PEOPLE.map((row) => ({ ...row })));
  const onCellEdit = useCallback(
    (row: Person, key: string, nextValue: unknown) => {
      const field = EDIT_FIELD[key] ?? (key as keyof Person);
      setData((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, [field]: nextValue as never } : r
        )
      );
    },
    []
  );
  const source = useFrontendData<Person>({
    data,
    columns: BASE_COLUMNS,
    arrayExtraKeys: DEMO_FILTER_RUNTIME.arrayExtraKeys,
    numberExtraKeys: DEMO_FILTER_RUNTIME.numberExtraKeys,
    filterFn: DEMO_FILTER_RUNTIME.filterFn,
    defaults: DEFAULTS,
    paginationMode: pageMode,
    urlKey,
  });
  return (
    <>
      {render(source, {
        ...columns,
        // Both features are strictly opt-in: the toggles mirror the API —
        // pass `onCellEdit` and cells edit; pass `groupBy` and groups appear.
        ...(editing ? { onCellEdit } : {}),
        ...(grouping
          ? { groupBy: "team", groupAggregates: DEMO_GROUP_AGGREGATES }
          : { groupBy: null }),
      })}
    </>
  );
}

function Backend({ render, columns, pageMode, urlKey }: Readonly<DataProps>) {
  const source = useQuerySource<Person, PeopleParams, PeoplePage>({
    usePaginatedQuery: usePeopleQuery,
    arrayExtraKeys: DEMO_FILTER_RUNTIME.arrayExtraKeys,
    numberExtraKeys: DEMO_FILTER_RUNTIME.numberExtraKeys,
    defaults: DEFAULTS,
    paginationMode: pageMode,
    urlKey,
  });
  // No onCellEdit — editing stays dormant on the server path.
  return <>{render(source, columns)}</>;
}

/**
 * Render the same table against either data path. Only one data hook is
 * mounted at a time (remounted on `mode` change), so the headless source is
 * the single thing that differs — the adapter markup is identical. The column
 * layout is URL-persisted here (shared by both paths) so pin/hide/reorder
 * survive the re-mount.
 */
export function DemoBody({
  mode,
  pageMode,
  urlKey,
  defaultColumnLayout,
  render,
  grouping,
  editing,
}: Readonly<{
  mode: DataMode;
  pageMode?: PageMode;
  urlKey?: string;
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  render: TableRender;
  grouping?: boolean;
  editing?: boolean;
}>) {
  const { layout, onLayoutChange } = useColumnLayoutUrlState({
    urlKey,
    defaultColumnLayout,
  });
  const onColumnLayoutChange = useCallback(
    (next: ColumnLayoutState) =>
      onLayoutChange(revealHiddenOnPin(layout, next)),
    [layout, onLayoutChange]
  );
  const columns: DemoColumnProps = {
    columnLayout: layout,
    onColumnLayoutChange,
  };

  return mode === "backend" ? (
    <Backend
      render={render}
      columns={columns}
      pageMode={pageMode}
      urlKey={urlKey}
    />
  ) : (
    <Frontend
      render={render}
      columns={columns}
      pageMode={pageMode}
      urlKey={urlKey}
      grouping={grouping}
      editing={editing}
    />
  );
}

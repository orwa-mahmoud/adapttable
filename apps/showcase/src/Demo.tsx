import type { EditEventHandler, GroupNode } from "@adapttable/core";
import {
  applyRowPatchesWithLog,
  applyRowReorder,
  type ColumnDef,
  type ColumnLayoutState,
  evaluateFilterTree,
  insertRow,
  type MobileCardModel,
  type MobileCardRenderer,
  type QueryFilterGroup,
  removeRow,
  type RowPatch,
  type Slot,
  type TableErrorState,
  type TableSource,
  updateRow,
  useColumnLayoutUrlState,
  useFrontendData,
  useHighlight,
  useQuerySource,
} from "@adapttable/core";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type DemoScenario,
  layoutFor,
  pageLimitFor,
  seedRoster,
} from "./casts";
import {
  BASE_COLUMNS,
  budget,
  consecutiveTeamSpan,
  DEMO_FILTER_RUNTIME,
  DEMO_GROUP_AGGREGATES,
  demoUrlSync,
  EDITING_DEFAULT_LAYOUT,
  GROUPS_DEFAULT_LAYOUT,
  isRemote,
  LIVE_DEFAULT_LAYOUT,
  makeLargeDirectory,
  orderPeopleByTeam,
  PEOPLE,
  type Person,
  personSkills,
  personStatus,
  reportsTo,
  SKILLS,
  SPAN_DEFAULT_LAYOUT,
  startDate,
  STATUSES,
  TEAMS,
  utilization,
} from "./data";
import { fetchPeople, type PeoplePage, type PeopleParams } from "./mockApi";
import { usePatchSink } from "./patchSink";
import { useRealtimeSlot } from "./realtimeSlot";

/**
 * Where the rows come from.
 *
 * `large` is the frontend path over a generated directory rather than the
 * thirty-row seed — same hook, same props, forty thousand rows.
 */
export type DataMode = "frontend" | "backend" | "large";
export type PageMode = "paged" | "infinite";
export type Density = "comfortable" | "compact";
export type FiltersUi = "popover" | "drawer" | "header";

/**
 * Which load-failure state to show: none, the adapter's own, or a
 * replacement passed through `slots.error`.
 */
export type Failure = "off" | "builtin" | "replaced";

/** The failure the lab simulates. */
const DEMO_FAILURE = new Error("The people service did not answer (503).");

/**
 * A host's own error state, to sit beside the built-in one.
 *
 * Deliberately not a static node: it reads the error it is reporting and
 * offers the retry the source handed it, which is the whole reason this slot
 * takes a function.
 */
const REPLACED_ERROR_SLOT = {
  error: ({ error, retry, retrying }: TableErrorState) => (
    <div className="demo-error" role="alert">
      <strong>Could not load people</strong>
      <p>{error.message}</p>
      {retry && (
        <button type="button" onClick={retry} disabled={retrying}>
          {retrying ? "Retrying…" : "Try again"}
        </button>
      )}
    </div>
  ),
};

/**
 * A host's own card: the identity column as a headline, the rest as a
 * compact grid. It reuses `card.fields`, so every value — cell renderers and
 * editors included — is the one the built-in card would have shown.
 */
function demoCard(row: Person, card: MobileCardModel<Person>): ReactNode {
  const [identity, ...rest] = card.fields;
  return (
    <div className="demo-person-card">
      <p className="demo-person-card__name">{identity?.value}</p>
      <dl className="demo-person-card__grid">
        {rest.map(({ column, label, value }) => (
          <div key={column.key}>
            {label && <dt>{label}</dt>}
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The demo's own card layout, when that toggle is on. */
function cardRenderer(
  customCard: boolean | undefined
): MobileCardRenderer<Person> | undefined {
  return customCard ? demoCard : undefined;
}

/** The failure the lab is simulating, or none. */
function demoError(failure: Failure | undefined): Error | null {
  return failure && failure !== "off" ? DEMO_FAILURE : null;
}

/** The host's own error state, when the lab is showing a replacement. */
function errorSlots(
  failure: Failure | undefined
): { error: (state: TableErrorState) => ReactNode } | undefined {
  return failure === "replaced" ? REPLACED_ERROR_SLOT : undefined;
}

const AdvancedFiltersContext = createContext(false);

/** Feature Lab and the Filtering page — the live root demo stays simple. */
export const AdvancedFiltersProvider = AdvancedFiltersContext.Provider;

function useAdvancedFilters(): boolean {
  return useContext(AdvancedFiltersContext);
}

const ScenarioContext = createContext<DemoScenario>("live");

/** Feature pages wrap the table in a scenario; `/` and Feature Lab omit this. */
export const DemoScenarioProvider = ScenarioContext.Provider;

function useDemoScenario(): DemoScenario {
  return useContext(ScenarioContext);
}

/** Hide the AND/OR builder without changing the hook's setter contract. */
function withoutFilterTree<T>(source: TableSource<T>): TableSource<T> {
  return { ...source, setFilterTree: undefined };
}

/** A small page size so both modes show real pagination over 30 rows. */
// Five rows by default: enough to show real data while keeping the
// whole table (and often the footer) on one screen.
const DEFAULTS = { limit: 5 };
const TREE_DEFAULTS = { limit: 30 };
/**
 * The realtime page: ten rows, Budget sorted. The patcher reads the live
 * direction so a row lands in the first six of what is actually on screen.
 */
const REALTIME_DEFAULTS = {
  limit: 10,
  sortBy: "budget",
  sortDir: "desc" as const,
};
/**
 * A page large enough for the row window to be a window.
 *
 * Five rows would mount five rows, which proves nothing about scale. A
 * hundred per page puts more rows on the page than fit on the screen, so the
 * virtualizer has something to leave out — and still leaves four hundred
 * pages for the pager to walk.
 */
const LARGE_DEFAULTS = { limit: 100 };

/** The row height the large mode's virtual window measures against, in px. */
const LARGE_ROW_ESTIMATE = 48;

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
  /** Table chrome follows {@link demoUrlSync}: live demo only. */
  urlSync?: boolean;
  collapsibleColumnGroups?: boolean;
  onCellEdit?: (row: Person, key: string, nextValue: unknown) => void;
  onEditStart?: EditEventHandler<Person>;
  onEditCancel?: EditEventHandler<Person>;
  onEditCommit?: EditEventHandler<Person>;
  onRowReorder?: (from: number, to: number, row: Person) => void;
  /** The flash on a changed row — a class, which every adapter honours. */
  rowClassName?: (row: Person, index: number) => string | undefined;
  /** The pulse on a cell a patch just changed — `data-flash` on the cell. */
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  /** The host's own error state, when the lab is showing a replacement. */
  slots?: { error?: Slot<TableErrorState> };
  /** The demo's own mobile card layout, when that toggle is on. */
  renderCard?: MobileCardRenderer<Person>;
  /** `null` forces grouping off even if the URL carries a groupBy. */
  groupBy?: string | readonly string[] | null;
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
  /** When `false`, keep query in memory. Only the live demo writes. */
  urlSync?: boolean;
  /**
   * Load the generated directory instead of the thirty-row seed, and window
   * the rows: a hundred per page, only the visible ones in the DOM.
   */
  large?: boolean;
  /** Opt-in feature toggles — off renders the plain table (package DNA). */
  grouping?: boolean;
  editing?: boolean;
  tree?: boolean;
  rowMode?: boolean;
  batch?: boolean;
  rowMutations?: boolean;
  rowReorder?: boolean;
  rowPinning?: boolean;
  cellSpan?: boolean;
  extraRows?: boolean;
  rowStyle?: boolean;
  /** Flash the row a change just landed on. */
  highlight?: boolean;
  /** Fail the load, so the error chrome is on screen. */
  failure?: Failure;
  /** Lay the mobile cards out with the demo's own `renderCard`. */
  customCard?: boolean;
  /** What the error state's retry does — here, clear the simulated failure. */
  onRecover?: () => void;
  /** Apply live row patches on a timer, the way a socket feed would. */
  realtime?: boolean;
  /** AND/OR builder — Feature Lab only. Live demo stays a simple form. */
  advancedFilters?: boolean;
  /** Hand the rows their id-derived fields, so a formula can read them. */
  derivedFields?: boolean;
  /**
   * The formula columns the table is rendering. The data hook needs them too:
   * a click on a formula column's header sorts by a key only these columns
   * know how to resolve.
   */
  formulaColumns?: readonly ColumnDef<Person>[];
}

/**
 * The seed rows, with the id-derived fields written onto them.
 *
 * Most of the demo reads `status`, `budget` and `utilization` through a
 * function, so a row carries one only after an edit materializes it. A formula
 * reads FIELDS — `=budget * 0.15` asks the row for `budget` and gets `#NAME?`
 * if it is not there — so a page that lets the reader type one hands the engine
 * rows that actually carry them. The values are the same ones the accessors
 * derive, so nothing on screen changes.
 */
function withDerivedFields(rows: readonly Person[]): Person[] {
  return rows.map((row) => ({
    ...row,
    status: personStatus(row),
    budget: budget(row),
    utilization: utilization(row),
  }));
}

/**
 * The rows a frontend table starts from.
 *
 * The large directory is generated here rather than at module scope, so a
 * page that never asks for it never builds it — and it arrives with its
 * derived fields written on, since a formula reads fields, not accessors.
 */
function seedRows(
  large: boolean,
  derivedFields: boolean,
  scenario: DemoScenario
): Person[] {
  if (large) return withDerivedFields(makeLargeDirectory());
  return seedRoster(scenario, derivedFields);
}

/** The page size each row shape asks for. */
function pageDefaults(
  tree: boolean,
  large: boolean,
  realtime: boolean,
  scenario: DemoScenario
): { limit: number; sortBy?: string; sortDir?: "asc" | "desc" } {
  if (tree) return TREE_DEFAULTS;
  if (large) return LARGE_DEFAULTS;
  if (realtime) return REALTIME_DEFAULTS;
  const limit = pageLimitFor(scenario);
  if (limit !== undefined) return { limit };
  return DEFAULTS;
}

/**
 * How the rows arrive.
 *
 * The row window measures a scroll, not a page: a paged body renders the page
 * it is on, whole. So the large set reads through infinite scroll — a hundred
 * at a time, only the visible ones in the DOM. A pager and a window are
 * alternatives, not layers.
 *
 * Anything else passes `pageMode` through untouched — `undefined` included,
 * which is how the hook keeps resolving its own default per viewport.
 */
function paginationFor(
  large: boolean,
  pageMode: PageMode | undefined
): PageMode | undefined {
  return large ? "infinite" : pageMode;
}

/** The next free id, so an added row never collides with a seeded one. */
function nextId(rows: readonly Person[]): string {
  return String(
    rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1
  );
}

/** A blank person to fill in — the row an Add starts from. */
function blankPerson(rows: readonly Person[]): Person {
  const id = nextId(rows);
  return {
    id,
    name: "",
    email: "",
    role: "",
    team: PEOPLE[0]?.team ?? "",
    nameAr: "",
    roleAr: "",
    teamAr: "",
  };
}

/**
 * Map editor column keys onto row fields — the same mapping a single cell
 * edit uses — so a batch write is one `updateRow` per person.
 */
function columnChanges(
  patch: Readonly<Record<string, unknown>>
): Partial<Person> {
  const changes: Partial<Person> = {};
  for (const [key, value] of Object.entries(patch)) {
    const field = EDIT_FIELD[key] ?? (key as keyof Person);
    (changes as Record<string, unknown>)[field] = value;
  }
  return changes;
}

/** Column key → row field for composite cells (person shows name; load
 * shows utilisation). Every other column key IS the field name. */
const EDIT_FIELD: Record<string, keyof Person> = {
  person: "name",
  load: "utilization",
  // The timeline cell shows a range; its editor edits the start it sorts by.
  timeline: "start",
};

/**
 * A patch records the row field that moved; the table asks about the
 * column key. Composite cells (Person, Load, Timeline) use a different
 * word for each, so a flash reader has to accept both.
 */
function columnOrFieldFlashing(
  isFlashing: (rowId: string, columnKey: string) => boolean,
  rowId: string,
  columnKey: string
): boolean {
  if (isFlashing(rowId, columnKey)) return true;
  return (
    Object.hasOwn(EDIT_FIELD, columnKey) &&
    isFlashing(rowId, EDIT_FIELD[columnKey])
  );
}

function pickOther<T>(choices: readonly T[], current: T): T {
  for (const item of choices) {
    if (item !== current) return item;
  }
  return current;
}

let incomingNonce = 0;
function incomingToken(): string {
  incomingNonce += 1;
  return incomingNonce.toString(36);
}

/**
 * A value that is not what the open cell currently holds, so Take theirs
 * actually replaces the draft instead of writing the same string back.
 */
function incomingEditValue(row: Person, columnKey: string): unknown {
  const field = EDIT_FIELD[columnKey] ?? (columnKey as keyof Person);
  switch (field) {
    case "email":
      return `incoming.${incomingToken()}@example.com`;
    case "name":
      return `Incoming ${row.name}`;
    case "team":
      return pickOther(TEAMS, row.team);
    case "status":
      return pickOther(STATUSES, personStatus(row));
    case "budget": {
      const now = budget(row);
      return now === 99_999 ? 12_345 : 99_999;
    }
    case "utilization": {
      const now = utilization(row);
      return now === 17 ? 83 : 17;
    }
    case "start": {
      const current = startDate(row).toISOString().slice(0, 10);
      return current === "2026-12-24" ? "2026-01-02" : "2026-12-24";
    }
    case "role":
      return "Incoming role";
    case "remote":
      return !isRemote(row);
    case "skills": {
      const current = personSkills(row)[0] ?? "react";
      return [pickOther([...SKILLS], current)];
    }
    default:
      return `incoming-${incomingToken()}`;
  }
}

/** Feature flags on the frontend demo, assembled away from the data hook. */
function frontendColumnProps(
  columns: DemoColumnProps,
  flags: {
    large?: boolean;
    editing?: boolean;
    rowMode?: boolean;
    grouping?: boolean;
    tree?: boolean;
    batch?: boolean;
    rowMutations?: boolean;
    rowReorder?: boolean;
    rowPinning?: boolean;
    cellSpan?: boolean;
    extraRows?: boolean;
    extraAnchorId?: string;
    rowStyle?: boolean;
    customCard?: boolean;
    failure?: Failure;
    data: readonly Person[];
    flashClass: (row: Person) => string | undefined;
    isCellFlashing?: (rowId: string, columnKey: string) => boolean;
    onCellEdit: (row: Person, key: string, nextValue: unknown) => void;
    onEditStart: EditEventHandler<Person>;
    onEditCancel: EditEventHandler<Person>;
    onEditCommit: EditEventHandler<Person>;
    onBatchEdit: (
      edits: readonly { row: Person; patch: Record<string, unknown> }[]
    ) => void;
    onAddRow: () => void;
    onDuplicateRow: (row: Person) => void;
    onDeleteRow: (row: Person) => void;
    onRowReorder: (from: number, to: number) => void;
    writePatches: (patches: readonly RowPatch<Person>[]) => void;
    flashRow: (id: Person["id"]) => void;
  }
): DemoColumnProps {
  const next: DemoColumnProps = {
    ...columns,
    rowClassName: flags.flashClass,
    isCellFlashing: flags.isCellFlashing,
    slots: errorSlots(flags.failure),
    renderCard: cardRenderer(flags.customCard),
    groupBy: null,
  };
  if (flags.large) {
    Object.assign(next, {
      virtualize: true,
      estimateRowSize: LARGE_ROW_ESTIMATE,
    });
  }
  if (flags.editing) {
    Object.assign(next, {
      onCellEdit: flags.onCellEdit,
      onEditStart: flags.onEditStart,
      onEditCancel: flags.onEditCancel,
      onEditCommit: flags.onEditCommit,
      rowVersion: (row: Person) => row.revision ?? 0,
    });
  }
  if (flags.rowMode) {
    Object.assign(next, {
      rowEditing: true,
      onRowEdit: (row: Person, patch: Record<string, unknown>) => {
        flags.writePatches([updateRow(row.id, columnChanges(patch))]);
        flags.flashRow(row.id);
      },
    });
  }
  if (flags.grouping) {
    Object.assign(next, {
      groupBy: ["team", "status"],
      groupAggregates: DEMO_GROUP_AGGREGATES,
      groupFooters: true,
      groupSort: (a: GroupNode<Person>, b: GroupNode<Person>) =>
        b.leafRows.length - a.leafRows.length,
    });
  }
  if (flags.tree) {
    Object.assign(next, { getParentId: reportsTo, treeColumn: "person" });
  }
  if (flags.batch) {
    Object.assign(next, { batchEditing: true, onBatchEdit: flags.onBatchEdit });
  }
  if (flags.rowMutations) {
    Object.assign(next, {
      onAddRow: flags.onAddRow,
      onDuplicateRow: flags.onDuplicateRow,
      onDeleteRow: flags.onDeleteRow,
    });
  }
  if (flags.rowReorder) {
    Object.assign(next, { onRowReorder: flags.onRowReorder });
  }
  if (flags.rowPinning) {
    Object.assign(next, { onPinnedRowIdsChange: () => undefined });
  }
  if (flags.cellSpan) {
    Object.assign(next, {
      // Team is the same fact on consecutive rows in visual order — merge
      // it, leave Person and Email alone. Reorder can break a run; that
      // is the point. Pin keeps the run: the person moves, Core stays one
      // cell.
      getCellSpan: ({
        column,
        sectionRows,
        sectionRowIndex,
      }: {
        column: { key: string };
        sectionRows: readonly Person[];
        sectionRowIndex: number;
      }) => {
        if (column.key !== "team") return undefined;
        const span = consecutiveTeamSpan(sectionRows, sectionRowIndex);
        return span > 1 ? { rowSpan: span } : undefined;
      },
    });
  }
  if (flags.extraRows && flags.extraAnchorId) {
    const extraHost = flags.data.find((row) => row.id === flags.extraAnchorId);
    const extraHostName = extraHost?.name ?? "this person";
    Object.assign(next, {
      extraRows: [
        {
          key: "note",
          kind: "fullWidth" as const,
          beforeRowId: flags.extraAnchorId,
          render: () =>
            `Full-width extra attached to ${extraHostName}. Drag or pin them — this note stays in front of them.`,
        },
      ],
    });
  }
  if (flags.rowStyle) {
    const accentId = flags.data[0]?.id;
    Object.assign(next, {
      rowStyle: (row: Person) =>
        row.id === accentId
          ? {
              backgroundColor:
                "light-dark(oklch(0.93 0.08 95), oklch(0.38 0.07 85))",
            }
          : undefined,
      rowHeight: 48,
    });
  }
  return next;
}

function Frontend({
  render,
  columns,
  pageMode,
  urlKey,
  urlSync,
  large,
  grouping,
  editing,
  tree,
  rowMode,
  batch,
  rowMutations,
  rowReorder,
  rowPinning,
  cellSpan,
  extraRows,
  rowStyle,
  highlight,
  failure,
  onRecover,
  customCard,
  realtime,
  advancedFilters,
  derivedFields,
  formulaColumns,
}: Readonly<DataProps>) {
  const scenario = useDemoScenario();
  // Cloned, so cell edits never mutate the shared PEOPLE seed. Span starts
  // from a team-sorted copy so Core sits together; the seed file itself
  // stays interleaved (tree leads and Alan-as-row-2 e2e depend on that).
  const [data, setData] = useState<readonly Person[]>(() => {
    const rows = seedRows(large === true, derivedFields === true, scenario);
    return cellSpan ? orderPeopleByTeam(rows) : rows;
  });
  const extraAnchorId = useRef(data[0]?.id).current;
  const RealtimeSlot = useRealtimeSlot();
  const patchSink = usePatchSink();
  const isFlashingRef = useRef<(rowId: string, columnKey: string) => boolean>(
    () => false
  );
  const sinkRef = useRef(patchSink);
  sinkRef.current = patchSink;
  const writePatches = useCallback((patches: readonly RowPatch<Person>[]) => {
    setData((prev) => {
      const log = applyRowPatchesWithLog(prev, patches, (row) => row.id);
      if (log.events.length > 0) {
        const events = log.events;
        queueMicrotask(() => sinkRef.current?.onEvents(events));
      }
      return log.rows;
    });
  }, []);
  // The demo owns the data, so the demo is what knows which row changed —
  // exactly where a real app would flash it. Note there is no highlight prop
  // on the table: `rowClassName` is the seam, so this works in every kit.
  const flash = useHighlight(highlight === true || realtime === true);
  const onCellEdit = useCallback(
    (row: Person, key: string, nextValue: unknown) => {
      const field = EDIT_FIELD[key] ?? (key as keyof Person);
      writePatches([updateRow(row.id, { [field]: nextValue as never })]);
      flash.flashRow(row.id);
    },
    [flash, writePatches]
  );
  const onBatchEdit = useCallback(
    (edits: readonly { row: Person; patch: Record<string, unknown> }[]) => {
      writePatches(
        edits.map((edit) => updateRow(edit.row.id, columnChanges(edit.patch)))
      );
      for (const edit of edits) flash.flashRow(edit.row.id);
    },
    [flash, writePatches]
  );
  // Adding, copying and removing rows: the table asks, the demo owns the list —
  // the same one-way flow a real app's mutation would follow.
  // The new row is built before the update rather than inside it: a state
  // updater must stay pure, and the flash needs the id it produced.
  const onAddRow = useCallback(() => {
    const added = blankPerson(data);
    writePatches([insertRow(added, 0)]);
    flash.flashRow(added.id);
  }, [data, flash, writePatches]);
  const onDuplicateRow = useCallback(
    (row: Person) => {
      const copy = { ...row, id: nextId(data) };
      writePatches([insertRow(copy, 0)]);
      flash.flashRow(copy.id);
    },
    [data, flash, writePatches]
  );
  const onDeleteRow = useCallback(
    (row: Person) => {
      writePatches([removeRow(row.id)]);
    },
    [writePatches]
  );
  const onRowReorder = useCallback((from: number, to: number) => {
    setData((prev) => applyRowReorder(prev, from, to));
  }, []);
  const [activeEdit, setActiveEdit] = useState<{
    rowId: string;
    columnKey: string;
  } | null>(null);
  const onEditStart = useCallback<EditEventHandler<Person>>((event) => {
    setActiveEdit({
      rowId: event.rowId,
      columnKey: event.columnKey || "email",
    });
  }, []);
  const onEditEnd = useCallback(() => setActiveEdit(null), []);
  // The incoming row has to disagree with the open cell, not only bump a
  // revision: Take theirs reads that cell's stored value.
  const simulateLiveUpdate = useCallback(() => {
    if (!activeEdit) return;
    const { rowId, columnKey } = activeEdit;
    const field = EDIT_FIELD[columnKey] ?? (columnKey as keyof Person);
    const row = data.find((person) => person.id === rowId);
    if (!row) return;
    writePatches([
      updateRow(rowId, {
        [field]: incomingEditValue(row, columnKey) as never,
        revision: (row.revision ?? 0) + 1,
      }),
    ]);
  }, [activeEdit, data, writePatches]);
  // Two classes, not one: the mark holds steady under reduced motion, so the
  // user still learns which row changed without anything moving.
  const flashClass = useCallback(
    (row: Person) => {
      if (!flash.isRowHighlighted(row.id)) return undefined;
      return flash.animated ? "demo-flash demo-flash--animated" : "demo-flash";
    },
    [flash]
  );
  const sourceColumns = useMemo(
    () =>
      formulaColumns && formulaColumns.length > 0
        ? [...BASE_COLUMNS, ...formulaColumns]
        : BASE_COLUMNS,
    [formulaColumns]
  );
  const source = useFrontendData<Person>({
    data,
    error: demoError(failure),
    // A retry that actually recovers: the demo's "server" answers on the
    // second ask, so the button is worth pressing.
    refetch: onRecover,
    // The formula columns join the stable set: a click on one of their headers
    // sorts by a key only they can resolve, and a source that had never heard
    // of the key would quietly sort by nothing.
    columns: sourceColumns,
    arrayExtraKeys: DEMO_FILTER_RUNTIME.arrayExtraKeys,
    numberExtraKeys: DEMO_FILTER_RUNTIME.numberExtraKeys,
    filterFn: DEMO_FILTER_RUNTIME.filterFn,
    // Keep the headless engine active for deep links and restored query state.
    // `withoutFilterTree` below hides only the builder UI outside Feature Lab
    // and the Filtering page.
    filterTreeFn: (row: Person, tree: QueryFilterGroup) =>
      evaluateFilterTree(
        tree,
        row,
        DEMO_FILTER_RUNTIME.defs,
        DEMO_FILTER_RUNTIME.registry
      ),
    // A hierarchy needs its parents in hand: a five-row page cut through an
    // org chart leaves every visible person a root, so the tree demo takes the
    // whole team at once.
    defaults: pageDefaults(
      tree === true,
      large === true,
      realtime === true,
      scenario
    ),
    paginationMode: paginationFor(large === true, pageMode),
    urlKey,
    urlSync,
  });
  const tableSource = advancedFilters ? source : withoutFilterTree(source);
  const live = realtime === true && RealtimeSlot !== null;
  return (
    <>
      {editing ? (
        <div className="demo-live-update">
          <span>Edit a cell, then test an incoming server change.</span>
          <button
            type="button"
            data-adapttable-part="demo-live-update"
            disabled={activeEdit === null}
            onMouseDown={(event) => {
              // A websocket does not steal focus. Prevent the editor from
              // blur-committing before the row actually changes.
              event.preventDefault();
            }}
            onClick={simulateLiveUpdate}
          >
            Simulate incoming update
          </button>
        </div>
      ) : null}
      {live ? (
        <RealtimeSlot
          data={data}
          setData={setData}
          sortDir={source.sortDir === "asc" ? "asc" : "desc"}
          onPatched={flash.flashRow}
          isFlashingRef={isFlashingRef}
        />
      ) : null}
      {render(
        tableSource,
        frontendColumnProps(columns, {
          large,
          editing,
          rowMode,
          grouping,
          tree,
          batch,
          rowMutations,
          rowReorder,
          rowPinning,
          cellSpan,
          extraRows,
          extraAnchorId,
          rowStyle,
          customCard,
          failure,
          data,
          flashClass,
          isCellFlashing:
            live || patchSink
              ? (rowId, columnKey) =>
                  columnOrFieldFlashing(
                    isFlashingRef.current,
                    rowId,
                    columnKey
                  ) ||
                  (patchSink
                    ? columnOrFieldFlashing(
                        patchSink.isFlashingRef.current,
                        rowId,
                        columnKey
                      )
                    : false)
              : undefined,
          onCellEdit,
          onEditStart,
          onEditCancel: onEditEnd,
          onEditCommit: onEditEnd,
          onBatchEdit,
          onAddRow,
          onDuplicateRow,
          onDeleteRow,
          onRowReorder,
          writePatches,
          flashRow: flash.flashRow,
        })
      )}
    </>
  );
}

function Backend({
  render,
  columns,
  pageMode,
  urlKey,
  urlSync,
  advancedFilters,
}: Readonly<DataProps>) {
  const source = useQuerySource<Person, PeopleParams, PeoplePage>({
    usePaginatedQuery: usePeopleQuery,
    arrayExtraKeys: DEMO_FILTER_RUNTIME.arrayExtraKeys,
    numberExtraKeys: DEMO_FILTER_RUNTIME.numberExtraKeys,
    defaults: DEFAULTS,
    paginationMode: pageMode,
    urlKey,
    urlSync,
    supports: { filterTree: Boolean(advancedFilters), facets: true },
    facetKeys: ["team"],
    selectPage: (page) => ({
      rows: page.items,
      total: page.total,
      facets: page.facets,
    }),
  });
  // No onCellEdit — editing stays dormant on the server path.
  return (
    <>{render(advancedFilters ? source : withoutFilterTree(source), columns)}</>
  );
}

/**
 * Render the same table against either data path. Only one data hook is
 * mounted at a time (remounted on `mode` change), so the headless source is
 * the single thing that differs — the adapter markup is identical. The column
 * layout is URL-persisted here (shared by both paths) so pin/hide/reorder
 * survive the re-mount — but only on the live demo (`urlKey="live"`).
 * Feature Lab and kit feature pages do not write the address bar.
 */
export function DemoBody({
  mode,
  pageMode,
  urlKey,
  defaultColumnLayout,
  render,
  grouping,
  editing,
  tree,
  rowMode,
  batch,
  rowMutations,
  rowReorder,
  rowPinning,
  cellSpan,
  extraRows,
  rowStyle,
  highlight,
  failure,
  onRecover,
  customCard,
  realtime,
  columnGroups,
  derivedFields,
  formulaColumns,
}: Readonly<{
  mode: DataMode;
  pageMode?: PageMode;
  urlKey?: string;
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  render: TableRender;
  grouping?: boolean;
  tree?: boolean;
  editing?: boolean;
  rowMode?: boolean;
  batch?: boolean;
  rowMutations?: boolean;
  rowReorder?: boolean;
  rowPinning?: boolean;
  cellSpan?: boolean;
  extraRows?: boolean;
  rowStyle?: boolean;
  highlight?: boolean;
  failure?: Failure;
  onRecover?: () => void;
  customCard?: boolean;
  realtime?: boolean;
  columnGroups?: boolean;
  /** Hand the rows their id-derived fields, so a formula can read them. */
  derivedFields?: boolean;
  /** The formula columns the table renders, so the data hook can sort by them. */
  formulaColumns?: readonly ColumnDef<Person>[];
}>) {
  const advancedFilters = useAdvancedFilters();
  const scenario = useDemoScenario();
  // Demos mounted WITH editing (the /editing page) keep email visible — it
  // is the column the walkthrough edits. Column-groups drop Person, Email
  // and Load so the three groups plus Actions fit; Team stays visible as
  // Assignment's kept child. Only the shared live default is swapped;
  // explicit layouts (the wide showcase's pins, RTL) pass through.
  let resolvedDefaultLayout = defaultColumnLayout;
  if (defaultColumnLayout === LIVE_DEFAULT_LAYOUT) {
    if (editing) resolvedDefaultLayout = EDITING_DEFAULT_LAYOUT;
    else if (columnGroups) resolvedDefaultLayout = GROUPS_DEFAULT_LAYOUT;
    else if (cellSpan) resolvedDefaultLayout = SPAN_DEFAULT_LAYOUT;
    else {
      const scenarioLayout = layoutFor(scenario);
      if (scenarioLayout) resolvedDefaultLayout = scenarioLayout;
    }
  }
  const syncToUrl = demoUrlSync(urlKey);
  const { layout, onLayoutChange } = useColumnLayoutUrlState({
    urlKey,
    urlSync: syncToUrl,
    defaultColumnLayout: resolvedDefaultLayout,
  });
  const onColumnLayoutChange = useCallback(
    (next: ColumnLayoutState) =>
      onLayoutChange(revealHiddenOnPin(layout, next)),
    [layout, onLayoutChange]
  );
  const columns: DemoColumnProps = {
    columnLayout: layout,
    onColumnLayoutChange,
    collapsibleColumnGroups: columnGroups !== false,
    urlSync: syncToUrl,
  };

  return mode === "backend" ? (
    <Backend
      render={render}
      columns={columns}
      pageMode={pageMode}
      urlKey={urlKey}
      urlSync={syncToUrl}
      advancedFilters={advancedFilters}
    />
  ) : (
    // Keyed on the mode: the seed rows are state, so switching between the
    // thirty-row set and the generated directory has to start the hook over
    // rather than keep the list it already had.
    <Frontend
      key={mode}
      render={render}
      columns={columns}
      pageMode={pageMode}
      urlKey={urlKey}
      urlSync={syncToUrl}
      large={mode === "large"}
      grouping={grouping}
      editing={editing}
      tree={tree}
      rowMode={rowMode}
      batch={batch}
      rowMutations={rowMutations}
      rowReorder={rowReorder}
      rowPinning={rowPinning}
      cellSpan={cellSpan}
      extraRows={extraRows}
      rowStyle={rowStyle}
      highlight={highlight}
      failure={failure}
      onRecover={onRecover}
      customCard={customCard}
      realtime={realtime}
      advancedFilters={advancedFilters}
      derivedFields={derivedFields}
      formulaColumns={formulaColumns}
    />
  );
}

import {
  inject,
  type InjectionKey,
  onScopeDispose,
  provide,
  shallowRef,
  watch,
} from "vue";

import { makeOrders, type Order } from "./data";

export const WORKSPACE_SESSION_KEY = "adapttable-vue-order-workspace:v2";
export const REGIONS = ["Europe", "Americas", "Middle East"] as const;
export type Region = (typeof REGIONS)[number];
export type ExportScope = "page" | "range" | "all";
export interface DeskState {
  selected: readonly string[];
  scope: ExportScope;
  shown: boolean;
  panel: string | null;
  expanded: readonly string[];
}
export interface DispatchState {
  runs: readonly Region[];
  orders: Readonly<Record<Region, readonly string[]>>;
  selected: readonly string[];
  expanded: readonly string[];
}
interface WorkspaceSnapshot {
  version: 2;
  rows: readonly Order[];
  desk: DeskState;
  dispatch: DispatchState;
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isRegion = (value: unknown): value is Region =>
  value === "Europe" || value === "Americas" || value === "Middle East";
const isStatus = (value: unknown): value is Order["status"] =>
  value === "Review" || value === "Ready" || value === "Dispatched";
const idsFrom = (value: unknown, allowed: ReadonlySet<string>): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string => typeof id === "string" && allowed.has(id)
          )
        ),
      ]
    : [];
export const runId = (region: Region): string =>
  `run-${REGIONS.indexOf(region)}`;

/** The host plans only Ready orders. Review stays at the desk; Dispatched is complete. */
function reconcileDispatch(
  rows: readonly Order[],
  previous?: DispatchState
): DispatchState {
  const planned = (region: Region): readonly string[] => {
    const eligible = rows
      .filter((row) => row.region === region && row.status === "Ready")
      .map((row) => row.id);
    const kept = (previous?.orders[region] ?? []).filter((id) =>
      eligible.includes(id)
    );
    return [...kept, ...eligible.filter((id) => !kept.includes(id))];
  };
  const orders = {
    Europe: planned("Europe"),
    Americas: planned("Americas"),
    "Middle East": planned("Middle East"),
  };
  const allowed = new Set([
    ...Object.values(orders).flat(),
    ...REGIONS.map(runId),
  ]);
  return {
    runs: previous?.runs ?? [...REGIONS],
    orders,
    selected: (previous?.selected ?? []).filter((id) => allowed.has(id)),
    expanded: previous?.expanded ?? REGIONS.map(runId),
  };
}
function initial(): WorkspaceSnapshot {
  const rows = makeOrders();
  return {
    version: 2,
    rows,
    desk: {
      selected: [],
      scope: "page",
      shown: true,
      panel: null,
      expanded: [],
    },
    dispatch: reconcileDispatch(rows),
  };
}
/** Restore only authored values and known identities; never trust serialized table internals. */
function decode(value: unknown): WorkspaceSnapshot {
  const fallback = initial();
  if (!isRecord(value) || value.version !== 2) return fallback;
  const edits: unknown[] = Array.isArray(value.rows) ? value.rows : [];
  const rows = fallback.rows.map((row): Order => {
    const edit = edits.find(
      (candidate) => isRecord(candidate) && candidate.id === row.id
    );
    if (!isRecord(edit)) return row;
    return {
      ...row,
      owner:
        typeof edit.owner === "string" && edit.owner.trim().length >= 2
          ? edit.owner
          : row.owner,
      status: isStatus(edit.status) ? edit.status : row.status,
      amount:
        typeof edit.amount === "number" &&
        Number.isFinite(edit.amount) &&
        edit.amount >= 0
          ? edit.amount
          : row.amount,
      cost:
        typeof edit.cost === "number" &&
        Number.isFinite(edit.cost) &&
        edit.cost >= 0
          ? edit.cost
          : row.cost,
    };
  });
  const rowIds = new Set(rows.map((row) => row.id));
  const desk = isRecord(value.desk) ? value.desk : {};
  const savedDispatch = isRecord(value.dispatch) ? value.dispatch : {};
  const orderIds = isRecord(savedDispatch.orders) ? savedDispatch.orders : {};
  const savedRuns: unknown[] = Array.isArray(savedDispatch.runs)
    ? savedDispatch.runs
    : [];
  const runs = [...new Set(savedRuns.filter(isRegion))];
  const dispatch: DispatchState = {
    runs: [...runs, ...REGIONS.filter((region) => !runs.includes(region))],
    orders: {
      Europe: idsFrom(orderIds.Europe, rowIds),
      Americas: idsFrom(orderIds.Americas, rowIds),
      "Middle East": idsFrom(orderIds["Middle East"], rowIds),
    },
    selected: idsFrom(
      savedDispatch.selected,
      new Set([...rowIds, ...REGIONS.map(runId)])
    ),
    expanded: idsFrom(savedDispatch.expanded, new Set(REGIONS.map(runId))),
  };
  return {
    version: 2,
    rows,
    desk: {
      selected: idsFrom(desk.selected, rowIds),
      scope:
        desk.scope === "range" || desk.scope === "all" ? desk.scope : "page",
      shown: desk.shown !== false,
      panel:
        desk.panel === "guide" ||
        desk.panel === "scope" ||
        desk.panel === "views"
          ? desk.panel
          : null,
      expanded: idsFrom(desk.expanded, rowIds),
    },
    dispatch: reconcileDispatch(rows, dispatch),
  };
}
function restore(): WorkspaceSnapshot {
  try {
    const saved = window.sessionStorage.getItem(WORKSPACE_SESSION_KEY);
    return saved ? decode(JSON.parse(saved)) : initial();
  } catch {
    return initial();
  }
}
function createSession() {
  const state = shallowRef(restore());
  let initialViewDefaults = true;
  const intentEvents = [
    "pointerdown",
    "keydown",
    "click",
    "input",
    "change",
    "popstate",
  ] as const;
  const retireInitialViewDefaults = (): void => {
    initialViewDefaults = false;
    for (const event of intentEvents)
      window.removeEventListener(event, retireInitialViewDefaults, true);
  };
  for (const event of intentEvents)
    window.addEventListener(event, retireInitialViewDefaults, {
      once: true,
      capture: true,
    });
  onScopeDispose(retireInitialViewDefaults);
  const checkpoint = (): boolean => {
    try {
      window.sessionStorage.setItem(
        WORKSPACE_SESSION_KEY,
        JSON.stringify(state.value)
      );
      return true;
    } catch {
      return false;
    }
  };
  watch(state, checkpoint, { flush: "sync" });
  return {
    state,
    checkpoint,
    consumeInitialViewDefaults: (): boolean => {
      const available = initialViewDefaults;
      retireInitialViewDefaults();
      return available;
    },
    updateRows: (rows: readonly Order[]): void => {
      state.value = {
        ...state.value,
        rows,
        dispatch: reconcileDispatch(rows, state.value.dispatch),
      };
    },
    updateDesk: (change: Partial<DeskState>): void => {
      state.value = {
        ...state.value,
        desk: { ...state.value.desk, ...change },
      };
    },
    updateDispatch: (change: Partial<DispatchState>): void => {
      state.value = {
        ...state.value,
        dispatch: { ...state.value.dispatch, ...change },
      };
    },
    restoreRows: (): void => {
      const restored = initial();
      state.value = {
        ...state.value,
        rows: restored.rows,
        dispatch: restored.dispatch,
        desk: { ...state.value.desk, selected: [], expanded: [] },
      };
    },
  };
}
export type WorkspaceSession = ReturnType<typeof createSession>;
const SESSION: InjectionKey<WorkspaceSession> = Symbol(
  "order-workspace-session"
);
export function provideWorkspaceSession(): WorkspaceSession {
  const session = createSession();
  provide(SESSION, session);
  return session;
}
export function useWorkspaceSession(): WorkspaceSession {
  const session = inject(SESSION);
  if (!session) throw new Error("An order workspace session is required.");
  return session;
}

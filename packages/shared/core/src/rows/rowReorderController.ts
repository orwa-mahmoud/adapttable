/**
 * The row-reorder session: keyboard grab, pointer drag, and the host write.
 *
 * Drop legality comes from {@link resolveRowMove}. This module does not import
 * layout. A binding passes `isRtl` when horizontal arrows should follow the
 * grip's writing direction.
 */
import {
  type RowDropPosition,
  rowDropPosition,
  type RowMoveConfirmHandler,
  type RowMoveMenuModel,
  type RowMovePolicy,
  type RowMoveRequest,
  type RowMoveTarget,
} from "./rowMove";
import {
  datasetIndex,
  type RowReorderDecision,
  type RowReorderHandler,
  type RowReorderLabels,
  sameScopeDestination,
} from "./rowReorderPolicy";

/**
 * MIME type carrying the dragged row id during a reorder drag.
 *
 * @public
 */
export const ROW_DND_MIME = "application/x-adapttable-row";

/* ── The reorder controller ────────────────────────────────────────── */

/**
 * What a row-reorder controller is configured with.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface RowReorderControllerOptions<TRow> {
  /** A changed owner/source/view token retires every in-flight interaction. */
  readonly session?: unknown;
  /** Authoritative dataset index for flat rows. Nested decisions keep their sibling scope. */
  readonly getRowIndex?: (row: TRow) => number | undefined;
  /** Whether reordering is on; when false every gesture resets. */
  enabled: boolean;
  /** The host's write for a reorder. */
  onRowReorder?: RowReorderHandler<TRow>;
  /** Cross-boundary policy. Defaults to `"never"`. */
  movePolicy?: RowMovePolicy;
  /** Host-owned confirmation for a cross-boundary move. */
  confirmMove?: RowMoveConfirmHandler<TRow>;
  /** The host's write for a cross-boundary move. */
  onRowMove?: (request: RowMoveRequest<TRow>) => unknown;
  /** Keyboard/touch destinations for a row, when nested. */
  getMoveMenu?: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  /** Resolve a drop inside grouped or tree rows. */
  resolveMove?: (
    row: TRow,
    target: TRow,
    position: RowDropPosition
  ) => RowReorderDecision<TRow> | undefined;
  /**
   * The labels the engine speaks. The other three on
   * {@link RowReorderLabels} name the grip and its mobile buttons, which the
   * adapter draws from the table's own labels.
   */
  labels: Pick<
    RowReorderLabels,
    "rowLifted" | "rowMoved" | "rowReorderCancelled"
  > &
    Partial<
      Pick<
        RowReorderLabels,
        "rowMovedToGroup" | "rowMovedUnder" | "moveRejectedPolicyNever"
      >
    >;
  /** Look up a row in the current source by its rendered index. */
  rowAt: (localIndex: number) => TRow | undefined;
  /** Stable identity used to attach confirmation to its rendered row. */
  getRowId?: (row: TRow) => string;
  /**
   * Whether the grip's inline direction is right to left. Bindings pass the
   * layout reader. Omitted, horizontal arrows move as in left to right.
   */
  isRtl?: (element: HTMLElement | null) => boolean;
}

/**
 * The reorder state at one moment.
 *
 * @public
 */
export interface RowReorderSnapshot<TRow> {
  /** The lifted row, or `null` when idle. */
  readonly lifted: { readonly rowId: string; readonly from: number } | null;
  /** Hovered drop index (local), or `null`. */
  readonly overIndex: number | null;
  /** Hovered edge, including the middle tree re-parent target. */
  readonly overPosition: RowDropPosition | null;
  /** Move awaiting kit-owned confirmation, or `null`. */
  readonly pendingMove: RowMoveRequest<TRow> | null;
  /** Host-owned `confirmMove` is awaiting a decision. */
  readonly hostConfirmPending: boolean;
  /** Live-region text. Empty until something happens. */
  readonly announcement: string;
}

/**
 * The parts of a drag event the engine reads — a DOM `DragEvent` fits.
 *
 * @public
 */
export interface RowDragEvent {
  /** The drag's data store. */
  readonly dataTransfer: Pick<
    DataTransfer,
    "setData" | "getData" | "effectAllowed" | "dropEffect"
  >;
  /** The pointer's vertical position. */
  readonly clientY: number;
  /** The row element the handler is attached to. */
  readonly currentTarget: {
    getBoundingClientRect?: () => Pick<DOMRect, "top" | "height">;
  } | null;
  /** Keep the browser's own handling of the event. */
  preventDefault: () => void;
}

/**
 * A key press on a row's grip.
 *
 * @public
 */
export interface RowKeyEvent {
  /** The key. */
  readonly key: string;
  /** The grip element, for its writing direction. */
  readonly currentTarget: HTMLElement | null;
  /** Keep the browser's own handling of the key. */
  preventDefault: () => void;
}

/**
 * One row's position in the rendered window, for a gesture on it.
 *
 * @public
 */
export interface RowReorderSlot<TRow> {
  /** The row's stable id. */
  readonly rowId: string;
  /** The row's index in the rendered window. */
  readonly localIndex: number;
  /** The row. */
  readonly row: TRow;
  /** Where the rendered window starts in the dataset. */
  readonly windowStart: number;
  /** Rows in the rendered window. */
  readonly rowCount: number;
}

/**
 * Row-reordering callbacks captured for one interaction session.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export type RowReorderActions<TRow> = Pick<
  RowReorderController<TRow>,
  | "dragStart"
  | "dragEnd"
  | "dragOver"
  | "drop"
  | "keyDown"
  | "moveBy"
  | "moveMenu"
  | "selectMoveTarget"
  | "confirmMove"
  | "cancelMove"
>;

/**
 * Row reordering for one table.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export interface RowReorderController<TRow> {
  /** Event callbacks bound to this owner session and pending decision. */
  readonly forSession: () => RowReorderActions<TRow>;
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => RowReorderSnapshot<TRow>;
  /**
   * The state the table itself draws from: the full state without the
   * hovered index and edge, a new object only when anything else changes.
   * Rows follow the hover through `getSnapshot`. Pair it with `subscribe`.
   */
  readonly getTableSnapshot: () => RowReorderSnapshot<TRow>;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: RowReorderControllerOptions<TRow>) => void;
  /**
   * Mark the table mounted. Returns the teardown, after which a host
   * confirmation still in flight settles into nothing.
   */
  readonly connect: () => () => void;
  /** A drag started from a row's grip. */
  readonly dragStart: (
    event: RowDragEvent,
    rowId: string,
    localIndex: number
  ) => void;
  /** A drag ended, dropped or not. */
  readonly dragEnd: () => void;
  /** A drag moved over a row. */
  readonly dragOver: (event: RowDragEvent, localIndex: number) => void;
  /** A drag dropped on a row. */
  readonly drop: (
    event: RowDragEvent,
    localIndex: number,
    row: TRow,
    windowStart: number
  ) => void;
  /** Keyboard: Space lifts / drops, arrows move, Escape cancels. */
  readonly keyDown: (event: RowKeyEvent, slot: RowReorderSlot<TRow>) => void;
  /** Mobile: swap with the neighbour. */
  readonly moveBy: (
    localIndex: number,
    delta: -1 | 1,
    row: TRow,
    windowStart: number,
    rowCount: number
  ) => void;
  /** Keyboard/touch destinations for this row, when nested. */
  readonly moveMenu: (row: TRow) => RowMoveMenuModel<TRow> | undefined;
  /** Select a destination from the move menu. */
  readonly selectMoveTarget: (target: RowMoveTarget<TRow>) => void;
  /** Confirm the move shown by the kit confirmation surface. */
  readonly confirmMove: () => void;
  /** Cancel the move shown by the kit confirmation surface. */
  readonly cancelMove: () => void;
}

const IDLE = {
  lifted: null,
  overIndex: null,
  overPosition: null,
  pendingMove: null,
  hostConfirmPending: false,
  announcement: "",
} as const;

function isGrabKey(key: string): boolean {
  return key === " " || key === "Spacebar";
}

function arrowDelta(key: string, rtl: boolean): -1 | 0 | 1 {
  if (key === "ArrowDown" || key === (rtl ? "ArrowLeft" : "ArrowRight")) {
    return 1;
  }
  if (key === "ArrowUp" || key === (rtl ? "ArrowRight" : "ArrowLeft")) {
    return -1;
  }
  return 0;
}

/**
 * Create the row-reorder controller for one table.
 *
 * @typeParam TRow - The row type.
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createRowReorderController<TRow>(
  initial: RowReorderControllerOptions<TRow>
): RowReorderController<TRow> {
  let options = initial;
  let snapshot: RowReorderSnapshot<TRow> = IDLE;
  let tableSnapshot: RowReorderSnapshot<TRow> = IDLE;
  let mounted = true;
  let nextConfirmToken = 0;
  let activeConfirmToken = 0;
  let epoch = 0;
  const menuEpochs = new WeakMap<RowMoveTarget<TRow>, number>();
  let batchDepth = 0;
  let changed = false;
  const listeners = new Set<() => void>();

  /** The table's view: everything but the hover, replaced only when it moves. */
  const syncTable = (force: boolean): void => {
    if (
      force ||
      snapshot.lifted !== tableSnapshot.lifted ||
      snapshot.pendingMove !== tableSnapshot.pendingMove ||
      snapshot.hostConfirmPending !== tableSnapshot.hostConfirmPending ||
      snapshot.announcement !== tableSnapshot.announcement
    ) {
      tableSnapshot = { ...snapshot, overIndex: null, overPosition: null };
    }
  };

  const flush = (): void => {
    if (batchDepth > 0 || !changed) return;
    changed = false;
    for (const listener of listeners) listener();
  };

  const write = (patch: Partial<RowReorderSnapshot<TRow>>): void => {
    const next = { ...snapshot, ...patch };
    const keys = Object.keys(next) as (keyof RowReorderSnapshot<TRow>)[];
    if (keys.every((key) => next[key] === snapshot[key])) return;
    snapshot = next;
    syncTable(false);
    changed = true;
    flush();
  };

  /** Run several writes as one change, so listeners hear the end state. */
  const batch = (run: () => void): void => {
    batchDepth += 1;
    try {
      run();
    } finally {
      batchDepth -= 1;
      flush();
    }
  };

  const say = (announcement: string): void => {
    write({ announcement });
  };

  const isLocked = (): boolean =>
    activeConfirmToken !== 0 || snapshot.pendingMove !== null;

  const reset = (): void => {
    write({ lifted: null, overIndex: null, overPosition: null });
  };

  const live = (): boolean => mounted && options.enabled;
  const invalidate = (): void => {
    epoch += 1;
    activeConfirmToken = 0;
    batch(() => {
      write({ pendingMove: null, hostConfirmPending: false, announcement: "" });
      reset();
      snapshot = { ...snapshot };
      syncTable(true);
      changed = true;
    });
  };
  const ownsRows = (): boolean =>
    options.session !== undefined || options.getRowIndex !== undefined;
  const sameRow = (expected: TRow, actual: TRow): boolean =>
    options.getRowId
      ? options.getRowId(expected) === options.getRowId(actual)
      : expected === actual;

  const currentRowMatches = (
    expected: TRow,
    current: TRow | undefined
  ): current is TRow =>
    current !== undefined && (!ownsRows() || sameRow(expected, current));

  const announceMove = (request: RowMoveRequest<TRow>): void => {
    const { labels } = options;
    say(
      request.kind === "group"
        ? (labels.rowMovedToGroup?.(request.toGroup.label) ??
            `Row moved to ${request.toGroup.label}`)
        : (labels.rowMovedUnder?.(request.toParent.label) ??
            `Row moved under ${request.toParent.label}`)
    );
  };

  const executeMove = (request: RowMoveRequest<TRow>): void => {
    if (!live()) return;
    const currentEpoch = epoch;
    options.onRowMove?.(request);
    if (!live()) return;
    if (currentEpoch !== epoch) {
      if (!isLocked() && !snapshot.lifted) announceMove(request);
      return;
    }
    batch(() => {
      announceMove(request);
      write({ pendingMove: null });
      reset();
    });
  };

  const settleHostConfirm = (
    token: number,
    request: RowMoveRequest<TRow>,
    approved: boolean
  ): void => {
    if (!live() || activeConfirmToken !== token) return;
    activeConfirmToken = 0;
    batch(() => {
      write({ hostConfirmPending: false });
      if (approved) executeMove(request);
      else {
        say(options.labels.rowReorderCancelled);
        reset();
      }
    });
  };

  const askHost = async (
    confirm: RowMoveConfirmHandler<TRow>,
    request: RowMoveRequest<TRow>
  ): Promise<void> => {
    const token = ++nextConfirmToken;
    activeConfirmToken = token;
    batch(() => {
      write({ hostConfirmPending: true });
      reset();
    });
    let approved = false;
    try {
      approved = (await confirm(request)) ?? false;
    } catch {
      // A confirmation that throws is a confirmation that did not approve.
      approved = false;
    }
    settleHostConfirm(token, request, approved);
  };

  const requestMove = (request: RowMoveRequest<TRow>): void => {
    if (!live() || isLocked()) return;
    const policy = options.movePolicy ?? "never";
    if (policy === "never") {
      batch(() => {
        say(
          options.labels.moveRejectedPolicyNever ??
            "Cross-boundary row moves are disabled"
        );
        reset();
      });
      return;
    }
    if (policy === "auto") {
      executeMove(request);
      return;
    }
    if (options.confirmMove) {
      void askHost(options.confirmMove, request);
      return;
    }
    batch(() => {
      write({ pendingMove: request });
      reset();
    });
  };

  const reorder = (from: number, to: number, row: TRow): void => {
    if (!live()) return;
    const currentEpoch = epoch;
    options.onRowReorder?.(from, to, row);
    if (!live()) return;
    if (currentEpoch !== epoch) {
      if (!isLocked() && !snapshot.lifted)
        say(options.labels.rowMoved(from + 1, to + 1));
      return;
    }
    batch(() => {
      say(options.labels.rowMoved(from + 1, to + 1));
      reset();
    });
  };

  const commit = (
    fromLocal: number,
    toLocal: number,
    row: TRow,
    target: TRow,
    windowStart: number,
    position: RowDropPosition
  ): void => {
    if (!live()) {
      reset();
      return;
    }
    if (isLocked()) return;
    const currentRow = options.rowAt(fromLocal);
    const currentTarget = options.rowAt(toLocal);
    if (
      !currentRowMatches(row, currentRow) ||
      !currentRowMatches(target, currentTarget)
    ) {
      reset();
      return;
    }
    // Legacy bindings can publish rows before they publish row identity.
    // An owned session or source-index mapping opts into current-row identity.
    if (ownsRows()) {
      row = currentRow;
      target = currentTarget;
    }
    const decision = options.resolveMove?.(row, target, position);
    if (decision?.kind === "reject") {
      batch(() => {
        say(decision.message);
        reset();
      });
      return;
    }
    if (decision?.kind === "move") {
      requestMove(decision.request);
      return;
    }
    if (decision?.kind === "reorder") {
      if (decision.from === decision.to) {
        reset();
        return;
      }
      reorder(decision.from, decision.to, decision.row);
      return;
    }
    if (fromLocal === toLocal) {
      reset();
      return;
    }
    if (options.getRowIndex) {
      const from = options.getRowIndex(row);
      const targetIndex = options.getRowIndex(target);
      if (from === undefined || targetIndex === undefined) {
        reset();
        return;
      }
      const to = sameScopeDestination(from, targetIndex, position);
      if (from === to) {
        reset();
        return;
      }
      reorder(from, to, row);
      return;
    }
    reorder(
      datasetIndex(fromLocal, windowStart),
      datasetIndex(toLocal, windowStart),
      row
    );
  };

  const lift = (rowId: string, localIndex: number): void => {
    write({
      lifted: { rowId, from: localIndex },
      overIndex: localIndex,
      overPosition: "before",
    });
  };

  const keyDown = (event: RowKeyEvent, slot: RowReorderSlot<TRow>): void => {
    if (!live()) return;
    if (isLocked() && event.key !== "Escape") return;
    const { lifted, overIndex } = snapshot;
    const { rowId, localIndex, row, windowStart, rowCount } = slot;
    if (event.key === "Escape" && lifted) {
      event.preventDefault();
      batch(() => {
        say(options.labels.rowReorderCancelled);
        reset();
      });
      return;
    }
    if (isGrabKey(event.key)) {
      event.preventDefault();
      if (lifted?.rowId === rowId) {
        const to = overIndex ?? lifted.from;
        const target = options.rowAt(to) ?? row;
        commit(
          lifted.from,
          to,
          row,
          target,
          windowStart,
          to > lifted.from ? "after" : "before"
        );
        return;
      }
      batch(() => {
        lift(rowId, localIndex);
        say(
          options.labels.rowLifted(datasetIndex(localIndex, windowStart) + 1)
        );
      });
      return;
    }
    if (lifted?.rowId !== rowId) return;
    const delta = arrowDelta(
      event.key,
      options.isRtl?.(event.currentTarget) ?? false
    );
    if (delta === 0) return;
    event.preventDefault();
    const next = Math.min(
      rowCount - 1,
      Math.max(0, (overIndex ?? lifted.from) + delta)
    );
    write({
      overIndex: next,
      overPosition: next > lifted.from ? "after" : "before",
    });
  };

  const controller: RowReorderController<TRow> = {
    forSession() {
      const ownedEpoch = epoch;
      const pending = snapshot.pendingMove;
      const guard =
        <TArgs extends readonly unknown[]>(run: (...args: TArgs) => void) =>
        (...args: TArgs): void => {
          if (live() && epoch === ownedEpoch) run(...args);
        };
      return {
        dragStart: guard(controller.dragStart),
        dragEnd: guard(controller.dragEnd),
        dragOver: guard(controller.dragOver),
        drop: guard(controller.drop),
        keyDown: guard(controller.keyDown),
        moveBy: guard(controller.moveBy),
        selectMoveTarget: guard(controller.selectMoveTarget),
        moveMenu: (row) =>
          live() && epoch === ownedEpoch ? controller.moveMenu(row) : undefined,
        confirmMove: guard(() => {
          if (pending !== null && snapshot.pendingMove === pending)
            controller.confirmMove();
        }),
        cancelMove: guard(() => {
          if (pending !== null && snapshot.pendingMove === pending)
            controller.cancelMove();
        }),
      };
    },
    getSnapshot: () => snapshot,
    getTableSnapshot: () => tableSnapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      const changedSession = !Object.is(options.session, next.session);
      options = next;
      if (changedSession || !next.enabled) invalidate();
    },
    connect() {
      mounted = true;
      return () => {
        mounted = false;
        invalidate();
      };
    },
    dragStart(event, rowId, localIndex) {
      if (!live() || isLocked()) {
        event.preventDefault();
        return;
      }
      const current = options.rowAt(localIndex);
      if (
        current === undefined ||
        (ownsRows() && options.getRowId && options.getRowId(current) !== rowId)
      ) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData(
        ROW_DND_MIME,
        `${rowId}:${String(localIndex)}`
      );
      event.dataTransfer.effectAllowed = "move";
      lift(rowId, localIndex);
    },
    dragEnd: reset,
    dragOver(event, localIndex) {
      // Custom MIME types are often missing from `types` during dragover; the
      // lift flag is the reliable same-table signal.
      if (!live() || snapshot.lifted === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const bounds = event.currentTarget?.getBoundingClientRect?.();
      write({
        overIndex: localIndex,
        overPosition: bounds ? rowDropPosition(event.clientY, bounds) : "after",
      });
    },
    drop(event, localIndex, row, windowStart) {
      if (!live()) return;
      const payload = event.dataTransfer.getData(ROW_DND_MIME);
      if (payload === "") return;
      const lifted = snapshot.lifted;
      if (!lifted || payload !== `${lifted.rowId}:${String(lifted.from)}`)
        return;
      const dragged = options.rowAt(lifted.from);
      if (
        dragged === undefined ||
        (ownsRows() &&
          options.getRowId &&
          options.getRowId(dragged) !== lifted.rowId)
      ) {
        reset();
        return;
      }
      event.preventDefault();
      const bounds = event.currentTarget?.getBoundingClientRect?.();
      const fallbackPosition =
        snapshot.overPosition ??
        (localIndex > lifted.from ? "after" : "before");
      const position = bounds
        ? rowDropPosition(event.clientY, bounds)
        : fallbackPosition;
      commit(lifted.from, localIndex, dragged, row, windowStart, position);
    },
    keyDown,
    moveBy(localIndex, delta, row, windowStart, rowCount) {
      const to = localIndex + delta;
      if (to < 0 || to >= rowCount) return;
      if (isLocked()) return;
      commit(
        localIndex,
        to,
        row,
        options.rowAt(to) ?? row,
        windowStart,
        delta > 0 ? "after" : "before"
      );
    },
    moveMenu: (row) => {
      if (!live()) return undefined;
      const menu = options.getMoveMenu?.(row);
      for (const target of menu?.targets ?? []) menuEpochs.set(target, epoch);
      return menu;
    },
    selectMoveTarget(target) {
      if (
        !live() ||
        (menuEpochs.has(target) && menuEpochs.get(target) !== epoch) ||
        (options.session !== undefined && !menuEpochs.has(target))
      )
        return;
      if (target.disabledReason) {
        say(target.disabledReason);
        return;
      }
      if (target.request) requestMove(target.request);
    },
    confirmMove() {
      if (!live()) return;
      const { pendingMove } = snapshot;
      if (pendingMove) executeMove(pendingMove);
    },
    cancelMove() {
      if (!live()) return;
      batch(() => {
        write({ pendingMove: null });
        say(options.labels.rowReorderCancelled);
      });
    },
  };
  return controller;
}

/**
 * Whether a row owns the pending move confirmation — by id when the table has
 * row identity, by reference otherwise.
 *
 * @param pendingMove - The move awaiting confirmation.
 * @param row - The row to ask about.
 * @param getRowId - Stable row identity, when there is one.
 * @returns Whether the confirmation belongs to this row.
 *
 * @public
 */
export function isRowMovePending<TRow>(
  pendingMove: RowMoveRequest<TRow> | null,
  row: TRow,
  getRowId?: (row: TRow) => string
): boolean {
  if (!pendingMove) return false;
  if (!getRowId) return pendingMove.row === row;
  return getRowId(pendingMove.row) === getRowId(row);
}

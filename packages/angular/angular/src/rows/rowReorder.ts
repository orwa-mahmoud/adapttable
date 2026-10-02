/**
 * Row reordering for Angular: core's grab / drag / keyboard model, published
 * as a signal so the grip and drop targets stay in sync with the table.
 */
import {
  createRowReorderController,
  isRowMovePending,
  type RowDragEvent,
  type RowKeyEvent,
  rowReorderRowAttributes,
  rowReorderRuntimeOptions,
  type TableSource,
} from "@adapttable/core";
import { type RowReorderState as NeutralRowReorderState } from "@adapttable/core/binding";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import type { DataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";
import type { RowReorderFeature } from "../features/rowReorder";
import { type RuntimeGrouping, tableRuntimeFor } from "../layout/tableRuntime";
import { fromStore } from "../store";

/**
 * Headless reorder state — core's contract with Angular's drag and key events.
 *
 * @public
 */
export type RowReorderState<TRow> = NeutralRowReorderState<
  TRow,
  DragEvent,
  KeyboardEvent
>;

/**
 * Options for {@link injectRowReorder}.
 *
 * @public
 */
export interface RowReorderStateOptions<TRow> {
  /** The headless table. */
  readonly table: DataTable<TRow>;
  /** The live source the controller reads rows from. */
  readonly source: Signal<TableSource<TRow>>;
  /** The composed features; the reorder seeds from the one with id `row-reorder`. */
  readonly features: readonly AdaptTableFeature[];
  /** The grouped entries, when the table groups its rows. */
  readonly grouping?: Signal<RuntimeGrouping<TRow> | undefined>;
  /** The injector to run effects in. */
  readonly injector?: Injector;
}

function rowReorderFeatureOf<TRow>(
  features: readonly AdaptTableFeature[]
): RowReorderFeature<TRow> | undefined {
  return features.find(
    (feature): feature is RowReorderFeature<TRow> =>
      feature.id === "row-reorder"
  );
}

/**
 * Map a DOM drag event to core's drag shape. A null `dataTransfer` (some
 * browsers during cancelled gestures) yields `undefined` so the controller
 * is never handed a lie.
 */
function toRowDrag(event: DragEvent): RowDragEvent | undefined {
  const { dataTransfer } = event;
  if (!dataTransfer) return undefined;
  return {
    dataTransfer,
    clientY: event.clientY,
    currentTarget: event.currentTarget as RowDragEvent["currentTarget"],
    preventDefault: () => {
      event.preventDefault();
    },
  };
}

/** Map a DOM key event to core's key shape. */
function toRowKey(event: KeyboardEvent): RowKeyEvent {
  return {
    key: event.key,
    currentTarget:
      event.currentTarget instanceof HTMLElement ? event.currentTarget : null,
    preventDefault: () => {
      event.preventDefault();
    },
  };
}

/**
 * The live reorder state when {@link rowReorder} is composed. Absent
 * otherwise — the grip draws nothing.
 *
 * @param options - See {@link RowReorderStateOptions}.
 * @returns The state as a signal, or `undefined` when the feature is off.
 *
 * @public
 */
export function injectRowReorder<TRow>(
  options: RowReorderStateOptions<TRow>
): Signal<RowReorderState<TRow>> | undefined {
  const feature = rowReorderFeatureOf<TRow>(options.features);
  if (!feature) return undefined;
  if (!options.injector) assertInInjectionContext(injectRowReorder);
  const injector = options.injector ?? inject(Injector);
  const destroyRef = injector.get(DestroyRef);
  const runtime = tableRuntimeFor(
    options.table,
    options.source,
    options.features,
    options.grouping
  );
  const controllerOptions = () =>
    rowReorderRuntimeOptions(runtime, feature.onRowReorder, feature.options);
  const controller = createRowReorderController<TRow>(controllerOptions());
  effect(
    () => {
      controller.configure(controllerOptions());
    },
    { injector }
  );
  destroyRef.onDestroy(controller.connect());

  const snapshot = fromStore(controller, { injector });
  return computed((): RowReorderState<TRow> => {
    const {
      lifted,
      overIndex,
      overPosition,
      pendingMove,
      hostConfirmPending,
      announcement,
    } = snapshot();
    return {
      lifted,
      overIndex,
      overPosition,
      pendingMove,
      hostConfirmPending,
      announcement,
      isLifted: (rowId) => lifted?.rowId === rowId,
      isMovePending: (row) =>
        isRowMovePending(
          pendingMove,
          row,
          (entry) => runtime.view()?.getRowId(entry) ?? ""
        ),
      dragProps: (rowId, localIndex) => ({
        draggable: true,
        onDragStart: (event) => {
          const drag = toRowDrag(event);
          if (!drag) {
            event.preventDefault();
            return;
          }
          controller.dragStart(drag, rowId, localIndex);
        },
        onDragEnd: () => {
          controller.dragEnd();
        },
      }),
      dropProps: (localIndex, row, windowStart) => ({
        onDragOver: (event) => {
          const drag = toRowDrag(event);
          if (!drag) return;
          controller.dragOver(drag, localIndex);
        },
        onDrop: (event) => {
          const drag = toRowDrag(event);
          if (!drag) return;
          controller.drop(drag, localIndex, row, windowStart);
        },
      }),
      handleKeyDown: (event, rowId, localIndex, row, windowStart, rowCount) => {
        controller.keyDown(toRowKey(event), {
          rowId,
          localIndex,
          row,
          windowStart,
          rowCount,
        });
      },
      moveBy: controller.moveBy,
      moveMenu: controller.moveMenu,
      selectMoveTarget: controller.selectMoveTarget,
      confirmMove: controller.confirmMove,
      cancelMove: controller.cancelMove,
      rowAttrs: (rowId, localIndex) =>
        rowReorderRowAttributes(
          { lifted, overIndex, overPosition },
          rowId,
          localIndex
        ),
    };
  });
}

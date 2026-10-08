import { rowReorderControlKey, rowReorderModelKey } from "./contracts";
export { rowReorderControlKey, rowReorderModelKey } from "./contracts";
/** Vue resource ownership and controls over core's one reorder controller. */
import {
  createRowReorderController,
  isRowMovePending,
  type RowDragEvent,
  type RowKeyEvent,
  type RowReorderActions,
  type RowReorderControllerOptions,
  type RowReorderHandler,
  type RowReorderOptions,
  rowReorderRowAttributes,
  rowReorderRuntimeOptions,
  type RowReorderSlot,
  type RowReorderSnapshot,
  stableKey,
  type TableLabels,
  type TableSource,
} from "@adapttable/core";
import {
  type RowMoveMenuSlotProps,
  type RowReorderHandleSlotProps,
  type RowReorderMoveButtonProps,
} from "@adapttable/core/binding";
import type { TableFeature } from "@adapttable/vue";
import {
  computed,
  h,
  type MaybeRefOrGetter,
  onScopeDispose,
  toValue,
  type VNodeChild,
  watch,
} from "vue";

import type { Attrs } from "../attrs";
import { projectHeadlessRows } from "../rows/headlessRowsModel";
import { useExternalStore, useScopeActivity } from "../store";
export type {
  RowDragEvent,
  RowKeyEvent,
  RowReorderHandler,
  RowReorderOptions,
  RowReorderSlot,
  RowReorderSnapshot,
} from "@adapttable/core";
export interface VueRowReorderModel<TRow> {
  readonly snapshot: RowReorderSnapshot<TRow>;
  readonly controller: RowReorderActions<TRow>;
  readonly enabled: boolean;
  /** Read-only destination projection, including disabled server controls. */
  readonly moveMenu?: RowReorderActions<TRow>["moveMenu"];
  readonly rowAttrs: (
    rowId: string,
    index: number,
    row: TRow,
    windowStart: number
  ) => Attrs;
  readonly ownsPending: (row: TRow) => boolean;
}
function dragEvent(event: DragEvent): RowDragEvent | undefined {
  if (!event.dataTransfer) return undefined;
  return {
    dataTransfer: event.dataTransfer,
    clientY: event.clientY,
    currentTarget:
      event.currentTarget instanceof Element ? event.currentTarget : null,
    preventDefault: () => event.preventDefault(),
  };
}
function sameRowSequence<TRow>(
  previous: readonly TRow[] | undefined,
  next: readonly TRow[] | undefined
): boolean {
  return (
    previous === next ||
    (next !== undefined &&
      previous?.length === next.length &&
      previous.every((row, index) => Object.is(row, next[index])))
  );
}
function sameSourceView<TRow>(
  previous: TableSource<TRow>,
  next: TableSource<TRow>
): boolean {
  if (previous === next) return true;
  const {
    rows: previousRows,
    allFilteredRows: previousFiltered,
    allSearchedRows: previousSearched,
    extra: previousExtra,
    ...previousState
  } = previous;
  const {
    rows: nextRows,
    allFilteredRows: nextFiltered,
    allSearchedRows: nextSearched,
    extra: nextExtra,
    ...nextState
  } = next;
  const keys = Object.keys(previousState) as (keyof typeof previousState)[];
  return (
    sameRowSequence(previousRows, nextRows) &&
    sameRowSequence(previousFiltered, nextFiltered) &&
    sameRowSequence(previousSearched, nextSearched) &&
    stableKey(previousExtra) === stableKey(nextExtra) &&
    keys.length === Object.keys(nextState).length &&
    keys.every((key) => Object.is(previousState[key], nextState[key]))
  );
}
export function useRowReorder<TRow>(
  input: MaybeRefOrGetter<RowReorderControllerOptions<TRow>>
) {
  const options = computed(() => toValue(input));
  const active = useScopeActivity();
  const configuration = computed(() => ({
    ...options.value,
    enabled: active.value && options.value.enabled,
  }));
  const controller = createRowReorderController(configuration.value);
  const snapshot = useExternalStore(controller, { active });
  let projectionRevision = 0;
  let disposed = false;
  watch(
    configuration,
    (next) => {
      projectionRevision++;
      controller.configure(next);
    },
    {
      flush: "sync",
    }
  );
  watch(
    active,
    (enabled, _previous, cleanup) => {
      if (enabled) cleanup(controller.connect());
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(() => {
    disposed = true;
    projectionRevision++;
    controller.configure({ ...options.value, enabled: false });
  });
  return computed((): VueRowReorderModel<TRow> => {
    const enabled = active.value && options.value.enabled;
    const current = snapshot.value;
    const actions = controller.forSession();
    const source = options.value;
    const revision = projectionRevision;
    return {
      controller: actions,
      snapshot: current,
      enabled,
      moveMenu: (row) => {
        if (disposed || revision !== projectionRevision) return undefined;
        // Read the existing neutral projection for SSR. Mutating callbacks
        // still come only from the controller's active, owned session.
        return enabled ? actions.moveMenu(row) : source.getMoveMenu?.(row);
      },
      ownsPending: (row) =>
        isRowMovePending(current.pendingMove, row, options.value.getRowId),
      rowAttrs: (id, index, row, windowStart) => ({
        ...rowReorderRowAttributes(current, id, index),
        onDragover: (event: DragEvent) => {
          const value = dragEvent(event);
          if (value) actions.dragOver(value, index);
        },
        onDrop: (event: DragEvent) => {
          const value = dragEvent(event);
          if (value) actions.drop(value, index, row, windowStart);
        },
      }),
    };
  });
}
export interface RowReorderControlProps<TRow> extends RowReorderSlot<TRow> {
  readonly model: VueRowReorderModel<TRow>;
  readonly labels: Required<TableLabels>;
  readonly mobile: boolean;
  readonly classNames?: Readonly<Record<string, string | undefined>>;
}
export interface RowReorderControlSlots {
  readonly Handle: (
    props: RowReorderHandleSlotProps<RowKeyEvent, RowDragEvent>
  ) => VNodeChild;
  readonly Button: (props: RowReorderMoveButtonProps) => VNodeChild;
  readonly Menu: (props: RowMoveMenuSlotProps) => VNodeChild;
}
export function RowReorderChrome<TRow>(
  props: RowReorderControlProps<TRow> & {
    readonly slots: RowReorderControlSlots;
  }
): VNodeChild {
  const {
    model,
    labels,
    slots,
    row,
    localIndex,
    windowStart,
    rowCount,
    rowId,
  } = props;
  for (const key of ["Handle", "Button", "Menu"] as const)
    if (typeof slots[key] !== "function")
      throw new Error(
        `AdaptTable: required reorder control slot "${key}" is missing.`
      );
  const { controller, snapshot } = model;
  const locked =
    !model.enabled ||
    snapshot.hostConfirmPending ||
    snapshot.pendingMove !== null;
  const menu = model.moveMenu ? model.moveMenu(row) : controller.moveMenu(row);
  const pending = model.ownsPending(row) ? snapshot.pendingMove : null;
  const from =
    pending?.kind === "group"
      ? pending.fromGroup.label
      : pending?.fromParent.label;
  const to =
    pending?.kind === "group" ? pending.toGroup.label : pending?.toParent.label;
  const menuNode = menu
    ? slots.Menu({
        label: menu.label,
        items: menu.targets.map((target) => ({
          id: target.id,
          label: target.label,
          disabled: locked || target.disabledReason !== undefined,
          disabledReason: target.disabledReason,
          onSelect: () => controller.selectMoveTarget(target),
        })),
        confirmation:
          pending && from && to
            ? {
                title: labels.confirmRowMoveTitle,
                description: labels.confirmRowMoveDescription(
                  pending.rowLabel,
                  from,
                  to
                ),
                confirmLabel: labels.confirmRowMove,
                cancelLabel: labels.cancel,
                onConfirm: controller.confirmMove,
                onCancel: controller.cancelMove,
              }
            : undefined,
      })
    : null;
  const controls = props.mobile
    ? [-1, 1].map((delta) =>
        slots.Button({
          label: delta < 0 ? labels.moveRowUp : labels.moveRowDown,
          part: delta < 0 ? "row-reorder-up" : "row-reorder-down",
          className:
            delta < 0
              ? props.classNames?.rowReorderUp
              : props.classNames?.rowReorderDown,
          disabled:
            locked ||
            (delta < 0 ? localIndex <= 0 : localIndex >= rowCount - 1),
          onClick: () =>
            controller.moveBy(
              localIndex,
              delta < 0 ? -1 : 1,
              row,
              windowStart,
              rowCount
            ),
        })
      )
    : [
        slots.Handle({
          label: labels.reorderRow,
          className: props.classNames?.rowReorderHandle,
          pressed: snapshot.lifted?.rowId === rowId,
          dragging: snapshot.lifted?.rowId === rowId,
          disabled: locked,
          dragProps: {
            draggable: true,
            onDragStart: (event) =>
              controller.dragStart(event, rowId, localIndex),
            onDragEnd: controller.dragEnd,
          },
          onKeyDown: (event) => controller.keyDown(event, props),
        }),
      ];
  return h(
    "span",
    {
      class: props.mobile ? props.classNames?.rowReorderButtons : undefined,
      "data-adapttable-part": props.mobile ? "row-reorder-buttons" : undefined,
    },
    [...controls, menuNode]
  );
}
export function rowReorder<TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
): TableFeature<TRow> {
  return {
    id: "row-reorder",
    requiredSlots: [rowReorderControlKey<never>()],
    apply: () => ({ bodyModel: projectHeadlessRows }),
    mount: (context) => {
      let previousOrder: ReadonlyMap<string, number> | undefined;
      const hostOrder = computed(() => {
        const previous = previousOrder;
        const supplied = toValue(context.options.value.source);
        const rows = supplied
          ? context.source.value.rows
          : (toValue(context.options.value.data) ?? context.source.value.rows);
        const offset = supplied ? context.table.windowStart.value : 0;
        const next = new Map(
          rows.map((row, index) => [context.table.rowKey(row), index + offset])
        );
        const current =
          previous?.size === next.size &&
          [...next].every(([key, index]) => previous.get(key) === index)
            ? previous
            : next;
        previousOrder = current;
        return current;
      });
      const readSession = () => {
        const inputSource = toValue(context.options.value.source);
        return {
          inputSource,
          inputData: inputSource
            ? undefined
            : toValue(context.options.value.data),
          columns: toValue(context.options.value.columns),
          source: context.source.value,
          visibleRows: context.rowInventory?.value.visibleRows,
          hostOrder: hostOrder.value,
          active: context.active.value,
        };
      };
      let previousSession: ReturnType<typeof readSession> | undefined;
      const session = computed(() => {
        const previous = previousSession;
        const next = readSession();
        // Host rerenders can rebuild a source view or use an equivalent row
        // key callback. Raw input replacements still retire every old handle.
        const current =
          previous &&
          previous.inputSource === next.inputSource &&
          previous.inputData === next.inputData &&
          previous.columns === next.columns &&
          sameSourceView(previous.source, next.source) &&
          previous.hostOrder === next.hostOrder &&
          previous.active === next.active &&
          sameRowSequence(previous.visibleRows, next.visibleRows)
            ? previous
            : next;
        previousSession = current;
        return current;
      });
      const model = useRowReorder(() => ({
        ...rowReorderRuntimeOptions(
          {
            ...context.runtime,
            rowAt: (index) =>
              context.rowInventory?.value.visibleRows[index] ??
              context.runtime.rowAt(index),
          },
          onRowReorder,
          options
        ),
        enabled: context.active.value,
        session: session.value,
        getRowIndex: (row: TRow) =>
          hostOrder.value.get(context.table.rowKey(row)),
      }));
      watch(
        model,
        (value) => context.state.set(rowReorderModelKey<TRow>(), value),
        { immediate: true, flush: "sync" }
      );
    },
  };
}

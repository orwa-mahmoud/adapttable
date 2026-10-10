/** Vue lifetime and DOM attributes over the authoritative neutral grid controller. */
import {
  type CellRange,
  cellRangeKey,
  createGridFocusController,
  defaultLabels,
  type GridCell,
  gridCellAttributes,
  gridColumnHeaderAttributes,
  gridContainerAttributes,
  gridFillHandleCell,
  type GridFocusControllerOptions,
  gridRowAttributes,
  isGridColumnSelected,
  reportedCellRange,
} from "@adapttable/core";
import type { GridFocusState } from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from "vue";

import { elementRef, toVueAttrs } from "../attrs";
import {
  type ExternalStoreOptions,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";
export interface GridFocusOptions<
  TRow,
> extends GridFocusControllerOptions<TRow> {
  /** Reveal a logical column before the pending cell receives focus. */
  readonly scrollToColumn?: (columnIndex: number) => void;
  /** Multi-cell range changes, including the initial null. */
  readonly reportRange?: (range: CellRange | null) => void;
}
export function useGridFocus<TRow>(
  input: MaybeRefOrGetter<GridFocusOptions<TRow>>,
  activity: ExternalStoreOptions = {}
): ComputedRef<GridFocusState> {
  requireScope("useGridFocus");
  const owner = useScopeActivity();
  let disposed = false;
  const options = computed(() => toValue(input));
  const active = computed(
    () =>
      !disposed &&
      owner.value &&
      (toValue(activity.active) ?? true) &&
      options.value.enabled
  );
  const configuration = computed(() => ({
    ...options.value,
    enabled: active.value,
  }));
  const controller = createGridFocusController(configuration.value);
  watch(configuration, (next) => controller.configure(next), { flush: "sync" });
  const snapshot = useExternalStore(controller, { active });
  watch(
    () => snapshot.value.active?.col,
    (col) => {
      if (active.value && col !== undefined)
        options.value.scrollToColumn?.(col);
    },
    { flush: "sync" }
  );
  const element = shallowRef<HTMLElement | null>(null);
  const attach = elementRef<HTMLElement>((node) => {
    element.value = node;
    controller.attach(node);
  });
  const run = (action: () => void): void => {
    if (active.value && !disposed) action();
  };
  const focusCell = (cell: GridCell): void =>
    run(() => controller.focusCell(cell));
  const selectRange = (range: CellRange | null): void =>
    run(() => controller.selectRange(range));
  const pressCell = (cell: GridCell, event: MouseEvent): void =>
    run(() => controller.pressCell(cell, event));
  const enterCell = (cell: GridCell): void =>
    run(() => controller.enterCell(cell));
  const trackFocus = (cell: GridCell): void =>
    run(() => controller.trackFocus(cell));
  const pressFill = (event: MouseEvent): void =>
    run(() => controller.pressFillHandle(event));
  const clickHeader = (
    col: number,
    event: MouseEvent,
    sortable?: boolean
  ): void => {
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      event.target instanceof Element &&
      event.target !== event.currentTarget &&
      event.target.closest(
        "button,input,select,textarea,summary,label,a[href],[contenteditable=true],[role=button]"
      )
    )
      return;
    run(() => controller.clickHeader(col, event, sortable));
  };
  const keyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || event.altKey) return;
    const target = event.target;
    if (
      target instanceof Element &&
      target !== event.currentTarget &&
      !target.matches("[data-grid-cell]")
    )
      return;
    run(() => controller.keyDown(event));
  };
  const syncFocus = (): void => {
    const focused = element.value?.ownerDocument.activeElement;
    if (active.value && !focused?.closest('[data-adapttable-part="find-bar"]'))
      controller.syncFocus();
  };
  watch(
    [
      snapshot,
      () => options.value.rows,
      () => options.value.currentMatch,
      element,
      active,
    ],
    syncFocus,
    { flush: "post" }
  );
  watch(
    [active, element],
    ([on, node], _previous, cleanup) => {
      if (!on || !node) return;
      const target = node.ownerDocument.defaultView;
      if (target) cleanup(controller.watchPointerRelease(target));
    },
    { immediate: true, flush: "sync" }
  );
  watch(
    [
      () => cellRangeKey(reportedCellRange(snapshot.value.range)),
      () => options.value.reportRange,
      active,
    ],
    () => {
      if (active.value)
        options.value.reportRange?.(reportedCellRange(snapshot.value.range));
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(() => {
    disposed = true;
    controller.configure({
      ...options.value,
      enabled: false,
      onPaste: undefined,
      onFill: undefined,
      onCut: undefined,
      onUndo: undefined,
      onRedo: undefined,
      onRangeChange: undefined,
    });
    controller.releasePointer();
    controller.attach(null);
  });
  return computed(() => {
    const current = options.value;
    const enabled = active.value;
    const first = current.firstRowIndex ?? 0;
    const {
      active: focused,
      range,
      fillPreview,
      announcement,
    } = snapshot.value;
    const windowed = current.rowCount > current.rows.length;
    const getCellProps = (cell: GridCell): Record<string, unknown> =>
      toVueAttrs({
        ...gridCellAttributes(
          {
            enabled,
            columnsWindowed: current.columnsWindowed === true,
            active: focused,
            firstRowIndex: first,
            range,
            fillPreview,
            matchKeys: current.matchKeys,
            currentMatch: current.currentMatch,
          },
          cell
        ),
        ...(enabled
          ? {
              onMouseDown: (event: MouseEvent) => {
                if (
                  !(event.target instanceof Element) ||
                  !event.target.closest(
                    "button,input,select,textarea,summary,label,a[href],[contenteditable=true],[role=button]"
                  )
                )
                  pressCell(cell, event);
              },
              onMouseEnter: () => enterCell(cell),
              onMouseUp: () => run(controller.releaseCell),
              onFocus: (event: FocusEvent) => {
                if (event.target === event.currentTarget) trackFocus(cell);
              },
            }
          : {}),
      });
    const getRowProps = (index: number) =>
      gridRowAttributes({ enabled, windowed }, index);
    return {
      enabled,
      active: enabled ? focused : null,
      range: enabled ? range : null,
      announcement: enabled ? announcement : "",
      fillPreview: enabled ? fillPreview : null,
      fillHandleCell: gridFillHandleCell({
        enabled,
        range,
        canFill: current.onFill !== undefined,
      }),
      fillHandleLabel:
        current.labels?.gridFillHandle ?? defaultLabels.gridFillHandle,
      getFillHandleProps: () =>
        toVueAttrs({
          onMouseDown: pressFill,
        }),
      getGridProps: () =>
        toVueAttrs({
          ...gridContainerAttributes({
            enabled,
            windowed,
            columnsWindowed: current.columnsWindowed === true,
            rowCount: current.rowCount,
            colCount: current.columns.length,
          }),
          ...(enabled
            ? {
                ref: attach,
                // A virtual body may mount later without changing its logical data.
                onVnodeMounted: syncFocus,
                onVnodeUpdated: syncFocus,
                onKeyDown: keyDown,
              }
            : {}),
        }),
      getCellProps,
      getRowProps,
      getCellPropsAt: (index, col) => getCellProps({ row: first + index, col }),
      getRowPropsAt: (index) => getRowProps(first + index),
      getColumnHeaderProps: (col, header = {}) =>
        toVueAttrs({
          ...gridColumnHeaderAttributes(
            { enabled, columnsWindowed: current.columnsWindowed === true },
            col
          ),
          ...(enabled
            ? {
                onClick: (event: MouseEvent) => {
                  if (!event.defaultPrevented)
                    clickHeader(col, event, header.sortable);
                },
              }
            : {}),
        }),
      columnCheckbox: enabled && current.headerCheckbox === true,
      isColumnSelected: (col) =>
        isGridColumnSelected(
          {
            enabled,
            range,
            firstRowIndex: first,
            loadedRows: current.rows.length,
          },
          col
        ),
      toggleColumn: (col) => run(() => controller.toggleColumn(col)),
      selectColumn: (col, extend) =>
        run(() => controller.selectColumn(col, extend)),
      focusCell,
      selectRange,
      copyCells: (cell, cut) => run(() => controller.copyCells(cell, cut)),
      cellAt: controller.cellAt,
    };
  });
}

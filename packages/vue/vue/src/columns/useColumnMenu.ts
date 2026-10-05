/** UI-free column management over the table's one controlled layout. */
import {
  ACTIONS_COLUMN_KEY,
  applyColumnNames,
  type ColumnDragEvent,
  columnDragRowAttrs,
  type ColumnMenuItem,
  type ColumnMenuRow,
  columnMenuRows,
  type ColumnRenameEditorOptions,
  columnReorderKeyDown,
  createColumnDragController,
  isRtlElement,
  nextPinSide,
  pinActionLabel,
  type PinnedSide,
  REORDER_COLUMN_KEY,
  type UseColumnLayoutResult,
} from "@adapttable/core";
import {
  columnMenuActions,
  filterColumnMenuRows,
  hideAllColumns,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/core/binding";
import {
  computed,
  type MaybeRefOrGetter,
  type ShallowRef,
  shallowRef,
  toValue,
  watch,
} from "vue";

import type { Attrs } from "../attrs";
import { useExternalStore, useScopeActivity } from "../store";
import type { ColumnMenuSlotProps } from "./columnMenuContracts";

export interface ColumnMenuDisplayRow {
  readonly key: string;
  readonly name: string;
  readonly hidden: boolean;
  readonly pinned: PinnedSide;
  readonly canMove: boolean;
  readonly canHide: boolean;
  readonly canPin: boolean;
  readonly edge?: "actions" | "reorder";
  readonly rowAttrs: Attrs;
  readonly gripAttrs: Attrs;
  readonly pinLabel: string;
  readonly toggleVisible: () => void;
  readonly togglePin: () => void;
  readonly rename: ColumnRenameEditorOptions;
  readonly actions: (beginRename: () => void) => readonly ColumnMenuItem[];
}
export function useColumnMenu<TRow>(
  input: MaybeRefOrGetter<ColumnMenuSlotProps<TRow>>
) {
  const active = useScopeActivity();
  const query: ShallowRef<string> = shallowRef("");
  const drag = createColumnDragController();
  const dragSnapshot = useExternalStore(drag);
  const props = computed(() => toValue(input));
  const layout = (): UseColumnLayoutResult<TRow> => ({
    ...props.value.layout,
    visibleColumns: [...props.value.layout.visibleColumns],
  });
  const allRows = computed(() =>
    columnMenuRows(
      applyColumnNames(props.value.allColumns, props.value.layout.state.names),
      layout()
    )
  );
  const rows = computed(() => filterColumnMenuRows(allRows.value, query.value));
  const currentRow = (key: string) =>
    allRows.value.find((row) => row.key === key);
  const move = (key: string, toIndex: number): void => {
    if (active.value && currentRow(key)?.canMove)
      props.value.layout.move(key, toIndex);
  };
  watch(
    active,
    (live) => {
      if (!live) drag.end();
    },
    { flush: "sync" }
  );
  const isRtl = (element: EventTarget | null): boolean =>
    props.value.dir === "rtl" ||
    (props.value.dir === undefined &&
      element instanceof HTMLElement &&
      isRtlElement(element));
  const itemsFor = (
    key: string,
    beginRename: () => void
  ): readonly ColumnMenuItem[] => {
    const current = currentRow(key);
    return current
      ? columnMenuActions(current, {
          ...props.value,
          layout: layout(),
          onBeginRename: props.value.onRenameColumn ? beginRename : undefined,
        })
      : [];
  };
  const itemFor = (key: string, id: string, beginRename: () => void) =>
    itemsFor(key, beginRename).find((item) => item.id === id);
  const actionsFor = (
    key: string,
    beginRename: () => void
  ): readonly ColumnMenuItem[] =>
    itemsFor(key, beginRename).map((item) =>
      "kind" in item
        ? {
            ...item,
            onChange: (value: string): void => {
              const current = itemFor(key, item.id, beginRename);
              if (
                active.value &&
                current &&
                "kind" in current &&
                !current.disabled
              )
                current.onChange(value);
            },
          }
        : {
            ...item,
            run: (): void => {
              const current = itemFor(key, item.id, beginRename);
              if (
                active.value &&
                current &&
                !("kind" in current) &&
                !current.disabled
              )
                current.run();
            },
          }
    );
  const displayRow = (row: ColumnMenuRow<TRow>): ColumnMenuDisplayRow => ({
    ...row,
    rowAttrs: row.canMove
      ? {
          draggable: true,
          ...columnDragRowAttrs(
            dragSnapshot.value.drag,
            dragSnapshot.value.overIndex,
            row.key,
            row.index
          ),
          onDragstart: (event: ColumnDragEvent): void => {
            const current = currentRow(row.key);
            if (active.value && current?.canMove)
              drag.dragStart(event, row.key, current.index);
          },
          onDragover: (event: ColumnDragEvent): void => {
            const current = currentRow(row.key);
            if (active.value && current) drag.dragOver(event, current.index);
          },
          onDrop: (event: ColumnDragEvent): void => {
            const current = currentRow(row.key);
            if (active.value && current) drag.drop(event, current.index, move);
          },
          onDragend: drag.end,
        }
      : {},
    gripAttrs: {
      "data-adapttable-grip": "",
      "aria-label": `${props.value.labels.moveStart} / ${props.value.labels.moveEnd}: ${row.name}`,
      disabled: !row.canMove,
      onKeydown: (event: KeyboardEvent): void => {
        const current = currentRow(row.key);
        if (!active.value || !current?.canMove || event.isComposing) return;
        columnReorderKeyDown(event, row.key, current.index, move, isRtl);
      },
    },
    pinLabel: pinActionLabel(row.pinned, props.value.labels),
    toggleVisible: (): void => {
      if (active.value && currentRow(row.key)?.canHide)
        props.value.layout.toggleVisible(row.key);
    },
    togglePin: (): void => {
      const current = currentRow(row.key);
      if (active.value && current?.canPin)
        props.value.layout.setPinned(row.key, nextPinSide(current.pinned));
    },
    rename: {
      key: row.key,
      name: row.name,
      requiredMessage: props.value.labels.columnNameRequired,
      renamedMessage: props.value.labels.columnRenamed,
      onRename: (key, name): void => {
        if (active.value && currentRow(key)?.canRename)
          props.value.onRenameColumn?.(key, name);
      },
    },
    actions: (beginRename) => actionsFor(row.key, beginRename),
  });
  const displayRows = computed((): readonly ColumnMenuDisplayRow[] =>
    rows.value.map(displayRow)
  );
  const edgeRows = computed((): readonly ColumnMenuDisplayRow[] => {
    const entries: {
      key: string;
      name: string;
      side: "start" | "end";
      edge: "reorder" | "actions";
    }[] = [];
    const p = props.value;
    if (p.hasRowReorder)
      entries.push({
        key: REORDER_COLUMN_KEY,
        name: p.labels.reorderRow,
        side: "start",
        edge: "reorder",
      });
    if (p.hasRowActions)
      entries.push({
        key: ACTIONS_COLUMN_KEY,
        name: p.labels.actions,
        side: "end",
        edge: "actions",
      });
    return entries.map(({ key, name, side, edge }) => {
      const unpinnedLabel =
        side === "start" ? p.labels.pinStart : p.labels.pinEnd;
      return {
        key,
        name,
        edge,
        hidden: p.layout.isHidden(key),
        pinned: p.layout.state.pinned[key],
        canMove: false,
        canHide: true,
        canPin: true,
        rowAttrs: {},
        gripAttrs: {},
        pinLabel: p.layout.state.pinned[key] ? p.labels.unpin : unpinnedLabel,
        toggleVisible: (): void => {
          if (
            active.value &&
            (edge === "actions"
              ? props.value.hasRowActions
              : props.value.hasRowReorder)
          )
            props.value.layout.toggleVisible(key);
        },
        togglePin: (): void => {
          if (
            active.value &&
            (edge === "actions"
              ? props.value.hasRowActions
              : props.value.hasRowReorder)
          )
            props.value.layout.setPinned(
              key,
              props.value.layout.state.pinned[key] ? undefined : side
            );
        },
        rename: {
          key,
          name,
          onRename: () => undefined,
          requiredMessage: p.labels.columnNameRequired,
          renamedMessage: p.labels.columnRenamed,
        },
        actions: () => [],
      };
    });
  });
  return {
    active,
    presentation: computed(() => ({
      labels: props.value.labels,
      dir: props.value.dir,
      classNames: props.value.classNames,
      container: props.value.container,
    })),
    query,
    rows: displayRows,
    edgeRows,
    setQuery: (value: string): void => {
      if (active.value) query.value = value;
    },
    showAll: (): void => {
      if (active.value) showAllColumns(rows.value, layout());
    },
    hideAll: (): void => {
      if (active.value) hideAllColumns(rows.value, layout());
    },
    unpinAll: (): void => {
      if (active.value) unpinAllColumns(rows.value, layout());
    },
    reset: (): void => {
      if (active.value) props.value.layout.reset();
    },
    autoSize: (): void => {
      if (active.value) props.value.onAutoSize();
    },
  };
}
export type ColumnMenuModel = ReturnType<typeof useColumnMenu>;

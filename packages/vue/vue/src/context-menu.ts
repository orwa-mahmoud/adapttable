import {
  composeContextMenuExtra,
  type ContextMenuItem,
  contextMenuItems,
  type ContextMenuTarget,
  copyContextMenuSelection,
  copyContextMenuTargetCell,
  createContextMenuOpenController,
} from "@adapttable/core";
import {
  coreContextMenu,
  featureStateKey,
  type GridFocusState,
} from "@adapttable/core/binding";
import { computed, onScopeDispose, watch } from "vue";

import {
  CONTEXT_MENU_CONTROL,
  CONTEXT_MENU_MODEL,
  type ContextMenuModel,
} from "./actions/contracts";
import {
  connectWhileActive,
  featureActivity,
  ownsTableEvent,
} from "./actions/lifecycle";
import type {
  FeatureMountContext,
  TableFeature,
} from "./features/tableFeature";
import { rowPinningModelKey } from "./layout/modelChannels";
import { useExternalStore } from "./store";
export interface ContextMenuOptions<TRow> {
  readonly items?: (
    target: ContextMenuTarget<TRow>
  ) => readonly ContextMenuItem[];
  readonly onFilter?: (key: string) => void;
}
const GRID_FOCUS_MODEL = featureStateKey<GridFocusState>(
  "vue-grid-focus-model"
);
function mountContextMenu<TRow>(context: FeatureMountContext<TRow>): void {
  const active = featureActivity(context);
  const enabled = () => active() && context.options.value.contextMenu !== false;
  const controller = createContextMenuOpenController<TRow>({
    enabled: enabled(),
  });
  const snapshot = useExternalStore(controller, { active: context.active });
  const focus = context.state.get(GRID_FOCUS_MODEL);
  const pins = context.state.get(rowPinningModelKey<TRow>());
  connectWhileActive(context, controller.connect);
  watch(
    () => enabled(),
    (value) => {
      controller.configure({ enabled: value });
      if (!value && controller.getSnapshot().open) controller.close();
    },
    { immediate: true, flush: "sync" }
  );
  onScopeDispose(() => {
    controller.configure({ enabled: false });
    if (controller.getSnapshot().open) controller.close();
  });
  const config = () =>
    typeof context.options.value.contextMenu === "object"
      ? (context.options.value.contextMenu as ContextMenuOptions<TRow>)
      : undefined;
  const rowFor = (id: string) => {
    const view = context.runtime.view();
    const rows =
      context.rowInventory?.value.visibleRows ??
      view?.visibleRows ??
      view?.rows;
    return rows?.find((row) => context.table.rowKey(row) === id);
  };
  const model = computed<ContextMenuModel>(() => {
    const open = enabled() ? snapshot.value.open : null;
    // Re-resolve rows when a source changes while a menu is open.
    const target = open?.target;
    const row =
      target && target.kind !== "header" ? rowFor(target.rowId) : undefined;
    let current = target;
    if (target && target.kind !== "header")
      current = row === undefined ? undefined : { ...target, row };
    return {
      at: current ? (open?.at ?? null) : null,
      close: controller.close,
      items: current
        ? contextMenuItems({
            target: current,
            columns: context.table.columns.value,
            labels: context.table.labels.value,
            actions: {
              onSort: (key, direction) => {
                if (enabled()) context.source.value.setSort(key, direction);
              },
              onHide: (key) => {
                if (enabled()) context.table.layout.value.setHidden(key, true);
              },
              onTogglePin: (key) => {
                if (enabled())
                  context.table.layout.value.setPinned(
                    key,
                    context.table.layout.value.pinOffset(key)
                      ? undefined
                      : "start"
                  );
              },
              onFilter: config()?.onFilter
                ? (key) => {
                    if (enabled()) config()?.onFilter?.(key);
                  }
                : undefined,
              onCopy: (target) => {
                if (!enabled()) return;
                if (focus.value?.enabled)
                  copyContextMenuSelection(focus.value, target);
                else
                  copyContextMenuTargetCell(
                    context.table.columns.value,
                    target
                  );
              },
              onCut:
                focus.value?.enabled &&
                typeof context.options.value.onCellCut === "function"
                  ? (target) => {
                      if (enabled() && focus.value)
                        copyContextMenuSelection(focus.value, target, true);
                    }
                  : undefined,
            },
            sortBy: context.source.value.sortBy,
            sortDir: context.source.value.sortDir,
            isPinned: (key) =>
              Boolean(context.table.layout.value.pinOffset(key)),
            rowPins: pins.value?.actions,
            extra: composeContextMenuExtra(
              config()?.items,
              context.featureHost.value.contextMenuItems
            ),
          }).map((item) => ({
            ...item,
            onSelect: () => {
              if (enabled() && !item.disabled) item.onSelect();
            },
          }))
        : [],
    };
  });
  watch(model, (value) => context.state.set(CONTEXT_MENU_MODEL, value), {
    immediate: true,
    flush: "sync",
  });
  watch(
    [context.root, context.active],
    ([root, live], _old, onCleanup) => {
      if (!root || !live) return;
      const region = controller.regionHandlers(rowFor);
      const listen = <K extends keyof HTMLElementEventMap>(
        type: K,
        run: (event: HTMLElementEventMap[K]) => void
      ) => {
        const handler = (event: HTMLElementEventMap[K]) => {
          if (enabled() && ownsTableEvent(root, event)) run(event);
        };
        root.addEventListener(type, handler);
        return () => root.removeEventListener(type, handler);
      };
      const cleanups = [
        listen("contextmenu", region.onContextMenu),
        listen("keydown", region.onKeyDown),
        listen("pointerdown", region.onPointerDown),
        listen("pointermove", region.onPointerMove),
        listen("pointerup", region.onPointerUp),
        listen("pointercancel", region.onPointerCancel),
      ];
      onCleanup(() => {
        for (const cleanup of cleanups) cleanup();
      });
    },
    { immediate: true, flush: "sync" }
  );
}
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  const core = coreContextMenu<TRow>(options);
  return {
    id: core.id,
    apply: (input) => core.apply?.(input) ?? {},
    setup: (host) => core.setup?.(host),
    mount: mountContextMenu,
    requiredSlots: [CONTEXT_MENU_CONTROL],
  };
}
export type {
  ContextMenuChromeProps,
  ContextMenuSlots,
} from "./actions/contextMenuChrome";
export { ContextMenuChrome } from "./actions/contextMenuChrome";
export type { ContextMenuModel } from "./actions/contracts";
export { CONTEXT_MENU_CONTROL, CONTEXT_MENU_MODEL } from "./actions/contracts";
export type * from "./index";
export type { ContextMenuItem, ContextMenuTarget } from "@adapttable/core";

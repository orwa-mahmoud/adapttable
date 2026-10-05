/** Navigation structure and localized text; every visible control is required. */
import {
  findMatchCountText,
  handleFindBarKey,
  resolveLabels,
  sameGridCell,
  selectionStatParts,
  statusBarItems,
} from "@adapttable/core";
import type {
  ColumnSelectCheckboxChromeProps as NeutralColumnSelectCheckboxChromeProps,
  ColumnSelectSlots as NeutralColumnSelectSlots,
  FillHandleSlots as NeutralFillHandleSlots,
  FindBarProps,
  FindBarSlots as NeutralFindBarSlots,
  GridFocusState,
  SelectionStatsChromeProps as NeutralSelectionStatsChromeProps,
  SelectionStatsSlots as NeutralSelectionStatsSlots,
  StatusBarChromeProps as NeutralStatusBarChromeProps,
  StatusBarSlotProps as NeutralStatusBarSlotProps,
  StatusBarSlots as NeutralStatusBarSlots,
} from "@adapttable/core/binding";
import {
  defineComponent,
  h,
  nextTick,
  onScopeDispose,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";

import { useScopeActivity } from "../store";

export type FindBarSlots = NeutralFindBarSlots<VNodeChild>;
export interface FindBarChromeProps extends FindBarProps {
  readonly slots: FindBarSlots;
}
function findBarStructure(
  { find, labels, className, slots }: FindBarChromeProps,
  focusRef: (node: { focus(): void } | null) => void
): VNodeChild {
  if (!find.open) return null;
  const text = resolveLabels(labels);
  return h("div", { "data-adapttable-part": "find-bar", class: className }, [
    slots.Search({
      label: text.findInTable,
      placeholder: text.findPlaceholder,
      value: find.query,
      focusRef,
      onChange: find.setQuery,
      onKeyDown: (event) => {
        if (handleFindBarKey(event, find)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    }),
    h(
      "output",
      { "data-adapttable-part": "find-count" },
      findMatchCountText(text, find.index, find.matches.length)
    ),
    slots.Button({
      label: text.findPrevious,
      part: "find-previous",
      kind: "previous",
      disabled: find.matches.length === 0,
      onClick: find.previous,
    }),
    slots.Button({
      label: text.findNext,
      part: "find-next",
      kind: "next",
      disabled: find.matches.length === 0,
      onClick: find.next,
    }),
    slots.Button({
      label: text.findClose,
      part: "find-close",
      kind: "close",
      onClick: () => find.setOpen(false),
    }),
  ]);
}
const FindBarStructure = defineComponent(
  (props: FindBarChromeProps) => {
    let input: { focus(): void } | null = null;
    let previous: HTMLElement | null = null;
    let live = true;
    const focusRef = (node: { focus(): void } | null): void => {
      if (!node || node === input) return;
      input = node;
      previous =
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      void nextTick(() => {
        if (live && props.find.open) node.focus();
      });
    };
    onScopeDispose(() => {
      live = false;
      const target = previous;
      void nextTick(() => {
        if (
          target?.isConnected &&
          target.ownerDocument.activeElement === target.ownerDocument.body
        )
          target.focus();
      });
    });
    return () => findBarStructure(props, focusRef);
  },
  { props: ["find", "labels", "className", "slots"] }
);
export function FindBarChrome(props: FindBarChromeProps): VNodeChild {
  return props.find.open ? h(FindBarStructure, props) : null;
}

export type ColumnSelectSlots = NeutralColumnSelectSlots<VNodeChild>;
export interface ColumnSelectCheckboxChromeProps extends NeutralColumnSelectCheckboxChromeProps {
  readonly slots: ColumnSelectSlots;
}
const ColumnSelectStructure = defineComponent(
  (props: ColumnSelectCheckboxChromeProps) => {
    const active = useScopeActivity();
    const canHover = shallowRef(false);
    const near = shallowRef(false);
    watch(
      active,
      (enabled, _previous, cleanup) => {
        if (
          !enabled ||
          typeof window === "undefined" ||
          typeof window.matchMedia !== "function"
        ) {
          canHover.value = false;
          near.value = false;
          return;
        }
        const media = window.matchMedia("(hover: hover) and (pointer: fine)");
        const read = () => {
          canHover.value = media.matches;
        };
        read();
        media.addEventListener("change", read);
        cleanup(() => media.removeEventListener("change", read));
      },
      { immediate: true, flush: "sync" }
    );
    return () => {
      const shown = !canHover.value || near.value || props.checked;
      return h(
        "span",
        {
          role: "none",
          "data-adapttable-part": "column-select",
          "data-shown": shown ? "" : undefined,
          class: props.className,
          style: {
            display: "inline-flex",
            alignItems: "center",
            opacity: shown ? 1 : 0,
            transition: "opacity 120ms ease",
          },
          onPointerenter: () => {
            near.value = true;
          },
          onPointerleave: () => {
            near.value = false;
          },
          onFocusin: () => {
            near.value = true;
          },
          onFocusout: () => {
            near.value = false;
          },
          onClick: (event: MouseEvent) => event.stopPropagation(),
          onMousedown: (event: MouseEvent) => event.stopPropagation(),
          onKeydown: (event: KeyboardEvent) => event.stopPropagation(),
        },
        [
          props.slots.Checkbox({
            label: props.label,
            checked: props.checked,
            onToggle: props.onToggle,
          }),
        ]
      );
    };
  },
  { props: ["label", "checked", "onToggle", "className", "slots"] }
);
export function ColumnSelectCheckboxChrome(
  props: ColumnSelectCheckboxChromeProps
): VNodeChild {
  return h(ColumnSelectStructure, props);
}

export type FillHandleSlots = NeutralFillHandleSlots<VNodeChild>;
export interface FillHandleChromeProps {
  readonly focus?: GridFocusState;
  readonly windowIndex: number;
  readonly col: number;
  readonly firstRowIndex?: number;
  readonly className?: string;
  readonly slots: FillHandleSlots;
}
export function FillHandleChrome(props: FillHandleChromeProps): VNodeChild {
  const focus = props.focus;
  if (
    !focus?.fillHandleCell ||
    !sameGridCell(focus.fillHandleCell, {
      row: (props.firstRowIndex ?? 0) + props.windowIndex,
      col: props.col,
    })
  )
    return null;
  return props.slots.Handle({
    label: focus.fillHandleLabel,
    handleProps: focus.getFillHandleProps(),
    className: props.className,
  });
}
export type SelectionStatsChromeProps =
  NeutralSelectionStatsChromeProps<VNodeChild>;
export function SelectionStatsChrome(
  props: SelectionStatsChromeProps
): VNodeChild {
  const parts = selectionStatParts(props.stats, props.labels, props.locale);
  return parts
    ? props.slots.Stats({ parts, className: props.className })
    : null;
}
export type StatusBarChromeProps = NeutralStatusBarChromeProps<VNodeChild>;
export function StatusBarChrome(props: StatusBarChromeProps): VNodeChild {
  const stats = SelectionStatsChrome({ ...props, slots: props.slots.stats });
  const items = statusBarItems(props);
  return props.enabled || items.length
    ? props.slots.Bar({ items, stats, className: props.className })
    : stats;
}
const LIVE_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
} as const;
export function GridFocusAnnouncer(props: {
  readonly focus?: GridFocusState;
  readonly className?: string;
}): VNodeChild {
  return props.focus?.enabled
    ? h(
        "span",
        {
          role: "status",
          "aria-live": "polite",
          "aria-atomic": "true",
          "data-adapttable-part": "grid-focus-announcer",
          style: LIVE_STYLE,
          class: props.className,
        },
        props.focus.announcement
      )
    : null;
}

export type StatusBarSlots = NeutralStatusBarSlots<VNodeChild>;
export type StatusBarSlotProps = NeutralStatusBarSlotProps<VNodeChild>;
export type SelectionStatsSlots = NeutralSelectionStatsSlots<VNodeChild>;

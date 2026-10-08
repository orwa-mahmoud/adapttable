import type {
  ContextMenuChromeProps as NeutralProps,
  ContextMenuSlots as NeutralSlots,
} from "@adapttable/core/binding";
import {
  defineComponent,
  Fragment,
  h,
  nextTick,
  onScopeDispose,
  type VNodeChild,
  watch,
} from "vue";

import { elementRef } from "../attrs";
import { useScopeActivity } from "../store";
export type ContextMenuSlots = NeutralSlots<VNodeChild>;
/** A complete native menu presentation with binding-owned selection lifetimes. */
export interface ContextMenuPresentationProps extends Omit<
  Parameters<ContextMenuSlots["Surface"]>[0],
  "children"
> {
  readonly items: readonly {
    readonly item: NeutralProps<VNodeChild>["items"][number];
    readonly onSelect: () => void;
  }[];
  readonly isCurrent: () => boolean;
}
export type ContextMenuPresentation = (
  props: ContextMenuPresentationProps
) => VNodeChild;
export type ContextMenuChromeProps = Omit<NeutralProps<VNodeChild>, "slots"> &
  (
    | { readonly slots: ContextMenuSlots; readonly presentation?: undefined }
    | { readonly slots?: never; readonly presentation: ContextMenuPresentation }
  );
export const ContextMenuChrome = /*#__PURE__*/ defineComponent(
  (props: ContextMenuChromeProps) => {
    const active = useScopeActivity();
    const anchorRef: { current: HTMLElement | null } = { current: null };
    let generation = 0;
    let activityLifetime = 0;
    let pendingSelection:
      { cancelled: boolean; projectionChanged: boolean } | undefined;
    watch(
      active,
      () => {
        generation++;
        activityLifetime++;
        if (pendingSelection) pendingSelection.cancelled = true;
      },
      { flush: "sync" }
    );
    watch(
      [() => props.items, () => props.slots?.Surface, () => props.presentation],
      () => {
        generation++;
        if (pendingSelection) pendingSelection.projectionChanged = true;
      },
      { flush: "sync" }
    );
    watch(
      () => props.onClose,
      () => {
        generation++;
        if (pendingSelection) pendingSelection.cancelled = true;
      },
      { flush: "sync" }
    );
    watch(
      () => props.at,
      (at) => {
        generation++;
        if (at !== null && pendingSelection) pendingSelection.cancelled = true;
      },
      { flush: "sync" }
    );
    onScopeDispose(() => {
      generation++;
      activityLifetime++;
      if (pendingSelection) pendingSelection.cancelled = true;
    });
    return () => {
      if (
        props.presentation !== undefined &&
        typeof props.presentation !== "function"
      )
        throw new Error(
          "AdaptTable: ContextMenuChrome requires a complete presentation renderer."
        );
      if (!props.presentation)
        for (const name of ["Surface", "Item", "Separator"] as const)
          if (typeof props.slots?.[name] !== "function")
            throw new Error(
              `AdaptTable: ContextMenuChrome requires the ${name} control slot.`
            );
      if (!active.value || !props.at || props.items.length === 0) return null;
      const ticket = generation;
      const at = props.at;
      const items = props.items;
      const driver = props.presentation ?? props.slots?.Surface;
      const owner = props.onClose;
      const ownsLifetime = () =>
        active.value &&
        ticket === generation &&
        (props.presentation ?? props.slots?.Surface) === driver &&
        props.onClose === owner;
      const isCurrent = () =>
        ownsLifetime() && props.at === at && props.items === items;
      const close = () => {
        if (isCurrent()) props.onClose();
      };
      const select = (item: ContextMenuChromeProps["items"][number]) => {
        if (!isCurrent() || item.disabled || pendingSelection) return;
        const selection = { cancelled: false, projectionChanged: false };
        const activity = activityLifetime;
        pendingSelection = selection;
        try {
          close();
        } catch (error) {
          pendingSelection = undefined;
          throw error;
        }
        void nextTick(async () => {
          // The close may be rejected without scheduling a render. Allow any
          // synchronous parent replacement to flush before reading its props.
          await nextTick();
          if (pendingSelection !== selection) return;
          pendingSelection = undefined;
          // Closed projections may clear items and recreate their slot functions.
          // A completed close owns dispatch regardless of that render order.
          // A rejected close must retain its open projection; a newer menu or
          // an inactive/replaced component scope always retires dispatch.
          if (
            !selection.cancelled &&
            active.value &&
            activity === activityLifetime &&
            (props.at === null ||
              (!selection.projectionChanged &&
                props.at === at &&
                props.items === items &&
                (props.presentation ?? props.slots?.Surface) === driver))
          )
            item.onSelect();
        });
      };
      let surface: VNodeChild;
      if (props.presentation)
        surface = props.presentation({
          at: props.at,
          anchorRef,
          label: props.labels?.contextMenu ?? "Table actions",
          onClose: close,
          container: props.container,
          className: props.className,
          items: props.items.map((item) => ({
            item,
            onSelect: () => select(item),
          })),
          isCurrent,
        });
      else {
        const slots = props.slots;
        surface = slots.Surface({
          at: props.at,
          anchorRef,
          label: props.labels?.contextMenu ?? "Table actions",
          onClose: close,
          container: props.container,
          className: props.className,
          children: props.items.map((item) =>
            h(Fragment, { key: item.key }, [
              item.separatorBefore ? slots.Separator() : null,
              slots.Item({
                item,
                onSelect: () => select(item),
              }),
            ])
          ),
        });
      }
      return h(Fragment, null, [
        h("span", {
          ref: elementRef<HTMLElement>((element) => {
            anchorRef.current = element;
          }),
          "aria-hidden": true,
          "data-adapttable-part": "context-menu-anchor",
          style: {
            position: "fixed",
            left: `${props.at.x}px`,
            top: `${props.at.y}px`,
            width: 0,
            height: 0,
            pointerEvents: "none",
          },
        }),
        surface,
      ]);
    };
  },
  {
    name: "ContextMenuChrome",
    props: [
      "items",
      "at",
      "onClose",
      "labels",
      "className",
      "container",
      "slots",
      "presentation",
    ],
  }
);

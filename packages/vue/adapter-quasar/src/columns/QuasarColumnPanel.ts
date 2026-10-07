import {
  type ManagedOverlayPanelProps,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { QCard, QCardSection, QMenu } from "quasar";
import {
  defineComponent,
  h,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  onScopeDispose,
  shallowRef,
  watchEffect,
} from "vue";

import { quasarAttrs, useQuasarControlRef } from "../controls/controlAttrs";

function visible(element: HTMLElement): boolean {
  if (
    !element.isConnected ||
    element.matches(":disabled") ||
    element.getAttribute("aria-disabled") === "true"
  )
    return false;
  const view = element.ownerDocument.defaultView;
  for (
    let current: HTMLElement | null = element;
    current;
    current = current.parentElement
  ) {
    if (current.hidden || current.inert) return false;
    const style = view?.getComputedStyle(current);
    if (style?.display === "none" || style?.visibility === "hidden")
      return false;
  }
  return true;
}

function finishFocus(
  control: ManagedOverlayPanelProps,
  panel: HTMLElement | null,
  accepted: () => boolean
): void {
  const anchor = control.anchor;
  if (!anchor) return;
  const doc = anchor.ownerDocument;
  const origin = doc.activeElement;
  // Only finish a handoff from this surface or its own trigger. A host may
  // deliberately move focus as part of an action that also closes the menu.
  if (origin !== anchor && (!origin || !panel?.contains(origin))) return;
  const ownerModal = anchor.closest('[aria-modal="true"]');
  void nextTick(() => {
    if (!accepted() || !control.isCurrent() || !visible(anchor)) return;
    const current = doc.activeElement;
    if (current === anchor) return;
    if (
      current !== doc.body &&
      current !== origin &&
      (!current || !panel?.contains(current))
    )
      return;
    // A newly opened native dialog can claim focus after this tick. Its
    // public modal semantics take precedence over restoring the old trigger.
    if (
      [...doc.querySelectorAll('[aria-modal="true"]')].some(
        (modal) => modal !== ownerModal && !modal.contains(anchor)
      )
    )
      return;
    anchor.focus({ preventScroll: true });
  });
}

/** QMenu owns its public portal; the QCard is the semantic dialog target. */
export const QuasarColumnPanel = defineComponent(
  (props: { readonly control: ManagedOverlayPanelProps }) => {
    const active = useScopeActivity();
    const card = shallowRef<InstanceType<typeof QCard> | null>(null);
    const inheritedDirection = shallowRef<"ltr" | "rtl">();
    const target = (): HTMLElement | null => {
      const element: unknown = card.value?.$el;
      return typeof HTMLElement !== "undefined" &&
        element instanceof HTMLElement
        ? element
        : null;
    };
    useQuasarControlRef(target, () => props.control.attrs);
    watchEffect(
      () => {
        if (props.control.attrs.dir !== undefined) return;
        const anchor = props.control.anchor;
        const view = anchor?.ownerDocument.defaultView;
        if (anchor && view)
          inheritedDirection.value =
            view.getComputedStyle(anchor).direction === "rtl" ? "rtl" : "ltr";
      },
      { flush: "post" }
    );
    let disposed = false;
    let requestedClose = false;
    let acquired: ManagedOverlayPanelProps | undefined;
    onBeforeUnmount(() => {
      // Chrome may accept an action and remove the surface without asking
      // QMenu to emit a dismissal. Complete that native unmount handoff only
      // for this acquired, still-current owner; explicit outside closes skip it.
      if (!requestedClose && acquired)
        finishFocus(acquired, target(), () => disposed);
    });
    onScopeDispose(() => {
      disposed = true;
    });
    const close = (
      control: ManagedOverlayPanelProps,
      reason: "escape" | "outside"
    ) => {
      if (!active.value || disposed || !control.open || !control.isCurrent())
        return;
      const panel = target();
      requestedClose = true;
      void nextTick(() => {
        if (!disposed && props.control.open) requestedClose = false;
      });
      control.onClose(reason);
      if (reason === "escape")
        finishFocus(control, panel, () => disposed || !props.control.open);
    };
    return () => {
      const control = props.control;
      if (
        !active.value ||
        !control.open ||
        !control.isCurrent() ||
        !control.anchor
      )
        return null;
      acquired = control;
      const direction = control.attrs.dir;
      const dir =
        direction === "rtl" || direction === "ltr"
          ? direction
          : inheritedDirection.value;
      const content = () => control.content;
      const section = () => h(QCardSection, {}, content);
      const onKeydown = (event: KeyboardEvent) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          event.isComposing
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        close(control, "escape");
      };
      const renderCard = () =>
        h(
          QCard,
          mergeProps(quasarAttrs(control.attrs), {
            ref: card,
            dir,
            tabindex: -1,
            class: "adapttable-quasar-column-panel",
            onKeydown,
          }),
          section
        );
      return h(
        QMenu,
        {
          modelValue: true,
          target: control.anchor,
          noParentEvent: true,
          noRefocus: true,
          // QSelect consumes Escape on keyup. Bubble-phase keydown lets the
          // binding's submenu and rename handlers consume theirs first.
          noEscDismiss: true,
          anchor: dir === "rtl" ? "bottom right" : "bottom left",
          self: dir === "rtl" ? "top right" : "top left",
          transitionDuration: 0,
          maxHeight: "min(70vh, 32rem)",
          maxWidth: "min(28rem, calc(100vw - 1rem))",
          dir,
          "onUpdate:modelValue": (open: boolean) => {
            if (!open) close(control, "outside");
          },
        },
        renderCard
      );
    };
  },
  { name: "QuasarColumnPanel", props: ["control"] }
);

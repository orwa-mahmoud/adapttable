import {
  type FilterPanelModel,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { nextTick, onScopeDispose } from "vue";

function visible(element: HTMLElement): boolean {
  return (
    element.isConnected &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    element.getClientRects().length > 0
  );
}

/** Focus is presentation state. The binding still owns open/closed state. */
export function usePanelClose<TRow>(
  read: () => Pick<FilterPanelModel<TRow>, "open" | "anchor" | "close">
) {
  const active = useScopeActivity();
  let pending: HTMLElement | null = null;
  let revision = 0;
  onScopeDispose(() => {
    pending = null;
    revision++;
  });
  const close = (reason?: "escape" | "outside" | "done") => {
    if (!active.value) return;
    const model = read();
    if (!model.open) return;
    revision++;
    pending = reason === "outside" ? null : model.anchor;
    // The primitive's close-auto-focus phase runs after modal teardown.
    // Keep the binding from focusing an inert/hidden target before that phase.
    model.close(reason === "outside" ? "outside" : "done");
  };
  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    const anchor = pending;
    pending = null;
    if (!active.value || !anchor) return;
    const ticket = revision;
    void nextTick(() => {
      if (!active.value || ticket !== revision) return;
      const current = read();
      if (!current.open && current.anchor === anchor && visible(anchor))
        anchor.focus();
    });
  };
  return { close, onCloseAutoFocus };
}

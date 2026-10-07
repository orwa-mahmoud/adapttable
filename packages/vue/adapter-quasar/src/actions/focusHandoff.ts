import { nextTick } from "vue";

/** Complete a native overlay's unmount without stealing a newer focus owner. */
export function finishOverlayFocus(
  opener: HTMLElement | null,
  root: HTMLElement | null,
  current: () => boolean
): void {
  if (!opener || !root) return;
  const doc = opener.ownerDocument;
  const origin = doc.activeElement;
  if (!origin || !root.contains(origin)) return;
  const ownerModal = opener.closest('[aria-modal="true"]');
  void nextTick(() => {
    if (
      !current() ||
      !opener.isConnected ||
      opener.matches(":disabled,[aria-disabled='true']") ||
      opener.closest("[hidden],[inert]")
    )
      return;
    if (doc.activeElement !== doc.body && doc.activeElement !== origin) return;
    if (
      [...doc.querySelectorAll('[aria-modal="true"]')].some(
        (modal) => modal !== ownerModal && !modal.contains(opener)
      )
    )
      return;
    const view = doc.defaultView;
    for (
      let element: HTMLElement | null = opener;
      element;
      element = element.parentElement
    ) {
      const style = view?.getComputedStyle(element);
      if (style?.display === "none" || style?.visibility === "hidden") return;
    }
    opener.focus({ preventScroll: true });
  });
}

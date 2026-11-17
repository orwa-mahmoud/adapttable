/**
 * The short notice a demo action raises ("Delete: Priya Nair", "Export: 3"),
 * written once for React, Vue and Angular: the event a page body sends, the
 * listener a page shell keeps, and how the notice looks. A framework draws
 * the box with these styles.
 */

/** The window event a demo notice travels on. */
export const DEMO_NOTICE_EVENT = "adapttable-demo-notice";

/** How long a notice stays on screen, in ms. */
const NOTICE_DURATION_MS = 2600;

/** One notice: what happened, and whether it removed something. */
export interface DemoNotice {
  readonly message: string;
  readonly tone?: "info" | "danger";
}

/**
 * Raise a notice for the page shell to show.
 *
 * @param notice - What to say.
 */
export function notifyDemo(notice: DemoNotice): void {
  window.dispatchEvent(
    new CustomEvent<DemoNotice>(DEMO_NOTICE_EVENT, { detail: notice })
  );
}

/**
 * Follow the page's notices: each one is handed over as it arrives and
 * cleared (`null`) once it has been on screen long enough.
 *
 * @param show - Receives the notice to show, or `null` to hide it.
 * @returns Stops listening and cancels a pending clear.
 */
export function listenForNotices(
  show: (notice: DemoNotice | null) => void
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onNotice = (event: Event) => {
    show((event as CustomEvent<DemoNotice>).detail);
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => show(null), NOTICE_DURATION_MS);
  };
  window.addEventListener(DEMO_NOTICE_EVENT, onNotice);
  return () => {
    window.removeEventListener(DEMO_NOTICE_EVENT, onNotice);
    if (timer !== undefined) clearTimeout(timer);
  };
}

/**
 * The notice box's inline style, fixed to the end corner of the page.
 *
 * @param notice - The notice shown.
 * @returns CSS properties, camel-cased, with units.
 */
export function noticeStyle(notice: DemoNotice): Record<string, string> {
  return {
    position: "fixed",
    insetInlineEnd: "20px",
    bottom: "20px",
    zIndex: "100",
    padding: "10px 16px",
    borderRadius: "10px",
    background: notice.tone === "danger" ? "#b91c1c" : "#111827",
    color: "#fff",
    fontSize: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,.25)",
  };
}

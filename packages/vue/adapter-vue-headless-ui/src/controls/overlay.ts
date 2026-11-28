import { nextTick, watchPostEffect } from "vue";

/**
 * Headless UI's panels carry no positioning. This keeps one beside its
 * anchor, flipped above when there is no room below, and inside the viewport.
 */
export function placeOverlay(
  panel: HTMLElement,
  anchor: HTMLElement,
  dir: "ltr" | "rtl",
  align: "start" | "end" = "end"
): void {
  const view = panel.ownerDocument.defaultView;
  if (!view) return;
  const gutter = 8;
  const gap = 4;
  const bounds = anchor.getBoundingClientRect();
  const viewport =
    panel.ownerDocument.documentElement.clientWidth || view.innerWidth;
  const below = Math.max(0, view.innerHeight - bounds.bottom - gap - gutter);
  const above = Math.max(0, bounds.top - gap - gutter);
  const desired = Math.min(
    560,
    Math.max(panel.scrollHeight, panel.getBoundingClientRect().height)
  );
  const down = below >= Math.min(desired, 240) || below >= above;
  // A select's list is at least as wide as its button.
  if (panel.getAttribute("role") === "listbox")
    panel.style.minInlineSize = `${bounds.width}px`;
  panel.style.position = "fixed";
  panel.style.inset = "auto";
  panel.style.maxInlineSize = `${Math.max(0, viewport - gutter * 2)}px`;
  panel.style.maxBlockSize = `${Math.min(560, down ? below : above)}px`;
  const rect = panel.getBoundingClientRect();
  const left =
    (dir === "rtl") === (align === "end")
      ? bounds.left
      : bounds.right - rect.width;
  const top = down ? bounds.bottom + gap : bounds.top - gap - rect.height;
  panel.style.left = `${Math.max(gutter, Math.min(left, viewport - rect.width - gutter))}px`;
  panel.style.top = `${Math.max(gutter, Math.min(top, view.innerHeight - rect.height - gutter))}px`;
}

/** Keep `panel` placed against `anchor` while both are mounted. */
export function usePlacement(
  panel: () => HTMLElement | null,
  anchor: () => HTMLElement | null,
  dir: () => "ltr" | "rtl",
  align: "start" | "end" = "end"
): void {
  watchPostEffect(() => {
    const element = panel();
    const target = anchor();
    if (element && target) placeOverlay(element, target, dir(), align);
  });
}

/** A Headless UI component's element: `el`/`$el` for its own, or a plain node. */
export function elementOf(value: unknown): HTMLElement | null {
  if (typeof HTMLElement === "undefined") return null;
  if (value instanceof HTMLElement) return value;
  if (value && typeof value === "object" && "$el" in value) {
    const element: unknown = value.$el;
    return element instanceof HTMLElement ? element : null;
  }
  return null;
}

export type DismissReason = "escape" | "outside";

/** The nested overlays a popover's own controls open, which count as inside it. */
const NESTED = '[role="listbox"],[role="menu"],[role="dialog"]';

/**
 * Dismissal for an overlay whose open state the host owns. Headless UI's
 * Popover opens and closes itself, so a controlled panel gets its Escape,
 * outside-press and focus-leaves handling here, in one place.
 */
export function useDismissLayer(options: {
  readonly open: () => boolean;
  readonly panel: () => HTMLElement | null;
  readonly anchor: () => HTMLElement | null;
  readonly onDismiss: (reason: DismissReason) => void;
}): void {
  watchPostEffect((onCleanup) => {
    const panel = options.panel();
    if (!options.open() || !panel) return;
    const document = panel.ownerDocument;
    const inside = (target: EventTarget | null) =>
      target instanceof Node &&
      (panel.contains(target) ||
        options.anchor()?.contains(target) === true ||
        (target instanceof Element && target.closest(NESTED) !== null));
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      options.onDismiss("escape");
    };
    const pointerdown = (event: Event) => {
      if (!inside(event.target)) options.onDismiss("outside");
    };
    const focusin = (event: FocusEvent) => {
      if (event.target instanceof Node && !inside(event.target))
        options.onDismiss("outside");
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown, true);
    document.addEventListener("focusin", focusin);
    onCleanup(() => {
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", pointerdown, true);
      document.removeEventListener("focusin", focusin);
    });
  });
}

/**
 * Headless UI moves focus into a list in the tick after it opens, but a list
 * drawn in a portal is not mounted by then. Once it is, focus the preferred
 * choice (or the first enabled one) so the keyboard works and one is active.
 */
export function focusChoice(
  root: HTMLElement,
  choice: string,
  preferred?: string
) {
  const focused = document.activeElement;
  if (!root.isConnected || (focused !== root && root.contains(focused))) return;
  const choices = [...root.querySelectorAll<HTMLElement>(choice)];
  const target =
    (preferred ? choices.find((item) => item.matches(preferred)) : undefined) ??
    choices[0] ??
    root;
  target.focus({ preventScroll: true });
}

/**
 * Headless UI keeps a list's open state inside the list, so closing one from
 * outside is an Escape sent to it. Focus stays where the user put it, unless
 * it was inside the list or on its trigger, where Headless UI returns it.
 */
export function closeList(
  list: HTMLElement | null,
  trigger: HTMLElement | null
): void {
  if (!list) return;
  const previous = document.activeElement;
  list.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
  void nextTick(() => {
    if (
      previous instanceof HTMLElement &&
      previous.isConnected &&
      previous !== document.body &&
      !list.contains(previous) &&
      previous !== trigger
    )
      previous.focus({ preventScroll: true });
  });
}

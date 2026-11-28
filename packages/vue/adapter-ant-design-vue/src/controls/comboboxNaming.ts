import { onMounted, onUpdated, type Ref, useAttrs } from "vue";

import { eventHandlers } from "./handlers";

/**
 * Ant Design Vue places every fall-through attribute on the select's root
 * `div`, which has no role, so a name or description given there never reaches
 * the native combobox. This hook keeps the `aria-*` attributes off the root and
 * mirrors them onto the focusable combobox input.
 */
export function useComboboxNaming(
  control: Ref<{ readonly $el?: unknown } | null | undefined>
): {
  readonly rootAttrs: Readonly<Record<string, unknown>>;
  readonly onKeydown: (event: KeyboardEvent) => void;
} {
  const escape = useOpenSelectEscape();
  const attrs = useAttrs();
  // Fall-through attributes are not reactive, so they are read afresh.
  const aria = () =>
    Object.entries(attrs).filter(([name]) => name.startsWith("aria-"));
  const apply = () => {
    const host: unknown = control.value?.$el;
    if (!(host instanceof Element)) return;
    const input = host.querySelector('[role="combobox"]');
    if (!input) return;
    for (const [name, value] of aria())
      if (value == null || value === false) input.removeAttribute(name);
      else
        input.setAttribute(
          name,
          typeof value === "string" ? value : JSON.stringify(value)
        );
  };
  onMounted(apply);
  onUpdated(apply);
  return {
    get rootAttrs() {
      const rest = Object.fromEntries(
        Object.entries(attrs).filter(
          ([name]) => !name.startsWith("aria-") && name !== "onKeydown"
        )
      );
      // The capture listener sits on the root, which only takes native
      // listeners, so it is joined with any the caller gave.
      return {
        ...rest,
        onKeydownCapture: [
          escape.onKeydownCapture,
          ...eventHandlers<KeyboardEvent>(attrs.onKeydownCapture),
        ],
      };
    },
    // The select declares `onKeydown` as a single function prop, so the
    // caller's handlers and the escape marker are joined into one.
    onKeydown(event) {
      // An Escape that only closed the open list is not for the caller.
      if (escape.onKeydown(event)) return;
      for (const handler of eventHandlers<KeyboardEvent>(attrs.onKeydown))
        handler(event);
    },
  };
}

/**
 * Ant Design Vue closes an open select on Escape but lets the event keep
 * travelling, so an enclosing popover, drawer or submenu would close with it.
 * The select notes that it was open when the key arrived and then marks the
 * event handled and stops it, so the Escape closes the list and nothing else.
 */
export function useOpenSelectEscape(): {
  readonly onKeydownCapture: (event: KeyboardEvent) => void;
  readonly onKeydown: (event: KeyboardEvent) => boolean;
} {
  const owned = new WeakSet<Event>();
  return {
    onKeydownCapture(event) {
      const target = event.target;
      if (
        event.key === "Escape" &&
        target instanceof Element &&
        target.getAttribute("role") === "combobox" &&
        target.getAttribute("aria-expanded") === "true"
      )
        owned.add(event);
    },
    onKeydown(event) {
      if (!owned.has(event)) return false;
      event.preventDefault();
      event.stopPropagation();
      return true;
    },
  };
}

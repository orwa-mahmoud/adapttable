import { nextCommandIndex } from "./commandListModel";

/** One semantic item in a flat native menu. @public */
export interface MenuNavigationItem {
  readonly label: string;
  readonly disabled?: boolean;
}

/** Keyboard state read without owning the browser event. @public */
export interface MenuNavigationKey {
  readonly key: string;
  readonly defaultPrevented?: boolean;
  readonly isComposing?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  readonly shiftKey?: boolean;
}

/** Native activation is deliberately left to the focused item. @public */
export type MenuNavigationAction =
  | { readonly kind: "close"; readonly key: "Escape" | "Tab" }
  | { readonly kind: "focus"; readonly index: number };

/** Adapter-facing flat-menu keyboard controller. @public */
export interface MenuNavigationController {
  readonly reset: () => void;
  readonly key: (
    event: MenuNavigationKey,
    items: readonly MenuNavigationItem[],
    focused: number,
    now?: number
  ) => MenuNavigationAction | undefined;
}

function prefixMatch(
  items: readonly MenuNavigationItem[],
  enabled: readonly number[],
  position: number,
  query: string,
  cycle: boolean
): number | undefined {
  const matches = (index: number | undefined) =>
    index !== undefined &&
    items[index]?.label.trim().toLocaleLowerCase().startsWith(query);
  // Extending a prefix must not jump away from an item that still matches it.
  if (!cycle && matches(enabled[position])) return enabled[position];
  for (let offset = 1; offset <= enabled.length; offset++) {
    const candidate = enabled[(position + offset) % enabled.length];
    if (matches(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Reuse wrapped command navigation while owning disabled-item prefix search.
 * Bindings apply returned focus; Tab closure must retain native traversal.
 * @public
 */
export function createMenuNavigation(): MenuNavigationController {
  let query = "";
  let typedAt = 0;
  const reset = () => {
    query = "";
    typedAt = 0;
  };
  return {
    reset,
    key(event, items, focused, now = Date.now()) {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === "Escape" || event.key === "Tab") {
        reset();
        return { kind: "close", key: event.key };
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const enabled = items.flatMap((item, index) =>
        item.disabled ? [] : [index]
      );
      if (!enabled.length) return;
      const position = enabled.indexOf(focused);
      const initial = position < 0 && event.key === "ArrowUp" ? 0 : position;
      const moved = nextCommandIndex(event.key, initial, enabled.length);
      if (moved !== undefined) {
        reset();
        return { kind: "focus", index: enabled[moved]! };
      }
      // Space/Enter activation stays with the real native button.
      if (event.key.length !== 1 || event.key === " ") return;
      const character = event.key.toLocaleLowerCase();
      query = (now - typedAt > 700 ? "" : query) + character;
      typedAt = now;
      const cycle = [...query].every((letter) => letter === character);
      const index = prefixMatch(
        items,
        enabled,
        position,
        cycle ? character : query,
        cycle
      );
      return index === undefined ? undefined : { kind: "focus", index };
    },
  };
}

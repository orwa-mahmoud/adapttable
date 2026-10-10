import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs, useElementRef } from "@adapttable/vue/adapter";
import { computed, onScopeDispose } from "vue";

/** Translate native contract names through Quasar's public component props. */
export function quasarAttrs(attrs: Attrs): Record<string, unknown> {
  const output = toVueAttrs(attrs);
  delete output.ref;
  for (const [native, quasar] of [
    ["disabled", "disable"],
    ["readOnly", "readonly"],
    ["tabIndex", "tabindex"],
  ] as const) {
    if (native in output) {
      output[quasar] = output[native];
      delete output[native];
    }
  }
  return output;
}

/** QField's `for` prop owns the native field id in SSR and client renders. */
export function quasarFieldAttrs(attrs: Attrs): Record<string, unknown> {
  const output = quasarAttrs(
    Object.fromEntries(
      Object.entries(attrs).filter(
        ([key]) => key !== "value" && key !== "onChange"
      )
    )
  );
  if ("id" in output) {
    output.for = output.id;
    delete output.id;
  }
  return output;
}

interface RefGroup<T extends HTMLElement> {
  readonly owners: readonly ElementRef<T>[];
  readonly callback: ElementRef<T>;
}

/** Project the kit's two optional ref channels onto the binding's one owner. */
export function useQuasarControlRef<T extends HTMLElement>(
  target: () => T | null,
  attrs: () => Attrs,
  focusRef: () => ElementRef<T> | undefined = () => undefined
): void {
  let active = true;
  onScopeDispose(() => {
    active = false;
  });
  // Keep this memo outside computed: Vue 3.5.0 does not supply the previous
  // computed value, so callback ownership must not depend on that argument.
  let previous: RefGroup<T> | undefined;
  const group = computed<RefGroup<T>>(() => {
    const attrRef = attrs().ref;
    const focus = focusRef();
    const owners = [
      ...new Set([
        ...(typeof attrRef === "function" ? [attrRef as ElementRef<T>] : []),
        ...(focus ? [focus] : []),
      ]),
    ];
    const current = previous;
    if (
      owners.length === current?.owners.length &&
      owners.every((owner, index) => owner === current.owners[index])
    )
      return current;
    const attached = new Set<ElementRef<T>>();
    const next: RefGroup<T> = {
      owners,
      callback: (element) => {
        if (element === null) {
          const retiring = [...attached];
          attached.clear();
          for (const owner of retiring) owner(null);
          return;
        }
        for (const owner of owners) {
          // An owner may synchronously dispose the control while receiving its
          // target. Never attach a later channel after that disposal.
          if (!active) return;
          attached.add(owner);
          owner(element);
        }
      },
    };
    previous = next;
    return next;
  });
  useElementRef(target, () => group.value.callback);
}

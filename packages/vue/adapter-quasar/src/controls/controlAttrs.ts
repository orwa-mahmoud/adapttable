import type { Attrs, ElementRef } from "@adapttable/vue";
import { toVueAttrs } from "@adapttable/vue/adapter";
import { onScopeDispose, watch } from "vue";

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

/** Deliver only actual DOM targets and release both old owners on replacement. */
export function useQuasarControlRef<T extends HTMLElement>(
  target: () => T | null,
  attrs: () => Attrs,
  focusRef: () => ElementRef<T> | undefined = () => undefined
): void {
  let release: () => void = () => undefined;
  watch(
    [target, () => attrs().ref, focusRef],
    ([element, attrRef, focus]) => {
      release();
      release = () => undefined;
      if (!element) return;
      const refs = new Set<ElementRef<T>>();
      if (typeof attrRef === "function") refs.add(attrRef as ElementRef<T>);
      if (focus) refs.add(focus);
      for (const ref of refs) ref(element);
      release = () => {
        for (const ref of refs) ref(null);
      };
    },
    { flush: "post" }
  );
  onScopeDispose(() => release());
}

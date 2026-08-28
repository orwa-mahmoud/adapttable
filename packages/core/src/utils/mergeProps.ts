import type { CSSProperties } from "react";

/**
 * Any props object a prop-getter can produce or accept for merging.
 *
 * Prop-getter plumbing: twelve public prop-getters name this in their
 * signatures, so it is part of the published surface whether or not a consumer
 * writes it. Reach for the prop-getters on `useDataTable` rather than this.
 *
 * @public
 */
export type Props = Record<string, unknown>;

function isEventHandler(
  key: string,
  value: unknown
): value is (...a: unknown[]) => void {
  return typeof value === "function" && /^on[A-Z]/.test(key);
}

/**
 * Merge a prop-getter's own props with caller overrides (the
 * Downshift/Radix pattern). Event handlers (`onX`) are composed so both
 * run; `className` strings are concatenated; `style` objects are merged.
 * Everything else is overridden by the caller's value.
 *
 * @param base - The prop-getter's own props.
 * @param overrides - Optional caller-supplied props to merge on top.
 * @returns The merged props object.
 *
 * Prop-getter plumbing: reach for the prop-getters on `useDataTable` rather
 * than merging by hand.
 *
 * @internal
 */
export function mergeProps<T extends Props>(base: T, overrides?: Props): T {
  if (!overrides) return base;
  const out: Props = { ...base };

  for (const [key, value] of Object.entries(overrides)) {
    const existing = out[key];
    if (isEventHandler(key, value) && isEventHandler(key, existing)) {
      out[key] = (...args: unknown[]) => {
        existing(...args);
        value(...args);
      };
    } else if (key === "className" && existing && value) {
      out[key] = `${existing as string} ${value as string}`;
    } else if (key === "style" && existing && value) {
      out[key] = {
        ...(existing as CSSProperties),
        ...(value as CSSProperties),
      };
    } else {
      out[key] = value;
    }
  }

  return out as T;
}

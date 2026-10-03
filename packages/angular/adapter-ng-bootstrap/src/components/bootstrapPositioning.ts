import type { Options } from "@popperjs/core";

/** Fixed native Popper positioning lets menus escape scrolling table cells. */
export const bootstrapPopperOptions = (
  options: Partial<Options>
): Partial<Options> => ({
  ...options,
  strategy: "fixed",
  // Keep coordinates viewport-relative on long, scrolled tables. Adaptive
  // bottom/right styles depend on the offset parent's height and can place a
  // fixed dropdown beyond the visible viewport.
  modifiers: [
    ...(options.modifiers ?? []),
    { name: "computeStyles", options: { adaptive: false } },
  ],
});

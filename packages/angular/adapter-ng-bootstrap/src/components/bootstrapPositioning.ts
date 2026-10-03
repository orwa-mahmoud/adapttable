import type { Options } from "@popperjs/core";

/** Fixed native Popper positioning lets menus escape scrolling table cells. */
export const bootstrapPopperOptions = (
  options: Partial<Options>
): Partial<Options> => ({
  ...options,
  strategy: "fixed",
});

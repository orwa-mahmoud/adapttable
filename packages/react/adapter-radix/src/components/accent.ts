/** The table's accent colour, for every Radix control inside it. */
import { createContext, useContext } from "react";

import type { RadixAccentColor } from "../types";

/** The accent the host chose with `accentColor`. */
export const AccentColor = /* @__PURE__ */ createContext<
  RadixAccentColor | undefined
>(undefined);

/** The table's accent colour, if the host chose one. */
export function useAccentColor(): RadixAccentColor | undefined {
  return useContext(AccentColor);
}

/** Every colour Radix Themes accepts. */
const RADIX_COLORS: ReadonlySet<string> = new Set<RadixAccentColor>([
  "gray",
  "gold",
  "bronze",
  "brown",
  "yellow",
  "amber",
  "orange",
  "tomato",
  "red",
  "ruby",
  "crimson",
  "pink",
  "plum",
  "purple",
  "violet",
  "iris",
  "indigo",
  "blue",
  "cyan",
  "teal",
  "jade",
  "green",
  "grass",
  "lime",
  "mint",
  "sky",
]);

function isRadixColor(color: string): color is RadixAccentColor {
  return RADIX_COLORS.has(color);
}

/** A host's colour name as Radix's, or nothing when Radix has no such colour. */
export function radixColor(
  color: string | undefined
): RadixAccentColor | undefined {
  return color !== undefined && isRadixColor(color) ? color : undefined;
}

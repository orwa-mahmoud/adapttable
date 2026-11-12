/** The table's accent colour, for every Chakra control inside it. */
import { createContext, useContext } from "react";

/** Chakra's colour palette the host chose with `accentColor`. */
export const AccentColor = /* @__PURE__ */ createContext<string | undefined>(
  undefined
);

/** The table's accent colour palette, if the host chose one. */
export function useAccentColor(): string | undefined {
  return useContext(AccentColor);
}

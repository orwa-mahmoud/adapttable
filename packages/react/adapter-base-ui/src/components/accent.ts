/** The table's accent colour, for every Base UI control inside it. */
import { createContext, useContext } from "react";

import type { BaseUiAccentColor } from "../types";

/** The accent the host chose with `accentColor`. */
export const AccentColor = /* @__PURE__ */ createContext<
  BaseUiAccentColor | undefined
>(undefined);

/** The table's accent colour, if the host chose one. */
export function useAccentColor(): BaseUiAccentColor | undefined {
  return useContext(AccentColor);
}

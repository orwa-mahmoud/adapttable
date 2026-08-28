import type { ColorScheme } from "../types";
import { useMediaQuery } from "./useMediaQuery";

/** The media query that matches when the OS prefers a dark color scheme. */
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

/**
 * Resolve a color-scheme preference to a concrete `"light"` or `"dark"`.
 * `"auto"` follows the OS via `prefers-color-scheme`; an explicit
 * preference is returned unchanged. Adapters map the result to their
 * theming (Mantine/MUI/Chakra color schemes, or a `data-theme` attribute
 * + CSS variables for the unstyled adapter).
 *
 * @param preference - `"light" | "dark" | "auto"`. Defaults to `"auto"`.
 * @returns The resolved scheme, `"light"` or `"dark"`.
 *
 * @public
 */
export function useColorScheme(
  preference: ColorScheme = "auto"
): "light" | "dark" {
  const prefersDark = useMediaQuery(DARK_SCHEME_QUERY);
  if (preference === "auto") return prefersDark ? "dark" : "light";
  return preference;
}

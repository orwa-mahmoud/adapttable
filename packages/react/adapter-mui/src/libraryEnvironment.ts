import { useTheme } from "@mui/material";

/**
 * MUI's app-wide direction.
 *
 * `theme.direction` is `'ltr'` on the default theme, including when no
 * `ThemeProvider` is mounted. That default is treated as unset so a
 * right-to-left page still reaches the table. A theme whose direction is
 * `'rtl'` is the library setting and wins over the page. MUI has no
 * app-wide locale, component size or motion switch for this table.
 */
export function useMuiLibrary(): { dir?: "rtl" } {
  const theme = useTheme();
  return { dir: theme.direction === "rtl" ? "rtl" : undefined };
}

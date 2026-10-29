import { createTheme, type Theme, ThemeProvider } from "@mui/material/styles";
import { type ReactNode, useCallback } from "react";

/**
 * Points every MUI portal under the table at the fullscreen element while the
 * table is fullscreen.
 *
 * The Fullscreen API hides the rest of the document, `document.body`
 * included, so a menu, popover, select or dialog portalled there would open
 * invisibly. MUI's Modal (behind Dialog, Drawer, Menu, Popover and Select) and
 * Popper (behind Tooltip and Autocomplete) read `container` from the theme's
 * default props, which reaches every overlay the table draws without each one
 * naming it.
 */
export function FullscreenPortals({
  container,
  children,
}: Readonly<{ container: HTMLElement | undefined; children: ReactNode }>) {
  const theme = useCallback(
    (outer: Theme): Theme => {
      if (!container) return outer;
      // With no ThemeProvider above the table MUI hands over an empty theme and
      // falls back to its default; a theme built on top of it must do the same.
      const base = Object.keys(outer).length > 0 ? outer : createTheme();
      return {
        ...base,
        components: {
          ...base.components,
          MuiModal: {
            ...base.components?.MuiModal,
            defaultProps: {
              ...base.components?.MuiModal?.defaultProps,
              container,
            },
          },
          MuiPopover: {
            ...base.components?.MuiPopover,
            defaultProps: {
              ...base.components?.MuiPopover?.defaultProps,
              container,
            },
          },
          MuiPopper: {
            ...base.components?.MuiPopper,
            defaultProps: {
              ...base.components?.MuiPopper?.defaultProps,
              container,
            },
          },
        },
      };
    },
    [container]
  );
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

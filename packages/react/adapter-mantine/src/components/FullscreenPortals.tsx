import { type MantineThemeOverride, MantineThemeProvider } from "@mantine/core";
import { type ReactNode, useMemo } from "react";

const NO_OVERRIDE: MantineThemeOverride = {};

/**
 * Points every Mantine portal under the table at the fullscreen element while
 * the table is fullscreen.
 *
 * The Fullscreen API hides the rest of the document, `document.body`
 * included, so a popover, menu, select or modal portalled there would open
 * invisibly. Mantine's `Portal` reads its target from the theme, which reaches
 * every overlay the table draws without each one naming it.
 */
export function FullscreenPortals({
  container,
  children,
}: Readonly<{ container: HTMLElement | undefined; children: ReactNode }>) {
  const theme = useMemo<MantineThemeOverride>(
    () =>
      container
        ? { components: { Portal: { defaultProps: { target: container } } } }
        : NO_OVERRIDE,
    [container]
  );
  return <MantineThemeProvider theme={theme}>{children}</MantineThemeProvider>;
}

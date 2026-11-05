import { createTheme, ThemeProvider } from "@mui/material";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

const theme = createTheme();

/** Render a component tree wrapped in a default MUI `ThemeProvider`. */
export function renderMui(ui: ReactElement): RenderResult {
  const view = render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
  return {
    ...view,
    rerender: (next) =>
      view.rerender(<ThemeProvider theme={theme}>{next}</ThemeProvider>),
  };
}

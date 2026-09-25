import { MantineProvider } from "@mantine/core";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/** Render a component tree wrapped in a default `MantineProvider`. */
export function renderMantine(ui: ReactElement): RenderResult {
  // `env="test"` is Mantine's own testing environment: it disables the
  // transitions and portals that never settle under jsdom, which is what
  // 9.5's floating-ui-based Combobox needs to mount its dropdown here.
  return render(<MantineProvider env="test">{ui}</MantineProvider>);
}

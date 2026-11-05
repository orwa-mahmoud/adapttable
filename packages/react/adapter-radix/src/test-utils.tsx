import { Theme } from "@radix-ui/themes";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Render a component tree wrapped in a Radix Themes `<Theme>` — the ambient
 * context every Radix Themes component (Table, Select, Popover, …) reads for
 * its tokens, accent, and radius. Mirrors Chakra's `renderChakra` helper.
 */
export function renderRadix(ui: ReactElement): RenderResult {
  const view = render(<Theme>{ui}</Theme>);
  return {
    ...view,
    rerender: (next) => view.rerender(<Theme>{next}</Theme>),
  };
}

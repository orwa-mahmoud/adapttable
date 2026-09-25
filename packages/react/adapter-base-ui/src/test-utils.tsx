import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { ensureBaseUiStyles } from "./injectStyles";

/**
 * Render a component tree for the Base UI adapter after injecting chrome CSS.
 */
export function renderBaseUi(ui: ReactElement): RenderResult {
  ensureBaseUiStyles();
  return render(ui);
}

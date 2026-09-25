import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/** Render a Bootstrap component tree. */
export function renderBootstrap(ui: ReactElement): RenderResult {
  return render(ui);
}

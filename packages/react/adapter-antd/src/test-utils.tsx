import { render, type RenderResult } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import type { ReactElement } from "react";

/** Render a component tree wrapped in antd's `ConfigProvider` + `App`. */
export function renderAntd(ui: ReactElement): RenderResult {
  return render(
    <ConfigProvider>
      <App>{ui}</App>
    </ConfigProvider>
  );
}

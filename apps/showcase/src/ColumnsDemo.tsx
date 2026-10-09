import { xlsxWriter } from "@adapttable/core/xlsx";
import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Columns, Keyboard, Pin, Resize } from "./sectionIcons";

const EXPORT_RANGE_AS_XLSX = {
  scope: "range",
  writer: xlsxWriter({ sheetName: "People" }),
  filename: "people.xlsx",
} as const;

export function ColumnsDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <span className="hint">
          <Pin size={12} /> Pin a column to the start
        </span>
        <span className="hint">
          <Resize size={12} /> drag a column edge to resize
        </span>
        <span className="hint">
          <Columns size={12} /> Columns menu reorders &amp; hides
        </span>
        <span className="hint">
          <Keyboard size={12} /> Shift+arrow selects a range to export
        </span>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="columns">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey="cols"
                wide
                // This page IS the column tools, so it says so rather than
                // inheriting the menu from whether the column set happens to be
                // wide — a coupling that left every kit but antd without one.
                columnMenu
                cellNavigation
                exportCsv={EXPORT_RANGE_AS_XLSX}
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

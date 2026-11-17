import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Nested } from "./sectionIcons";
import { NESTED_HINTS } from "./shared/pageHints";

/**
 * The nested-tables page: a real table under a row, not a blank panel.
 *
 * `renderRowDetail` is a slot. `nestedTable` is the same DataTable the page
 * already mounted, with its own columns and row keys, so a reader comparing
 * MUI X Pro master-detail or an ag-Grid detail grid lands on one URL.
 */
export function NestedTablesDemo({
  dark,
  adapter,
}: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {NESTED_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index === 0 ? <Nested size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="nested-tables">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey="nest"
                nested
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

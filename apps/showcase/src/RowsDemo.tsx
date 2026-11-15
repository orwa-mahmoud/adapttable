import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Pin } from "./sectionIcons";
import { ROWS_HINTS } from "./shared/pageHints";
import { ROWS_PAGE_HEIGHT } from "./shared/rowsScenario";

/**
 * The rows page: pin, merge, act. Movement lives on row-reordering.
 */
export function RowsDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {ROWS_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index === 0 ? <Pin size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="rows">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey="rows"
                maxHeight={ROWS_PAGE_HEIGHT}
                rowMutations
                rowPinning
                cellSpan
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

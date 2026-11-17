import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Layers } from "./sectionIcons";
import { SELECTION_HINTS } from "./shared/pageHints";

/**
 * The selection page: choosing rows, and doing something with them.
 *
 * Selection is half a feature on its own — what people search for is the pair,
 * "select rows and act on them in bulk". Bulk actions are what turn selection
 * on, so this page asks for them and nothing else competes for the toolbar.
 */
export function SelectionDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {SELECTION_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index === 1 ? <Layers size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="selection">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey="sel"
                bulkActions
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

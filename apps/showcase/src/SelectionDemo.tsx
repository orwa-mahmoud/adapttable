import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Layers } from "./sectionIcons";

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
        <span className="hint">
          <Check size={12} /> the header box takes the whole page
        </span>
        <span className="hint">
          <Layers size={12} /> selection survives paging — it is a set of ids
        </span>
        <span className="hint">
          <Check size={12} /> bulk actions run over the selection
        </span>
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

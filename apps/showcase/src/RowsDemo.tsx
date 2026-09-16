import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Pin } from "./sectionIcons";

/**
 * The rows page: pin, merge, act. Movement lives on row-reordering.
 */
export function RowsDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <span className="hint">
          <Pin size={12} /> pin a row to the top or the floor of the scroll box
        </span>
        <span className="hint">
          <Check size={12} /> Team is written once down consecutive teammates
        </span>
        <span className="hint">
          <Check size={12} /> the 3-dot menu is add, duplicate, delete, pin
        </span>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="rows">
              <Demo
                mode="frontend"
                locale="en"
                dark={dark}
                urlKey="rows"
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

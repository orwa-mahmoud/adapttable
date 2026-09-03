import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Pin } from "./sectionIcons";

/**
 * The rows page: pin, reorder, merge, act — the Pro row bundle, MIT.
 *
 * These are four props, not four pages. People search for each by name, and
 * MUI X / ag-Grid sell them separately; this page is the one place a kit
 * reader sees them working together without the Feature Lab's other knobs.
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
          <Check size={12} /> Space lifts, arrows move, Space drops
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
                rowReorder
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

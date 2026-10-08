/**
 * The table on an adapter's landing page.
 *
 * A working directory built from each kit's native features. Editing, history,
 * grouping, column tools and export can be tried together; the dedicated
 * feature pages remain one click away in the grid below this.
 */
import { Suspense, useState } from "react";

import { DemoScenarioProvider } from "../Demo";
import { ADAPTERS, DemoFallback } from "../kitDemos";
import type { FeatureBodyProps } from "./featureBodies";

export function LandingTable({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const [grouped, setGrouped] = useState(false);
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <div className="seg" role="group" aria-label="Row arrangement">
          <button
            type="button"
            className={`seg__btn${grouped ? "" : " is-on"}`}
            aria-pressed={!grouped}
            onClick={() => setGrouped(false)}
          >
            Flat
          </button>
          <button
            type="button"
            className={`seg__btn${grouped ? " is-on" : ""}`}
            aria-pressed={grouped}
            onClick={() => setGrouped(true)}
          >
            Grouped
          </button>
        </div>
      </div>
      <div className="mx-demo__body" data-adapter={adapter}>
        <Suspense fallback={<DemoFallback />}>
          <DemoScenarioProvider value="landing">
            <Demo
              mode="frontend"
              locale="en"
              dark={dark}
              urlKey="live"
              filterControls
              columnMenu
              bulkActions
              exportCsv
              editing
              cellNavigation
              undoRedoButtons
              densityChooser
              fullscreen
              statusBar
              grouping={grouped}
              summaryRow
            />
          </DemoScenarioProvider>
        </Suspense>
      </div>
    </div>
  );
}

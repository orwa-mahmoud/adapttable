/**
 * The table on an adapter's landing page.
 *
 * A working directory built from each kit's native features. Editing, history,
 * grouping, column tools and export can be tried together; the dedicated
 * feature pages remain one click away in the grid below this.
 */
import { Suspense, useState } from "react";

import { DemoScenarioProvider } from "../Demo";
import { initialDemoLocale } from "../demoPresentation";
import { ADAPTERS, DemoFallback } from "../kitDemos";
import {
  LANDING_ARRANGEMENTS,
  LANDING_URL_KEY,
  type LandingArrangement,
  landingArrangement,
} from "../shared/landingScenario";
import type { FeatureBodyProps } from "./featureBodies";

export function LandingTable({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const [arrangement, setArrangement] =
    useState<LandingArrangement>(landingArrangement);
  const grouped = arrangement === "grouped";
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <div className="seg" role="group" aria-label="Row arrangement">
          {LANDING_ARRANGEMENTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`seg__btn${arrangement === value ? " is-on" : ""}`}
              aria-pressed={arrangement === value}
              onClick={() => setArrangement(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-demo__body" data-adapter={adapter}>
        <Suspense fallback={<DemoFallback />}>
          <DemoScenarioProvider value="landing">
            <Demo
              mode="frontend"
              locale={initialDemoLocale()}
              dark={dark}
              urlKey={LANDING_URL_KEY}
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

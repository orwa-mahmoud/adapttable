import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { RealtimeBoundary } from "./realtimeFeed";
import { Bolt, Check } from "./sectionIcons";
import { REALTIME_HINTS } from "./shared/realtimeScenario";

/**
 * The realtime page: rows changing under the reader while they work.
 *
 * The updates arrive through the patch API rather than by replacing the array,
 * which is what keeps the patch log the incremental engine reads — only the
 * touched rows re-run search, filters and sort. The feed beside the table
 * lists what was applied, so the changes can be followed rather than spotted.
 */
export function RealtimeDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {REALTIME_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index === 0 ? <Bolt size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <RealtimeBoundary>
              <DemoScenarioProvider value="realtime">
                <Demo
                  mode="frontend"
                  locale={initialDemoLocale()}
                  dark={dark}
                  urlKey="rt"
                  realtime
                  density="compact"
                  focused
                />
              </DemoScenarioProvider>
            </RealtimeBoundary>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

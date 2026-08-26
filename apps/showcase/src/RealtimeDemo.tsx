import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { RealtimeBoundary } from "./realtimeFeed";
import { Bolt, Check } from "./sectionIcons";

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
        <span className="hint">
          <Bolt size={12} /> a patch sits between two people already in rows 2–6
        </span>
        <span className="hint">
          <Check size={12} /> same Budget sort the table is using — it stays on
          page 1
        </span>
        <span className="hint">
          <Check size={12} /> the feed names the row that just moved
        </span>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <RealtimeBoundary>
              <DemoScenarioProvider value="realtime">
                <Demo
                  mode="frontend"
                  locale="en"
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

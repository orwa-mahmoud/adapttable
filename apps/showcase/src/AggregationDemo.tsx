import { Suspense, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Pin } from "./sectionIcons";

/**
 * Totals that are not data rows: footer grand total, pinned summaries,
 * group aggregates, and a full-width extra. Filter the table and they
 * recompute from the remaining rows.
 */
export function AggregationDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [rtl, setRtl] = useState(false);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <span className="hint">
          <Pin size={12} /> pinned Team total / Grand total are not data rows
        </span>
        <span className="hint">
          <Check size={12} /> group footers close each team; the table footer is
          the grand total
        </span>
        <span className="hint">
          <Check size={12} /> filter the set and every total follows
        </span>
        <button
          type="button"
          className={`seg__btn${rtl ? " is-on" : ""}`}
          aria-pressed={rtl}
          onClick={() => setRtl((current) => !current)}
        >
          RTL
        </button>
      </div>
      <div className="mx-demo__body">
        <div key={`${adapter}-${rtl ? "rtl" : "ltr"}`} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="aggregation">
              <Demo
                mode="frontend"
                locale={rtl ? "ar" : "en"}
                dark={dark}
                urlKey="agg"
                grouping
                pinnedSummaryRows
                summaryRow
                extraRows
                filterControls
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

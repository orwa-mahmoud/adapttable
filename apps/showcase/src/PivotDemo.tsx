import { usePivotUrlState } from "@adapttable/core/pivot";
import { getLabels } from "@adapttable/i18n";
import { Suspense } from "react";

import { pivotRoster } from "./casts";
import { PIVOT_FIELDS } from "./data";
import { kitPivotPanel, KitProvider } from "./kitProviders";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { PivotTableView } from "./PivotTableView";

/** Where the demo starts: something already pivoted, so the page shows a pivot. */
const START = {
  rows: ["team"],
  columns: ["status"],
  measures: [{ key: "budget", agg: "sum" as const }],
};

/**
 * The pivot page: one dataset, the three zone cards above the table they
 * produce — in whichever kit the reader picks. Nothing else — the point of the
 * page is the shape of a pivot, not the rest of the table's features.
 */
export function PivotDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const { config, onConfigChange, collapsed, onCollapsedChange } =
    usePivotUrlState({
      defaultConfig: START,
    });
  const onToggleFold = (key: string) => {
    const next = new Set(collapsed);
    if (!next.delete(key)) next.add(key);
    onCollapsedChange(next);
  };
  const PivotPanel = kitPivotPanel(adapter);

  return (
    <div className="mx-demo">
      <KitProvider kit={adapter} dark={dark}>
        <div
          className="mx-demo__body pivot-layout"
          data-adapter={adapter}
          key={adapter}
        >
          <Suspense fallback={null}>
            <PivotPanel
              fields={PIVOT_FIELDS}
              config={config}
              onChange={onConfigChange}
              labels={getLabels("en")}
            />
          </Suspense>
          <PivotTableView
            kit={adapter}
            rows={pivotRoster()}
            fields={PIVOT_FIELDS}
            config={config}
            collapsed={collapsed}
            onToggleFold={onToggleFold}
          />
        </div>
      </KitProvider>
    </div>
  );
}

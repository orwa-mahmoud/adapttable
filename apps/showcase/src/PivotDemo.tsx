import { getLabels } from "@adapttable/i18n";
import { usePivotUrlState } from "@adapttable/react/pivot";
import { Suspense } from "react";

import { pivotRoster } from "./casts";
import { initialDemoDirection, initialDemoLocale } from "./demoPresentation";
import { kitPivotPanel, KitProvider } from "./kitProviders";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { PivotTableView } from "./PivotTableView";
import { PIVOT_FIELDS, PIVOT_START } from "./shared/pivotScenario";

/**
 * The pivot page: one dataset, the three zone cards above the table they
 * produce — in whichever kit the reader picks. Nothing else — the point of the
 * page is the shape of a pivot, not the rest of the table's features.
 */
export function PivotDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const { config, onConfigChange, collapsed, onCollapsedChange } =
    usePivotUrlState({
      defaultConfig: PIVOT_START,
    });
  const onToggleFold = (key: string) => {
    const next = new Set(collapsed);
    if (!next.delete(key)) next.add(key);
    onCollapsedChange(next);
  };
  const PivotPanel = kitPivotPanel(adapter);

  return (
    <div className="mx-demo" dir={initialDemoDirection()}>
      <KitProvider kit={adapter} dark={dark} dir={initialDemoDirection()}>
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
              labels={getLabels(initialDemoLocale())}
            />
          </Suspense>
          <PivotTableView
            kit={adapter}
            locale={initialDemoLocale()}
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

import { Suspense } from "react";

import { pageLayoutFor } from "./casts";
import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Columns } from "./sectionIcons";
import { COLUMN_GROUP_HINTS } from "./shared/pageHints";

export function ColumnGroupsDemo({
  dark,
  adapter,
}: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {COLUMN_GROUP_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index === 0 ? <Columns size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="column-groups">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey="cgrp"
                columnGroups
                defaultColumnLayout={pageLayoutFor("column-groups")}
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

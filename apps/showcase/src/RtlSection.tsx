import { Suspense } from "react";

import { layoutFor } from "./casts";
import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";

export function RtlSection({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="rtl">
              <Demo
                mode="frontend"
                locale="ar"
                dark={dark}
                urlKey="rtl"
                defaultColumnLayout={layoutFor("rtl")}
                // The filters popover is the point of this page: it has to anchor
                // and flip from the correct edge under RTL, which nothing can show
                // if `focused` strips the control that opens it.
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

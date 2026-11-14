import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Layers } from "./sectionIcons";
import { TREE_HINTS, TREE_URL_KEY } from "./shared/treeScenario";

/**
 * The tree page: hierarchy in a table, and nothing else.
 *
 * A tree grid is a different shape from a grouped table — the rows themselves
 * nest, rather than being collected under synthetic headers — and people search
 * for it by that name. The chevron, the indent and the keyboard path are each
 * kit's own, so the switcher is the subject rather than decoration.
 */
export function TreeDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {TREE_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index === 0 ? <Layers size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="tree">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey={TREE_URL_KEY}
                tree
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

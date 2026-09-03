import { Suspense } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Layers } from "./sectionIcons";

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
        <span className="hint">
          <Layers size={12} /> Maya Chen is the root — chevrons open a branch
        </span>
        <span className="hint">
          <Check size={12} /> arrow keys walk the tree, Enter toggles
        </span>
        <span className="hint">
          <Check size={12} /> expansion is carried in the URL
        </span>
        <span className="hint">
          <Check size={12} /> moving a child under a new parent is on
          row-reordering
        </span>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="tree">
              <Demo
                mode="frontend"
                locale="en"
                dark={dark}
                urlKey="tree"
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

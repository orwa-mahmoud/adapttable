import { Suspense, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Rows, Tree } from "./sectionIcons";

type Shape = "flat" | "grouped" | "tree";

/**
 * Dedicated movement page: flat, grouped and tree rows, pointer and keyboard,
 * confirm policy, host-owned writes. Pinning and spanning stay on Rows.
 */
export function RowReorderingDemo({
  dark,
  adapter,
}: Readonly<FeatureBodyProps>) {
  const [shape, setShape] = useState<Shape>("flat");
  const [rtl, setRtl] = useState(false);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <div className="seg" role="group" aria-label="Row shape">
          {(
            [
              ["flat", "Flat", Check],
              ["grouped", "Grouped", Rows],
              ["tree", "Tree", Tree],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={`seg__btn${shape === value ? " is-on" : ""}`}
              aria-pressed={shape === value}
              onClick={() => setShape(value)}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
        <span className="hint">
          <Check size={12} /> Space lifts, arrows move, Space drops
        </span>
        <span className="hint">
          <Check size={12} /> a drop opens the kit confirm menu
        </span>
        <span className="hint">
          <Check size={12} /> the host writes — the table never owns the array
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
        <div
          key={`${adapter}-${shape}-${rtl ? "rtl" : "ltr"}`}
          data-adapter={adapter}
        >
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="row-reordering">
              <Demo
                mode="frontend"
                locale={rtl ? "ar" : "en"}
                dark={dark}
                urlKey="reorder"
                rowReorder
                grouping={shape === "grouped"}
                tree={shape === "tree"}
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

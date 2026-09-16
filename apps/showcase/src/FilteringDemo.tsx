import { Suspense, useState } from "react";

import {
  AdvancedFiltersProvider,
  DemoScenarioProvider,
  type FiltersUi,
} from "./Demo";
import { DemoFilterSetProvider } from "./demoFilters";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Layers } from "./sectionIcons";

type FilterLayout = FiltersUi;
type FilterForm = "fields" | "advanced" | "both";

/**
 * The filtering page: every way this table narrows a set, and nothing else.
 *
 * Filters are the feature people arrive searching for by name, and they are
 * also the one most obviously kit-native — the popover, its inputs, the
 * AND/OR tree and the chips are each adapter's own components, so the kit
 * switcher is the point rather than decoration.
 */
export function FilteringDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [layout, setLayout] = useState<FilterLayout>("popover");
  const [form, setForm] = useState<FilterForm>("both");
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const advanced = form !== "fields";
  return (
    <div className="mx-demo" data-filter-form={form}>
      <div className="hint-row">
        <span className="hint">
          <Layers size={12} /> Filters opens the popover or drawer
        </span>
        <span className="hint">
          <Check size={12} /> Advanced sits at the top of that panel
        </span>
        <span className="hint">
          <Check size={12} /> Header icons filter one column; Filters keeps the
          tree
        </span>
        <span className="hint">
          <Check size={12} /> Find highlights cells and writes find= in the URL
          — it is not the filter tree
        </span>
        <div className="seg" role="group" aria-label="Filter layout">
          {(
            [
              ["popover", "Popover"],
              ["drawer", "Drawer"],
              ["header", "Header"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`seg__btn${layout === value ? " is-on" : ""}`}
              aria-pressed={layout === value}
              onClick={() => setLayout(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Filter form">
          {(
            [
              ["fields", "Fields"],
              ["advanced", "Advanced"],
              ["both", "Both"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`seg__btn${form === value ? " is-on" : ""}`}
              aria-pressed={form === value}
              onClick={() => setForm(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mx-demo__body">
        <div key={`${adapter}-${layout}-${form}`} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="filtering">
              <DemoFilterSetProvider value="kitchen">
                <AdvancedFiltersProvider value={advanced}>
                  <Demo
                    mode="frontend"
                    locale="en"
                    dark={dark}
                    urlKey="flt"
                    filterControls
                    filtersUi={layout === "header" ? "popover" : layout}
                    headerFilters={layout === "header" && form !== "advanced"}
                    filterFields={form !== "advanced"}
                    focused
                  />
                </AdvancedFiltersProvider>
              </DemoFilterSetProvider>
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

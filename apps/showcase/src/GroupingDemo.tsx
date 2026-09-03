import { xlsxWriter } from "@adapttable/core/xlsx";
import { Suspense, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Monitor, Phone } from "./sectionIcons";

/**
 * Export the grouped sheet, as a spreadsheet.
 *
 * `scope: "all"` takes every filtered row — not just the current page of
 * five — so collapsed groups and later pages still leave the file.
 * `xlsxWriter` writes Excel outline levels for each nest and bolds the
 * group headers and totals. The live demo on the home page stays CSV;
 * only this page opts into the encoder.
 */
const EXPORT_GROUPED_AS_XLSX = {
  scope: "all",
  writer: xlsxWriter({ sheetName: "People" }),
  filename: "people.xlsx",
} as const;

export function GroupingDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [mobile, setMobile] = useState(false);
  const [rtl, setRtl] = useState(false);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <div className="seg" role="group" aria-label="Grouping controls">
          <button
            type="button"
            className={`seg__btn${mobile ? "" : " is-on"}`}
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            <Monitor size={12} /> Drag + keyboard
          </button>
          <button
            type="button"
            className={`seg__btn${mobile ? " is-on" : ""}`}
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            <Phone size={12} /> Mobile selects
          </button>
          <button
            type="button"
            className={`seg__btn${rtl ? " is-on" : ""}`}
            aria-pressed={rtl}
            onClick={() => setRtl((current) => !current)}
          >
            RTL
          </button>
        </div>
        <span className="hint">
          <Check size={12} /> Drag a column header into the grouping strip
        </span>
        <span className="hint">
          <Check size={12} /> Focus a chip handle; arrow keys change its level
        </span>
        <span className="hint">
          <Check size={12} /> Override any value column’s aggregation — pinned
          totals live on aggregation, moves on row-reordering
        </span>
        <span className="hint">
          <Check size={12} /> Export writes the grouped sheet — outline + totals
        </span>
      </div>
      <div className="mx-demo__body">
        <div className={mobile ? "phone-frame" : undefined}>
          <div key={adapter} data-adapter={adapter}>
            <Suspense fallback={<DemoFallback />}>
              <DemoScenarioProvider value="grouping">
                <Demo
                  mode="frontend"
                  locale={rtl ? "ar" : "en"}
                  dark={dark}
                  urlKey="grp"
                  grouping
                  columnMenu
                  exportCsv={EXPORT_GROUPED_AS_XLSX}
                  forceMobile={mobile}
                  focused
                />
              </DemoScenarioProvider>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

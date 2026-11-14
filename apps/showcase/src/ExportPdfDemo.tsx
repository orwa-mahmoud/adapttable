import { Suspense, useEffect, useMemo, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, Control, DemoFallback, Segmented } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import type { Locale } from "./people";
import { Check, Layers } from "./sectionIcons";
import {
  EXPORT_MODES,
  exportGroups,
  type ExportMode,
  exportNavigatesCells,
  exportScenarioOptions,
  exportSelects,
  initialExportMode,
  loadArabicFont,
  printGroupedPeople,
  requestedExportScope,
} from "./shared/exportScenario";

/** The Arabic face, loaded the first time the page reads right to left. */
function useArabicFont(enabled: boolean): ArrayBuffer | undefined {
  const [font, setFont] = useState<ArrayBuffer>();
  useEffect(() => {
    if (!enabled || font) return;
    let live = true;
    loadArabicFont()
      .then((bytes) => {
        if (live) setFont(bytes);
      })
      .catch((error: unknown) => {
        console.error("the demo font did not load", error);
      });
    return () => {
      live = false;
    };
  }, [enabled, font]);
  return font;
}

export function ExportPdfDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [locale, setLocale] = useState<Locale>(initialDemoLocale);
  const [exportMode, setExportMode] = useState<ExportMode>(initialExportMode);
  const [scope] = useState(() => requestedExportScope() ?? "page");
  const font = useArabicFont(locale === "ar");
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;

  /**
   * `scope: "all"` takes every filtered row — not just the current page of
   * five — so collapsed groups and later pages still leave the file.
   * `pdfWriter` paginates on group boundaries and honours column widths.
   * Handing it `font` is the whole of what Arabic needs: the writer subsets
   * that file to the glyphs this sheet used and embeds the result.
   */
  const exportCsv = useMemo(
    () => exportScenarioOptions(exportMode, locale, font, scope),
    [exportMode, locale, font, scope]
  );

  return (
    <div className="mx-demo">
      <div
        className="hint-row"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span className="hint">
            <Layers size={12} /> grouped by team, then status
          </span>
          <span className="hint">
            <Check size={12} /> Export PDF writes the whole grouped sheet
          </span>
          <span className="hint">
            <Check size={12} />{" "}
            {locale === "ar"
              ? "Amiri embedded as a subset — shaped, right to left"
              : "Print is opt-in toolbar chrome — same view, browser dialog"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Control label="Export mode">
            <Segmented
              label="Export mode"
              value={exportMode}
              onChange={setExportMode}
              options={EXPORT_MODES}
            />
          </Control>
          <Control label="Language">
            <Segmented
              label="Language"
              value={locale}
              onChange={setLocale}
              options={[
                { value: "en", label: "English" },
                { value: "ar", label: "العربية" },
              ]}
            />
          </Control>
        </div>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="export">
              <Demo
                mode="frontend"
                locale={locale}
                dark={dark}
                urlKey="pdf"
                grouping={exportGroups(exportMode)}
                bulkActions={exportSelects(exportMode, scope)}
                cellNavigation={exportNavigatesCells(exportMode, scope)}
                exportCsv={exportCsv}
                onPrint={() => {
                  printGroupedPeople(locale, font);
                }}
                printButton
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

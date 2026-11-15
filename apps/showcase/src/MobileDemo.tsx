import { Suspense, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback, Segmented } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check } from "./sectionIcons";
import {
  forceMobileFor,
  MOBILE_BOUNDED_HEIGHT,
  MOBILE_CARDS,
  MOBILE_DATA_STATES,
  MOBILE_LAYOUTS,
  MOBILE_PAGING,
  MOBILE_START,
  MOBILE_TEXT,
  type MobileDataState,
  type MobileLayout,
  type MobilePaging,
} from "./shared/mobileScenario";

/**
 * The mobile-cards page: the SAME table, flipped between its desktop layout
 * and the automatic phone card layout with one prop. `forceMobile` drives the
 * flip so a desktop visitor sees the phone experience without resizing —
 * in real apps the switch happens by itself at the mobile breakpoint.
 *
 * Both pagination styles are demoed explicitly: infinite scroll (what
 * `paginationMode="auto"` picks on phones) and the classic pager.
 * A bounded list demonstrates the table's own keyboard-scrollable body.
 */
export function MobileDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [layout, setLayout] = useState<MobileLayout>(MOBILE_START.layout);
  const [paging, setPaging] = useState<MobilePaging>(MOBILE_START.paging);
  const [customCard, setCustomCard] = useState(MOBILE_START.customCard);
  const [bounded, setBounded] = useState(MOBILE_START.bounded);
  const [dataState, setDataState] = useState<MobileDataState>(
    MOBILE_START.dataState
  );
  const [log, setLog] = useState<string>(MOBILE_TEXT.waiting);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const phone = forceMobileFor(layout);
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <Segmented
          label={MOBILE_TEXT.layout}
          value={layout}
          onChange={setLayout}
          options={MOBILE_LAYOUTS.map((option) => ({ ...option }))}
        />
        <Segmented
          label={MOBILE_TEXT.paging}
          value={paging}
          onChange={setPaging}
          options={MOBILE_PAGING.map((option) => ({ ...option }))}
        />
        <Segmented
          label={MOBILE_TEXT.card}
          value={customCard ? "custom" : "builtin"}
          onChange={(next) => {
            setCustomCard(next === "custom");
          }}
          options={MOBILE_CARDS.map((option) => ({
            value: option.value ? "custom" : "builtin",
            label: option.label,
          }))}
        />
        <button
          type="button"
          className={`seg__btn${bounded ? " is-on" : ""}`}
          aria-pressed={bounded}
          onClick={() => {
            setBounded((value) => !value);
          }}
        >
          {MOBILE_TEXT.bounded}
        </button>
        <Segmented
          label={MOBILE_TEXT.data}
          value={dataState}
          onChange={setDataState}
          options={MOBILE_DATA_STATES.map((option) => ({ ...option }))}
        />
        <span className="hint">
          <Check size={12} /> {MOBILE_TEXT.hint}
        </span>
      </div>
      <div className="mx-demo__body">
        <div className={phone ? "phone-frame" : undefined}>
          <div key={adapter} data-adapter={adapter}>
            <Suspense fallback={<DemoFallback />}>
              <DemoScenarioProvider value="mobile">
                <Demo
                  focused
                  mode="frontend"
                  locale={initialDemoLocale()}
                  dark={dark}
                  urlKey="mob"
                  forceMobile={phone}
                  maxHeight={bounded ? MOBILE_BOUNDED_HEIGHT : undefined}
                  pageMode={paging}
                  customCard={customCard}
                  dataState={dataState}
                  onRowActivate={(row) => {
                    setLog(MOBILE_TEXT.activated(row.name));
                  }}
                  rowMode
                  editing
                  bulkActions
                  columnMenu={false}
                  filterControls={false}
                />
              </DemoScenarioProvider>
            </Suspense>
          </div>
        </div>
      </div>
      <p className="hint" role="status" data-demo-log>
        {log}
      </p>
    </div>
  );
}

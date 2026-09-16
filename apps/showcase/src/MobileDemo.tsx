import { Suspense, useState } from "react";

import { DemoScenarioProvider, type PageMode } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Monitor, Phone } from "./sectionIcons";

/**
 * The mobile-cards page: the SAME table, flipped between its desktop layout
 * and the automatic phone card layout with one prop. `forceMobile` drives the
 * flip so a desktop visitor sees the phone experience without resizing —
 * in real apps the switch happens by itself at the mobile breakpoint.
 *
 * Both pagination styles are demoed explicitly: infinite scroll (what
 * `paginationMode="auto"` picks on phones) and the classic pager.
 */
export function MobileDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const [phone, setPhone] = useState(true);
  const [pageMode, setPageMode] = useState<PageMode>("infinite");
  const [customCard, setCustomCard] = useState(false);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <div className="seg" role="group" aria-label="Layout">
          <button
            type="button"
            className={`seg__btn${phone ? " is-on" : ""}`}
            aria-pressed={phone}
            onClick={() => setPhone(true)}
          >
            <Phone size={12} /> Phone cards
          </button>
          <button
            type="button"
            className={`seg__btn${phone ? "" : " is-on"}`}
            aria-pressed={!phone}
            onClick={() => setPhone(false)}
          >
            <Monitor size={12} /> Desktop table
          </button>
        </div>
        <div className="seg" role="group" aria-label="Pagination">
          <button
            type="button"
            className={`seg__btn${pageMode === "infinite" ? " is-on" : ""}`}
            aria-pressed={pageMode === "infinite"}
            onClick={() => setPageMode("infinite")}
          >
            Infinite scroll
          </button>
          <button
            type="button"
            className={`seg__btn${pageMode === "paged" ? " is-on" : ""}`}
            aria-pressed={pageMode === "paged"}
            onClick={() => setPageMode("paged")}
          >
            Paged
          </button>
        </div>
        <div className="seg" role="group" aria-label="Card layout">
          <button
            type="button"
            className={`seg__btn${customCard ? "" : " is-on"}`}
            aria-pressed={!customCard}
            onClick={() => setCustomCard(false)}
          >
            Built-in card
          </button>
          <button
            type="button"
            className={`seg__btn${customCard ? " is-on" : ""}`}
            aria-pressed={customCard}
            onClick={() => setCustomCard(true)}
          >
            Custom card
          </button>
        </div>
        <span className="hint">
          <Check size={12} /> search and pagination stay identical
        </span>
      </div>
      <div className="mx-demo__body">
        <div className={phone ? "phone-frame" : undefined}>
          <div key={adapter} data-adapter={adapter}>
            <Suspense fallback={<DemoFallback />}>
              <DemoScenarioProvider value="mobile">
                <Demo
                  mode="frontend"
                  locale="en"
                  dark={dark}
                  urlKey="mob"
                  forceMobile={phone}
                  pageMode={pageMode}
                  customCard={customCard}
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

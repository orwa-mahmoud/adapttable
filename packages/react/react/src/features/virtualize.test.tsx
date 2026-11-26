import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FeatureProviders,
  FeatureSlot,
  useFeatureSlotFilled,
} from "./providers";
import { KEYED_WINDOW, type KeyedWindowSlotProps } from "./slotKeys";
import { applyTableFeatures, type TableFeature } from "./tableFeature";
import { virtualize } from "./virtualize";

/**
 * The window a kit that assembles its own body asks for.
 *
 * antd renders through its own table, so it cannot take `CHROME_BODY`; it asks
 * `KEYED_WINDOW` instead. Only `virtualize` fills it, which is what keeps
 * `@tanstack/react-virtual` out of a plain table's graph — so both answers
 * matter: the real window when the feature is composed, and every index when
 * it is not.
 */
const KEYS = ["a", "b", "c"];

function Asking() {
  const filled = useFeatureSlotFilled(KEYED_WINDOW);
  const props: KeyedWindowSlotProps = {
    keys: KEYS,
    enabled: false,
    estimateSize: 48,
    children: (window) => (
      <p data-testid="window" data-scroll={typeof window.scrollToIndex}>
        {filled ? "filled" : "empty"}:{window.indices.join(",")}:
        {String(window.paddingTop)}/{String(window.paddingBottom)}
      </p>
    ),
  };
  return filled ? (
    <FeatureSlot slot={KEYED_WINDOW} props={props} />
  ) : (
    props.children({
      enabled: false,
      indices: KEYS.map((_, index) => index),
      paddingTop: 0,
      paddingBottom: 0,
    })
  );
}

const mount = (features: readonly TableFeature[]) =>
  render(
    <FeatureProviders props={applyTableFeatures({ features })}>
      <Asking />
    </FeatureProviders>
  );

describe("virtualize fills the keyed window", () => {
  it("answers with a real window once the feature is composed", () => {
    mount([virtualize()]);
    // Windowing is off in this ask, so the real hook hands back every index —
    // what matters is that the hook, not the stand-in, produced it.
    expect(screen.getByTestId("window")).toHaveTextContent("filled:0,1,2:0/0");
    // …and the scroll a kit calls to bring an entry into it.
    expect(screen.getByTestId("window")).toHaveAttribute(
      "data-scroll",
      "function"
    );
  });

  it("leaves the slot empty without it, and the caller renders the lot", () => {
    mount([]);
    expect(screen.getByTestId("window")).toHaveTextContent("empty:0,1,2:0/0");
  });

  it("carries the windowing knobs the factory was given", () => {
    const feature = virtualize({
      estimateRowSize: 72,
      virtualizeColumns: true,
    });
    expect(applyTableFeatures({ features: [feature] })).toMatchObject({
      virtualize: true,
      estimateRowSize: 72,
      virtualizeColumns: true,
    });
    expect(applyTableFeatures({ features: [virtualize(false)] })).toMatchObject(
      {
        virtualize: false,
      }
    );
  });
});

/** Where the list starts on the page, and how far the page is scrolled. */
const LIST_TOP = 2000;
const SCROLLED = 2500;
const ENTRY = 50;

function PageList() {
  const root = useRef<HTMLDivElement | null>(null);
  const keys = Array.from({ length: 200 }, (_, index) => `k${String(index)}`);
  return (
    <div ref={root}>
      <FeatureSlot
        slot={KEYED_WINDOW}
        props={{
          keys,
          enabled: true,
          estimateSize: ENTRY,
          overscan: 0,
          listRoot: root,
          children: (window) => (
            <div data-adapttable-part="tbody" data-testid="list">
              {window.indices[0]}
            </div>
          ),
        }}
      />
    </div>
  );
}

describe("a page-scrolled keyed window", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.scrollY = 0;
  });

  it("measures where its list starts, so it covers the entries on screen", () => {
    window.scrollY = SCROLLED;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        const top =
          this.getAttribute("data-adapttable-part") === "tbody"
            ? LIST_TOP - window.scrollY
            : 0;
        return DOMRect.fromRect({ x: 0, y: top, width: 800, height: 0 });
      }
    );
    render(
      <FeatureProviders
        props={applyTableFeatures({ features: [virtualize()] })}
      >
        <PageList />
      </FeatureProviders>
    );
    // 500px into the list is entry 10; a window that thought the list began
    // at the top of the page would start at entry 50.
    expect(screen.getByTestId("list")).toHaveTextContent(
      String((SCROLLED - LIST_TOP) / ENTRY)
    );
  });
});

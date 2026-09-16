import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
      <p data-testid="window">
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

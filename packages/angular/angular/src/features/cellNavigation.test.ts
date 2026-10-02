import { describe, expect, it } from "vitest";

import { featureOptionsOf } from "../featureHost";
import { cellNavigation } from "./cellNavigation";

describe("cellNavigation feature", () => {
  it("turns cell navigation on", () => {
    expect(featureOptionsOf([cellNavigation()])).toMatchObject({
      cellNavigation: true,
    });
  });

  it("carries an onRangeChange listener into the patch", () => {
    const onRangeChange = (): void => undefined;
    expect(featureOptionsOf([cellNavigation({ onRangeChange })])).toMatchObject(
      {
        cellNavigation: true,
        onCellRangeChange: onRangeChange,
      }
    );
  });
});

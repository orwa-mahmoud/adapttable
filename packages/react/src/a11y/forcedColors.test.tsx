import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  ensureForcedColorsStyles,
  FORCED_COLORS_CSS,
  ForcedColorsStyle,
} from "./forcedColors";

const FORCED_COLORS_STYLE_ID = "adapttable-forced-colors";

const REQUIRED = [
  "@media (forced-colors: active)",
  "@media (prefers-contrast: more)",
  "[data-grid-cell]:focus",
  "outline: 2px solid Highlight",
  "box-shadow: none !important",
  "[data-cell-selected]",
  "[data-cell-match]",
  "[data-cell-match-current]",
  "[data-dirty]",
  '[aria-invalid="true"]',
  '[data-pinned="start"]',
  '[data-pinned="end"]',
  '[data-adapttable-part="find-bar"]',
  '[data-adapttable-part="command-list"]',
  '[data-adapttable-part="saved-views-panel"]',
  '[data-adapttable-part="side-panel-header"]',
];

afterEach(() => {
  document.getElementById(FORCED_COLORS_STYLE_ID)?.remove();
});

describe("FORCED_COLORS_CSS", () => {
  it("covers forced-colors, contrast, focus, and every non-color mark", () => {
    for (const snippet of REQUIRED) {
      expect(FORCED_COLORS_CSS, `missing ${snippet}`).toContain(snippet);
    }
  });
});

describe("ensureForcedColorsStyles", () => {
  it("injects the stylesheet once", () => {
    ensureForcedColorsStyles();
    ensureForcedColorsStyles();
    const nodes = document.querySelectorAll(`style#${FORCED_COLORS_STYLE_ID}`);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.textContent).toBe(FORCED_COLORS_CSS);
  });
});

describe("ForcedColorsStyle", () => {
  it("installs the stylesheet on mount", () => {
    const { unmount } = render(<ForcedColorsStyle />);
    expect(document.getElementById(FORCED_COLORS_STYLE_ID)).not.toBeNull();
    unmount();
    // The sheet is a document singleton — unmounting a table must not drop
    // it while another table on the page still needs it.
    expect(document.getElementById(FORCED_COLORS_STYLE_ID)).not.toBeNull();
  });
});

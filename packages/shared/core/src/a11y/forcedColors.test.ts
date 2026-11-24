import { afterEach, describe, expect, it, vi } from "vitest";

import {
  coreCellNavigation,
  coreDirtyIndicators,
  coreFindInTable,
} from "../features/coreFeatures";
import {
  EDIT_CONTRAST_RULES,
  FIND_CONTRAST_RULES,
  SELECTION_CONTRAST_RULES,
} from "./featureContrast";
import {
  BASE_CONTRAST_RULES,
  type ContrastRules,
  ensureForcedColorsStyles,
} from "./forcedColors";

const SHEET_ID = "adapttable-forced-colors";

function sheet(): HTMLElement | null {
  return document.getElementById(SHEET_ID);
}

afterEach(() => {
  sheet()?.remove();
});

describe("BASE_CONTRAST_RULES", () => {
  it("covers forced colours, contrast, focus, validation and pinned edges", () => {
    for (const snippet of [
      "@media (forced-colors: active)",
      "@media (prefers-contrast: more)",
      "[data-grid-cell]:focus",
      "outline: 2px solid Highlight !important",
      "box-shadow: none !important",
      '[aria-invalid="true"]',
      '[data-pinned="start"]',
      '[data-pinned="end"]',
      '[data-adapttable-part="table"]',
      ".adapttable-select-popup {",
    ]) {
      expect(BASE_CONTRAST_RULES.css, `missing ${snippet}`).toContain(snippet);
    }
  });
});

describe("ensureForcedColorsStyles", () => {
  it("injects one sheet with the base rules", () => {
    ensureForcedColorsStyles();
    ensureForcedColorsStyles();
    const nodes = document.querySelectorAll(`style#${SHEET_ID}`);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.textContent).toBe(BASE_CONTRAST_RULES.css);
  });

  it("adds each feature's rules once, in rank order", () => {
    ensureForcedColorsStyles([coreDirtyIndicators()]);
    ensureForcedColorsStyles([coreFindInTable(), coreCellNavigation()]);
    ensureForcedColorsStyles([coreDirtyIndicators(), coreFindInTable()]);
    expect(sheet()?.textContent).toBe(
      [
        SELECTION_CONTRAST_RULES,
        FIND_CONTRAST_RULES,
        EDIT_CONTRAST_RULES,
        BASE_CONTRAST_RULES,
      ]
        .map((block) => block.css)
        .join("\n\n")
    );
  });

  it("does not rewrite the sheet when nothing new arrives", () => {
    ensureForcedColorsStyles([coreFindInTable()]);
    const node = sheet();
    const text = node?.firstChild;
    ensureForcedColorsStyles([coreFindInTable(), {}]);
    expect(sheet()?.firstChild).toBe(text);
  });

  it("starts again when the sheet was removed", () => {
    ensureForcedColorsStyles([coreFindInTable()]);
    sheet()?.remove();
    ensureForcedColorsStyles();
    expect(sheet()?.textContent).toBe(BASE_CONTRAST_RULES.css);
  });

  it("keeps a host plugin's own block", () => {
    const own: ContrastRules = { rank: 5, css: ".audit-cell { outline: 0; }" };
    ensureForcedColorsStyles([{ contrast: own }]);
    expect(sheet()?.textContent).toBe(
      `${own.css}\n\n${BASE_CONTRAST_RULES.css}`
    );
  });
});

describe("ensureForcedColorsStyles without a document", () => {
  it("does nothing during server rendering", () => {
    vi.stubGlobal("document", undefined);
    try {
      expect(() => {
        ensureForcedColorsStyles([coreFindInTable()]);
      }).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

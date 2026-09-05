import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  adapterByKey,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const MANTINE = adapterByKey("mantine");
if (!MANTINE) throw new Error("mantine adapter missing");
const fill = (text) => fillTemplate(text, MANTINE);

const corePkg = JSON.parse(
  readFileSync(
    new URL("../packages/core/package.json", import.meta.url),
    "utf8"
  )
);
const mantinePkg = JSON.parse(
  readFileSync(
    new URL("../packages/adapter-mantine/package.json", import.meta.url),
    "utf8"
  )
);

describe("v3 showcase snippets compile", () => {
  it("row-reordering imports published factories", () => {
    const snippet = fill(featureBySlug("row-reordering").snippet);
    assert.match(snippet, /from "@adapttable\/react"/);
    assert.match(snippet, /applyRowReorder/);
    assert.match(snippet, /from "@adapttable\/mantine\/row-reorder"/);
    assert.match(snippet, /rowReorder/);
    assert.match(snippet, /movePolicy: "confirm"/);
    assert.ok(corePkg.exports["."]);
    assert.ok(mantinePkg.exports["./row-reorder"]);
    assert.match(
      readFileSync(`${ROOT}/packages/react/src/index.ts`, "utf8"),
      /applyRowReorder/
    );
    assert.match(
      readFileSync(
        `${ROOT}/packages/adapter-mantine/src/row-reorder.tsx`,
        "utf8"
      ),
      /export const rowReorder/
    );
  });

  it("aggregation imports published factories", () => {
    const snippet = fill(featureBySlug("aggregation").snippet);
    assert.match(snippet, /from "@adapttable\/core"/);
    assert.match(snippet, /aggregate/);
    assert.match(snippet, /from "@adapttable\/mantine\/grouping-panel"/);
    assert.match(snippet, /from "@adapttable\/mantine\/pinned-summary-rows"/);
    assert.match(snippet, /summaryRow=\{budgetSum\}/);
    assert.ok(mantinePkg.exports["./grouping-panel"]);
    assert.ok(mantinePkg.exports["./pinned-summary-rows"]);
    assert.match(
      readFileSync(`${ROOT}/packages/core/src/index.ts`, "utf8"),
      /aggregate/
    );
    assert.match(
      readFileSync(
        `${ROOT}/packages/adapter-mantine/src/grouping-panel.tsx`,
        "utf8"
      ),
      /export const groupingPanel/
    );
    assert.match(
      readFileSync(
        `${ROOT}/packages/adapter-mantine/src/pinned-summary-rows.ts`,
        "utf8"
      ),
      /export \{ pinnedSummaryRows \}/
    );
  });

  it("ai imports published session factories", () => {
    const snippet = fill(featureBySlug("ai").snippet);
    assert.match(snippet, /from "@adapttable\/ai\/react"/);
    assert.match(snippet, /tableAgent/);
    assert.match(snippet, /from "@adapttable\/mantine"/);
    assert.match(snippet, /agentApproval/);
    assert.match(snippet, /from "@adapttable\/mantine\/filters"/);
    assert.match(snippet, /from "@adapttable\/mantine\/editing"/);
    assert.ok(mantinePkg.exports["./filters"]);
    assert.ok(mantinePkg.exports["./editing"]);
  });
});

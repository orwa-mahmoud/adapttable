import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PAGE = readFileSync(
  join(ROOT, "apps/docs/src/pages/index.astro"),
  "utf8"
);

const TITLE = "AdaptTable — Headless React Data Table for Any UI Kit";

describe("landing page demo funnel", () => {
  it("keeps the ranked title and install plus demo above the fold", () => {
    assert.match(PAGE, new RegExp(`const TITLE = "${TITLE}"`));
    const heroAt = PAGE.indexOf('id="overview"');
    const tourAt = PAGE.indexOf('id="tour"');
    assert.ok(heroAt > 0 && tourAt > heroAt, "the tour follows the hero");
    const hero = PAGE.slice(heroAt, tourAt);
    assert.ok(
      hero.includes("npx @adapttable/cli init"),
      "install must sit in the hero"
    );
    assert.ok(
      hero.includes("Try the live demo"),
      "demo CTA must sit in the hero"
    );
  });

  it("turns every pressable box into a real destination", () => {
    assert.equal(PAGE.includes('<article class="card"'), false);
    assert.equal(PAGE.includes('class="mock__btn"'), false);
    assert.match(PAGE, /<a class="card" href=\{f\.href\}/);
    assert.match(PAGE, /<a class="hero__chip" href=\{kit\.href\}/);
    assert.match(
      PAGE,
      /<a href=\{`\$\{siteUrl\(demoRoute\(\)\)\}`\}>open the live demo<\/a>/
    );
    for (const href of [
      'siteUrl(demoRoute("mantine"))',
      'siteUrl(demoRoute("mui"))',
      'siteUrl(demoRoute("chakra"))',
      'siteUrl(demoRoute("antd"))',
      'siteUrl(demoRoute("radix"))',
      'siteUrl(demoRoute("base-ui"))',
      'siteUrl(demoRoute("shadcn"))',
      'siteUrl(demoRoute("tailwind"))',
      'siteUrl(demoRoute("mantine/filtering"))',
      'siteUrl(docsRoute("data-tiers"))',
      'siteUrl(docsRoute("url-state"))',
      'siteUrl(demoRoute("mantine/scale"))',
      'siteUrl(demoRoute("mantine/rtl"))',
      'siteUrl(demoRoute("mantine/columns"))',
      'siteUrl(demoRoute("mantine/selection"))',
      'siteUrl(demoRoute("mantine/accessibility"))',
    ]) {
      assert.ok(PAGE.includes(href), `missing ${href}`);
    }
  });

  it("does not dress the spectrum as buttons", () => {
    assert.match(PAGE, /\.spcard \{[\s\S]*?border: none;/);
    assert.equal(/\.spcard:hover/.test(PAGE), false);
  });
});

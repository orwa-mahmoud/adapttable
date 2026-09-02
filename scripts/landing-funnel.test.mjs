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
    const hero = PAGE.slice(
      PAGE.indexOf('id="overview"'),
      PAGE.indexOf('id="features"')
    );
    const installAt = hero.indexOf("npx @adapttable/cli init");
    const demoAt = hero.indexOf("Try the live demo");
    const mockAt = hero.indexOf('class="mock-link');
    assert.ok(installAt > 0 && demoAt > 0 && mockAt > 0);
    assert.ok(installAt < mockAt, "install must sit above the mock");
    assert.ok(demoAt < mockAt, "demo CTA must sit above the mock");
  });

  it("turns every pressable box into a real destination", () => {
    assert.equal(PAGE.includes('<article class="card"'), false);
    assert.equal(PAGE.includes('class="mock__btn"'), false);
    assert.match(PAGE, /<a class="card" href=\{f\.href\}/);
    assert.match(PAGE, /<a class="hero__chip" href=\{kit\.href\}/);
    assert.match(
      PAGE,
      /<a class="mock-link reveal" href=\{`\$\{SITE\}\/demo\/`\}/
    );
    for (const href of [
      "${SITE}/demo/mantine/",
      "${SITE}/demo/mui/",
      "${SITE}/demo/chakra/",
      "${SITE}/demo/antd/",
      "${SITE}/demo/radix/",
      "${SITE}/demo/base-ui/",
      "${SITE}/demo/shadcn/",
      "${SITE}/demo/tailwind/",
      "${SITE}/demo/mantine/filtering/",
      "${SITE}/data-tiers/",
      "${SITE}/url-state/",
      "${SITE}/demo/mantine/scale/",
      "${SITE}/demo/mantine/rtl/",
      "${SITE}/demo/mantine/columns/",
      "${SITE}/demo/mantine/selection/",
      "${SITE}/demo/mantine/accessibility/",
    ]) {
      assert.ok(PAGE.includes(href), `missing ${href}`);
    }
  });

  it("does not dress the spectrum as buttons", () => {
    assert.match(PAGE, /\.spcard \{[\s\S]*?border: none;/);
    assert.equal(/\.spcard:hover/.test(PAGE), false);
  });
});

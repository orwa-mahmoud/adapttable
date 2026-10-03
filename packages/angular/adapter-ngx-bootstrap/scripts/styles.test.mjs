import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postcss from "postcss";

const root = new URL("../", import.meta.url);
const css = postcss.parse(await readFile(new URL("styles.css", root), "utf8"));

test("every Bootstrap selector stays inside its kit boundary", () => {
  let rules = 0;
  css.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/u.test(rule.parent.name))
      return;
    rules++;
    for (const selector of rule.selectors) {
      assert.match(
        selector,
        /^\.adapttable-ngx-bootstrap(?:[\s.:#\[]|$)/u,
        selector
      );
    }
  });
  assert.ok(
    rules > 200,
    "check compiled Bootstrap, not a substitute stylesheet"
  );
});

test("global keyframe names are unique to this adapter", () => {
  css.walkAtRules(/keyframes$/u, (rule) =>
    assert.match(rule.params, /^adapttable-ngx-bootstrap-/u)
  );
});

test("base variables apply to both themes and dark overrides stay on the host", () => {
  const roots = css.nodes.filter(
    (node) =>
      node.type === "rule" &&
      node.selectors.includes(".adapttable-ngx-bootstrap")
  );
  assert.ok(
    roots.some((rule) =>
      rule.nodes.some((node) => node.prop === "--bs-body-font-family")
    )
  );
  let dark = false;
  css.walkRules((rule) => {
    if (rule.selector === '.adapttable-ngx-bootstrap[data-bs-theme="dark"]') {
      dark ||= rule.nodes.some((node) => node.prop === "--bs-body-bg");
    }
  });
  assert.ok(dark);
});

test("Bootstrap attribution and reproducible source version are retained", async () => {
  const license = await readFile(new URL("BOOTSTRAP-LICENSE", root), "utf8");
  assert.match(license, /The MIT License/u);
  assert.match(license, /Bootstrap Authors/u);
  const manifest = JSON.parse(
    await readFile(new URL("package.json", root), "utf8")
  );
  assert.equal(manifest.devDependencies.bootstrap, "5.3.8");
  assert.equal(manifest.exports["./styles.css"], "./styles.css");
});

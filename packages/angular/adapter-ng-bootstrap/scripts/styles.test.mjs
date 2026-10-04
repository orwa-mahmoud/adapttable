import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import postcss from "postcss";

import { consolidateBootstrapRules } from "../../../../scripts/bootstrap-styles.mjs";
import manifest from "../package.json" with { type: "json" };

const root = new URL("../", import.meta.url);
const css = postcss.parse(await readFile(new URL("styles.css", root), "utf8"));

await test("every Bootstrap selector stays inside its kit boundary", () => {
  let rules = 0;
  css.walkRules((rule) => {
    if (
      rule.parent?.type === "atrule" &&
      rule.parent.name.endsWith("keyframes")
    )
      return;
    rules++;
    for (const selector of rule.selectors) {
      assert.match(
        selector,
        /^\.adapttable-ng-bootstrap(?:[\s.:#[]|$)/u,
        selector
      );
    }
  });
  assert.ok(
    rules > 200,
    "check compiled Bootstrap, not a substitute stylesheet"
  );
});

await test("global keyframe names are unique to this adapter", () => {
  css.walkAtRules(/keyframes$/u, (rule) =>
    assert.match(rule.params, /^adapttable-ng-bootstrap-/u)
  );
});

await test("base variables apply to both themes and dark overrides stay on the host", () => {
  const roots = css.nodes.filter((node) => node.type === "rule");
  assert.ok(
    roots.some(
      (rule) =>
        rule.selectors.includes(".adapttable-ng-bootstrap") &&
        rule.nodes.some(
          (node) =>
            node.type === "decl" && node.prop === "--bs-body-font-family"
        )
    )
  );
  let dark = false;
  css.walkRules((rule) => {
    if (rule.selector === '.adapttable-ng-bootstrap[data-bs-theme="dark"]') {
      dark ||= rule.nodes.some(
        (node) => node.type === "decl" && node.prop === "--bs-body-bg"
      );
    }
  });
  assert.ok(dark);
});

await test("Bootstrap attribution and reproducible source version are retained", async () => {
  const license = await readFile(new URL("BOOTSTRAP-LICENSE", root), "utf8");
  assert.match(license, /The MIT License/u);
  assert.match(license, /Bootstrap Authors/u);
  assert.equal(manifest.devDependencies.bootstrap, "5.3.8");
  assert.equal(manifest.exports["./styles.css"], "./styles.css");
});

await test("scoped Bootstrap retains native declarations without exact duplicate overrides", () => {
  css.walkRules((rule) => {
    /** @type {Map<string, import("postcss").Declaration>} */
    const previous = new Map();
    rule.walkDecls((decl) => {
      const preceding = previous.get(decl.prop);
      assert.ok(
        preceding?.value !== decl.value ||
          preceding.important !== decl.important,
        `${rule.selector}: repeated ${decl.prop}: ${decl.value}`
      );
      previous.set(decl.prop, decl);
    });
  });
});

await test("generated selectors have one rule in each conditional context", () => {
  /** @type {WeakMap<import("postcss").Container, Set<string>>} */
  const contexts = new WeakMap();
  css.walkRules((rule) => {
    assert.ok(rule.parent);
    let selectors = contexts.get(rule.parent);
    if (!selectors) {
      selectors = new Set();
      contexts.set(rule.parent, selectors);
    }
    assert.ok(!selectors.has(rule.selector), rule.selector);
    selectors.add(rule.selector);
  });
});

await test("rule consolidation preserves priority, conditional themes and native variants", () => {
  const sample = postcss.parse(`
    .kit .btn { display: inline-block; color: var(--button-color); }
    .kit .btn-primary { --button-color: blue; }
    .kit .btn { display: inline-flex; gap: .3rem; }
    .kit { color: black !important; }
    .kit { color: white; margin: 0; }
    @media (max-width: 575px) { .kit .btn { display: block; } }
    /* rtl:raw: .disabled-code { direction: ltr; } */
  `);
  consolidateBootstrapRules(sample);
  /** @param {string} selector @param {string} property */
  const declaration = (selector, property) => {
    const rule = sample.nodes.find(
      (node) => node.type === "rule" && node.selector === selector
    );
    assert.ok(rule?.type === "rule");
    const node = rule.nodes.find(
      (node) => node.type === "decl" && node.prop === property
    );
    assert.ok(node?.type === "decl");
    return node;
  };
  assert.equal(declaration(".kit .btn", "display").value, "inline-flex");
  assert.equal(declaration(".kit .btn", "color").value, "var(--button-color)");
  assert.equal(declaration(".kit .btn", "gap").value, ".3rem");
  assert.equal(declaration(".kit", "color").value, "black");
  assert.equal(declaration(".kit", "color").important, true);
  assert.equal(declaration(".kit", "margin").value, "0");
  assert.equal(
    declaration(".kit .btn-primary", "--button-color").value,
    "blue"
  );
  const media = sample.nodes.find((node) => node.type === "atrule");
  assert.ok(media?.type === "atrule");
  assert.ok(media.nodes);
  const conditional = media.nodes[0];
  assert.ok(conditional?.type === "rule");
  const display = conditional.nodes[0];
  assert.ok(display?.type === "decl");
  assert.equal(display.value, "block");
  assert.ok(!sample.toString().includes("disabled-code"));
});

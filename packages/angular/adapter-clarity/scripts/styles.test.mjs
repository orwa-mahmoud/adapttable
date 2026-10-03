import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
test("Clarity CSS excludes embedded fonts and source maps", () => {
  assert.doesNotMatch(
    css,
    /@font-face|sourceMappingURL|data:font|data:application\/font/u
  );
  assert.match(css, /Clarity 18\.3\.0/u);
});
test("Clarity CSS scopes selectors and namespaces animations", () => {
  assert.match(css, /\.adapttable-clarity/u);
  assert.doesNotMatch(css, /(?:^|\n)\s*(?:html|body|:root|:host)\s*[{,]/u);
  const animations = [...css.matchAll(/@(?:-webkit-)?keyframes\s+([^\s{]+)/gu)];
  assert.ok(animations.length > 0);
  for (const [, name] of animations)
    assert.ok(name.startsWith("adapttable-clarity-"));
});
test("Scoped controls retain visible focus, disabled and RTL-friendly layout", () => {
  assert.match(css, /:focus-visible/u);
  assert.match(css, /\.btn\[disabled\]/u);
  assert.match(css, /padding-inline|margin-inline|inline-size/u);
});

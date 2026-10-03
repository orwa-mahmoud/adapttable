import assert from "node:assert/strict";
import { it } from "node:test";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";
import { angularModePage } from "./build-showcase-html.mjs";

for (const lab of [false, true]) {
  it(`registers and generates the Angular ${lab ? "lab" : "main"} mode`, () => {
    const page = angularModePage(lab);
    const registered = SHOWCASE_PAGES.find(
      (item) => item.html === `./${page.dir}/index.html`
    );
    assert.equal(
      registered?.route,
      `/angular/demo/${lab ? "all-options/" : ""}`
    );
    assert.equal(registered?.framework, "angular");
    assert.equal(registered?.indexable, true);
    assert.ok(
      page.html.includes(`data-angular-mode="${lab ? "lab" : "live"}"`)
    );
    assert.ok(page.html.includes("../src/angular/entry-demo.ts"));
    assert.ok(!page.html.includes("entry-all-options.tsx"));
  });
}

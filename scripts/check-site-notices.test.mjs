import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { it } from "node:test";

import { checkSiteNotices } from "./check-site-notices.mjs";
import { NOTICE_JSON, NOTICE_TEXT, renderNotices } from "./site-notices.mjs";

it("requires complete notices in docs and both composed demo roots", () => {
  const root = mkdtempSync(join(tmpdir(), "adapttable-site-notices-"));
  const packages = [
    {
      name: "example",
      version: "1.0.0",
      license: "MIT",
      files: [
        {
          name: "LICENSE",
          text: readFileSync(new URL("../LICENSE", import.meta.url), "utf8"),
        },
      ],
    },
  ];
  try {
    for (const dir of [
      root,
      join(root, "react/demo"),
      join(root, "angular/demo"),
    ]) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "app.js"), "example");
      writeFileSync(
        join(dir, NOTICE_JSON),
        JSON.stringify({ schemaVersion: 1, assets: ["app.js"], packages })
      );
      writeFileSync(join(dir, NOTICE_TEXT), renderNotices(packages));
    }
    assert.equal(checkSiteNotices(root).length, 3);
    rmSync(join(root, "angular/demo", NOTICE_TEXT));
    assert.throws(() => checkSiteNotices(root), /ENOENT/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("wires notice generation and checking into the existing site pipeline", () => {
  const source = (path) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.match(source("apps/showcase/vite.config.ts"), /siteNotices\(\)/);
  assert.match(source("apps/docs/astro.config.mjs"), /siteNotices\(/);
  assert.match(source(".github/workflows/site.yml"), /pnpm check:site-notices/);
  assert.match(
    source("apps/showcase/src/sections.tsx"),
    /third-party-notices\.txt/
  );
  assert.match(
    source("apps/showcase/src/angular/matrixPage.html"),
    /third-party-notices\.txt/
  );
  assert.match(
    source("apps/docs/src/components/NoticesFooter.astro"),
    /third-party-notices\.txt/
  );
});

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SHOWCASE_ADAPTERS } from "../apps/showcase/matrix.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE = "https://orwa-mahmoud.github.io/adapttable";
const HUB = `${SITE}/demo/`;
const HUB_PACKAGES = new Set([
  "@adapttable/core",
  "@adapttable/react",
  "@adapttable/i18n",
  "@adapttable/cli",
  "@adapttable/server",
  "@adapttable/ai",
  "@adapttable/ai-react",
]);
const REPOSITORY = "git+https://github.com/orwa-mahmoud/adapttable.git";
const BUGS = "https://github.com/orwa-mahmoud/adapttable/issues";

function json(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function publishedManifests() {
  return readdirSync(join(ROOT, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(ROOT, "packages", entry.name, "package.json"))
    .filter(existsSync)
    .map((path) => ({ path, pkg: json(path) }))
    .filter(({ pkg }) => pkg.private !== true);
}

describe("published package homepages", () => {
  const published = publishedManifests();
  const kitByPkg = new Map(
    SHOWCASE_ADAPTERS.filter((kit) => kit.built).map((kit) => [
      kit.pkg,
      kit.key,
    ])
  );

  it("points every published package at its demo landing", () => {
    assert.ok(published.some(({ pkg }) => pkg.name === "@adapttable/ai"));
    for (const { path, pkg } of published) {
      const kit = kitByPkg.get(pkg.name);
      const expected = kit ? `${SITE}/demo/${kit}/` : HUB;
      if (!kit) {
        assert.ok(
          HUB_PACKAGES.has(pkg.name),
          `${pkg.name} is published but is neither a showcase kit nor a hub package`
        );
      }
      assert.equal(pkg.homepage, expected, path);
    }
  });

  it("leaves repository and bugs on the GitHub project", () => {
    for (const { path, pkg } of published) {
      assert.equal(pkg.repository?.url, REPOSITORY, path);
      assert.equal(pkg.bugs, BUGS, path);
    }
  });
});

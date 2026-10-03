import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import {
  checkNotices,
  collectNotices,
  hasLicenseText,
  installedPackage,
  NOTICE_JSON,
  NOTICE_TEXT,
  packageForModule,
  readPackageNotice,
  renderNotices,
  siteNotices,
} from "./site-notices.mjs";

const temps = [];
const MIT = readFileSync(new URL("../LICENSE", import.meta.url), "utf8").trim();
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "adapttable-notices-"));
  temps.push(root);
  return root;
}
function write(root, path, text) {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
}
function pkg(root, name = "example", version = "1.0.0") {
  const directory = join(root, "node_modules", name);
  write(
    directory,
    "package.json",
    JSON.stringify({ name, version, license: "MIT" })
  );
  write(directory, "LICENSE", MIT);
  return { directory, data: { name, version, license: "MIT" } };
}
const bundleFor = (...ids) => ({
  "assets/app.js": { type: "chunk", moduleIds: ids },
});
after(() => {
  for (const root of temps) rmSync(root, { recursive: true, force: true });
});

describe("website license notices", () => {
  it("reads complete license, NOTICE and copyright texts", () => {
    const item = pkg(fixture());
    write(item.directory, "NOTICE", "Upstream attribution");
    write(item.directory, "CopyrightNotice.txt", "Additional copyright");
    const notice = readPackageNotice(item);
    assert.equal(notice.files.length, 3);
    assert.ok(renderNotices([notice]).includes(MIT));
    assert.ok(renderNotices([notice]).includes("Upstream attribution"));
  });
  it("retains nested supplier license directories", () => {
    const item = pkg(fixture());
    rmSync(join(item.directory, "LICENSE"));
    write(item.directory, "LICENSE/LICENSE", MIT);
    write(item.directory, "LICENSE/LICENSE-helper", MIT);
    assert.equal(readPackageNotice(item).files.length, 2);
  });
  it("rejects an unreviewed prebundled UI version even if it has its own license", () => {
    const item = pkg(fixture(), "@pagefind/default-ui", "99.0.0");
    assert.throws(
      () => readPackageNotice(item, fixture()),
      /review prebundled dependency notices/
    );
  });
  it("refuses an empty browser inventory", () => {
    assert.throws(
      () => siteNotices().generateBundle.call({}, {}, {}),
      /no package inventory/
    );
  });
  it("resolves nested module-type manifests, queries and scoped packages", () => {
    const item = pkg(fixture(), "@vendor/kit");
    write(item.directory, "esm/package.json", '{"type":"module"}');
    assert.equal(
      packageForModule(join(item.directory, "esm/index.js") + "?commonjs-proxy")
        .data.name,
      "@vendor/kit"
    );
    assert.equal(packageForModule("\0virtual"), undefined);
    assert.equal(packageForModule("node:fs"), undefined);
  });
  it("includes only represented packages, deterministically and once", () => {
    const root = fixture(),
      a = pkg(root, "a"),
      z = pkg(root, "z");
    pkg(root, "unused");
    const aId = join(a.directory, "index.js"),
      zId = join(z.directory, "index.js");
    assert.deepEqual(
      collectNotices(bundleFor(zId, aId, aId)).map((p) => p.name),
      ["a", "z"]
    );
  });
  it("does not mistake identifiers or license URLs for full terms", () => {
    assert.equal(hasLicenseText("MIT", "MIT"), false);
    assert.equal(
      hasLicenseText(
        "License: https://opensource.org/license/mit".repeat(10),
        "MIT"
      ),
      false
    );
    assert.equal(hasLicenseText(MIT, "MIT"), true);
  });
  it("fails closed when an upstream package omits full terms", () => {
    const item = pkg(fixture());
    rmSync(join(item.directory, "LICENSE"));
    assert.throws(
      () => readPackageNotice(item, fixture()),
      /missing full license text for example@1.0.0/
    );
  });
  it("accepts reviewed fallback only for the exact package version", () => {
    const item = pkg(fixture()),
      fallbacks = fixture();
    rmSync(join(item.directory, "LICENSE"));
    write(fallbacks, "upstream.txt", MIT);
    write(
      fallbacks,
      "manifest.json",
      JSON.stringify({
        "example@1.0.0": {
          source: "https://example.test/commit/LICENSE",
          files: ["upstream.txt"],
        },
      })
    );
    assert.equal(
      readPackageNotice(item, fallbacks).files[0].source,
      "https://example.test/commit/LICENSE"
    );
    assert.throws(
      () =>
        readPackageNotice(
          { ...item, data: { ...item.data, version: "2.0.0" } },
          fallbacks
        ),
      /missing full license text/
    );
  });
  it("preserves full MIT terms shipped inside a README", () => {
    const item = pkg(fixture());
    rmSync(join(item.directory, "LICENSE"));
    write(item.directory, "README.md", "# Example\n\n## License\n" + MIT);
    assert.ok(
      readPackageNotice(item).files[0].text.includes(
        "Permission is hereby granted"
      )
    );
  });
  it("includes package-owned notices for copied component sources", () => {
    const item = pkg(fixture(), "@adapttable/spartan");
    write(item.directory, "NOTICE", "Copied Helm attribution\n" + MIT);
    assert.ok(
      collectNotices(
        bundleFor(join(item.directory, "src/helm.ts"))
      )[0].files.some((f) => f.name === "NOTICE")
    );
  });
  it("emits text and a machine-readable inventory and skips SSR", () => {
    const item = pkg(fixture()),
      assets = [],
      plugin = siteNotices();
    plugin.generateBundle.call(
      { environment: { config: { build: { ssr: true } } } },
      {},
      {}
    );
    plugin.generateBundle.call(
      { emitFile: (file) => assets.push(file) },
      {},
      bundleFor(join(item.directory, "index.js"))
    );
    assert.deepEqual(
      assets.map((a) => a.fileName),
      [NOTICE_JSON, NOTICE_TEXT]
    );
    assert.ok(assets[1].source.includes(MIT));
  });
  it("checks matching terms and all listed emitted assets", () => {
    const root = fixture(),
      item = pkg(root),
      packages = [readPackageNotice(item)];
    write(root, "assets/app.js", "code");
    write(
      root,
      NOTICE_JSON,
      JSON.stringify({ schemaVersion: 1, packages, assets: ["assets/app.js"] })
    );
    write(root, NOTICE_TEXT, renderNotices(packages));
    assert.equal(checkNotices(root), 1);
    write(root, NOTICE_TEXT, "MIT");
    assert.throws(() => checkNotices(root), /does not match/);
    write(root, NOTICE_TEXT, renderNotices(packages));
    rmSync(join(root, "assets/app.js"));
    assert.throws(() => checkNotices(root), /missing or invalid/);
  });
  it("finds transitive static assets without package.json export access", () => {
    const root = fixture(),
      host = pkg(root, "host"),
      dependency = pkg(host.directory, "static-search");
    assert.equal(
      installedPackage("static-search", host.directory),
      join(dependency.directory, "package.json")
    );
    assert.throws(() => installedPackage("missing", root), /cannot locate/);
  });
});

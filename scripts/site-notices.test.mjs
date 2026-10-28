import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
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
const readJson = (out) =>
  JSON.parse(readFileSync(join(out, NOTICE_JSON), "utf8"));
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
  it("supplies complete grants for the exact Angular toolkit versions", () => {
    for (const [name, version, license] of [
      ["@taiga-ui/icons", "5.26.0", "Apache-2.0"],
      ["@taiga-ui/design-tokens", "0.320.0", "Apache-2.0"],
      ["@taiga-ui/font-watcher", "0.6.0", "Apache-2.0"],
    ]) {
      const item = pkg(fixture(), name, version);
      rmSync(join(item.directory, "LICENSE"));
      const data = { ...item.data, license };
      const notice = readPackageNotice({ ...item, data });
      assert.ok(
        notice.files.some((file) => hasLicenseText(file.text, license)),
        name
      );
      assert.ok(
        notice.files.every((file) => file.source?.startsWith("https://")),
        name
      );
      assert.throws(
        () =>
          readPackageNotice({ ...item, data: { ...data, version: "99.0.0" } }),
        /missing full license text/
      );
    }
  });
  it("retains shipped icon terms alongside Apache and Feather MIT supplements", () => {
    const item = pkg(fixture(), "@taiga-ui/icons", "5.26.0");
    const supplier = readFileSync(
      new URL(
        "./third-party-licenses/taiga-ui-icons-5.26.0-lucide-feather.txt",
        import.meta.url
      ),
      "utf8"
    );
    write(item.directory, "LICENSE", supplier);
    const notice = readPackageNotice({
      ...item,
      data: { ...item.data, license: "Apache-2.0" },
    });
    assert.equal(
      notice.files.find((file) => file.name === "LICENSE")?.text,
      supplier.trim()
    );
    const text = renderNotices([notice]);
    assert.match(text, /ISC License/);
    assert.match(text, /END OF TERMS AND CONDITIONS/);
    assert.match(text, /Copyright \(c\) 2013-present Cole Bemis/);
    assert.match(
      text,
      /The MIT License \(MIT\) \(for the icons listed above\)/
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
    write(
      item.directory,
      "package.json",
      JSON.stringify({ ...item.data, private: true })
    );
    write(item.directory, "NOTICE", "Copied Helm attribution\n" + MIT);
    assert.ok(
      collectNotices(
        bundleFor(join(item.directory, "src/helm.ts"))
      )[0].files.some((f) => f.name === "NOTICE")
    );
  });
  it("writes text and a machine-readable inventory and skips SSR", () => {
    const item = pkg(fixture()),
      out = fixture(),
      plugin = siteNotices(),
      ssr = { environment: { config: { build: { ssr: true } } } },
      bundle = bundleFor(join(item.directory, "index.js"));
    plugin.generateBundle.call(ssr, {}, {});
    plugin.writeBundle.call(ssr, { dir: out }, {});
    assert.equal(existsSync(join(out, NOTICE_JSON)), false);
    plugin.generateBundle.call({}, {}, bundle);
    plugin.writeBundle.call({}, { dir: out }, bundle);
    assert.deepEqual(readJson(out).assets, ["assets/app.js"]);
    assert.ok(readFileSync(join(out, NOTICE_TEXT), "utf8").includes(MIT));
  });
  it("writes notices for Astro client consumers with inherited SSR build flags", () => {
    const item = pkg(fixture()),
      out = fixture(),
      plugin = siteNotices(),
      client = {
        environment: { config: { consumer: "client", build: { ssr: true } } },
      },
      server = {
        environment: { config: { consumer: "server", build: { ssr: false } } },
      },
      bundle = bundleFor(join(item.directory, "index.js"));
    plugin.generateBundle.call(client, {}, bundle);
    assert.doesNotThrow(() => plugin.generateBundle.call(server, {}, {}));
    plugin.writeBundle.call(server, { dir: out }, {});
    assert.equal(existsSync(join(out, NOTICE_JSON)), false);
    plugin.writeBundle.call(client, { dir: out }, bundle);
    assert.deepEqual(readJson(out).assets, ["assets/app.js"]);
    assert.ok(readFileSync(join(out, NOTICE_TEXT), "utf8").includes(MIT));
  });
  it("keeps the packages of a chunk inlined into HTML but lists only written files", () => {
    const root = fixture(),
      kept = pkg(root, "kept"),
      inlined = pkg(root, "inlined"),
      out = fixture(),
      plugin = siteNotices(),
      bundle = {
        "assets/app.js": {
          type: "chunk",
          moduleIds: [join(kept.directory, "index.js")],
        },
        "assets/inline.js": {
          type: "chunk",
          moduleIds: [join(inlined.directory, "index.js")],
        },
      };
    plugin.generateBundle.call({}, {}, bundle);
    // A later generateBundle hook moves the chunk's code into the HTML.
    delete bundle["assets/inline.js"];
    plugin.writeBundle.call({}, { dir: out }, bundle);
    const inventory = readJson(out);
    assert.deepEqual(inventory.assets, ["assets/app.js"]);
    assert.deepEqual(
      inventory.packages.map((p) => p.name),
      ["inlined", "kept"]
    );
  });
  it("refuses to write notices without an output directory", () => {
    const item = pkg(fixture()),
      plugin = siteNotices(),
      bundle = bundleFor(join(item.directory, "index.js"));
    plugin.generateBundle.call({}, {}, bundle);
    assert.throws(
      () => plugin.writeBundle.call({}, {}, bundle),
      /no output directory/
    );
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
      realpathSync(join(dependency.directory, "package.json"))
    );
    assert.throws(() => installedPackage("missing", root), /cannot locate/);
  });
});

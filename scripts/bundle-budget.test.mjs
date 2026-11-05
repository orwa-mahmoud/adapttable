import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { Rolldown } from "tsdown";

import {
  accountOutputs,
  emittedLedger,
  fixtureCeilings,
  inspectOutputs,
  measure,
  requestedCases,
  selectFixtures,
} from "./bundle-budget.mjs";
import { caseId, FIXTURES } from "./consumer-fixtures.mjs";
import { vueNativeConsumerConfig } from "./vue-native-consumer.mjs";

let dir;

before(() => {
  dir = mkdtempSync(join(tmpdir(), "adapttable-budget-test-"));
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

function write(files) {
  for (const [name, source] of Object.entries(files)) {
    writeFileSync(join(dir, name), source);
  }
}

/** Minified and readable builds of one graph, the same pair `measure` makes. */
async function rolldownBuild(input) {
  const bundle = await Rolldown.rolldown({ input, logLevel: "silent" });
  try {
    const [min, readable] = await Promise.all([
      bundle.generate({ format: "esm", minify: true }),
      bundle.generate({ format: "esm" }),
    ]);
    return { min: min.output, readable: readable.output };
  } finally {
    await bundle.close();
  }
}

async function viteBuild(input, minify) {
  const fromRoot = createRequire(import.meta.url);
  const fromVue = createRequire(fromRoot.resolve("@vitejs/plugin-vue"));
  const { build } = await import(pathToFileURL(fromVue.resolve("vite")).href);
  const result = await build(vueNativeConsumerConfig(input, dir, minify, []));
  return (Array.isArray(result) ? result : [result]).flatMap(
    (bundle) => bundle.output
  );
}

const sum = (ledger, key) =>
  ledger.reduce((total, file) => total + file[key], 0);

const LAZY_ENTRY = {
  "lazy-entry.js": [
    'export const base = "base table";',
    'export const loadFirst = () => import("./lazy-first.js");',
    'export const loadSecond = () => import("./lazy-second.js");',
  ].join("\n"),
  "lazy-first.js": 'export function lazyFirst() { return "first".repeat(40); }',
  "lazy-second.js":
    'export function plantedLeakMarker() { return "leak".repeat(40); }',
};

describe("emitted-file accounting", () => {
  it("fails a planted leak in a second lazy chunk and counts that chunk in total", async () => {
    write(LAZY_ENTRY);
    const { min, readable } = await rolldownBuild(join(dir, "lazy-entry.js"));
    const fixture = { absent: ["plantedLeakMarker"], present: ["lazyFirst"] };

    // The first emitted file is the entry; the leak is two chunks away.
    assert.doesNotMatch(readable[0].code, /plantedLeakMarker/);
    assert.deepEqual(inspectOutputs(fixture, readable), {
      leaked: ["plantedLeakMarker"],
      missing: [],
    });

    const accounted = accountOutputs(min, readable);
    const lazy = accounted.ledger.filter((file) => file.phase === "lazy");
    assert.equal(lazy.length, 2);
    assert.equal(accounted.lazy.files, 2);
    assert.equal(accounted.total.files, accounted.ledger.length);
    assert.equal(accounted.total.gzipBytes, sum(accounted.ledger, "gzipBytes"));
    assert.equal(
      accounted.total.gzipBytes,
      accounted.initial.gzipBytes + accounted.lazy.gzipBytes
    );
    assert.ok(accounted.lazy.gzipBytes > 0);
    assert.ok(accounted.total.rawBytes > accounted.total.minBytes);
  });

  it("measures every chunk of a real fixture, not only the first output", async () => {
    write(LAZY_ENTRY);
    const result = await measure(
      {
        name: "synthetic lazy",
        pkg: "core",
        code: `export * from ${JSON.stringify(join(dir, "lazy-entry.js"))};`,
        absent: ["plantedLeakMarker"],
      },
      dir
    );
    assert.deepEqual(result.leaked, ["plantedLeakMarker"]);
    assert.equal(result.lazy.files, 2);
    assert.equal(
      result.total.gzipBytes,
      result.initial.gzipBytes + result.lazy.gzipBytes
    );
    assert.deepEqual(result.entryImports, []);
    assert.equal(typeof result.buildMs, "number");
    assert.equal("parseMs" in result, false);
  });

  it("fails a planted leak in an emitted lazy stylesheet and counts it in total", async () => {
    write({
      "styled-entry.js": [
        "export const base = 1;",
        'export const load = () => import("./styled-lazy.js");',
      ].join("\n"),
      "styled-lazy.js": 'import "./styled-lazy.css";\nexport const lazy = 2;',
      "styled-lazy.css": ".planted-lazy-style { color: red; }\n",
    });
    const input = join(dir, "styled-entry.js");
    const [min, readable] = await Promise.all([
      viteBuild(input, true),
      viteBuild(input, false),
    ]);
    const fixture = { absentCss: ["planted-lazy-style"] };
    assert.deepEqual(inspectOutputs(fixture, readable).leaked, [
      "CSS planted-lazy-style",
    ]);

    const accounted = accountOutputs(min, readable);
    const sheet = accounted.ledger.find((file) =>
      file.fileName.endsWith(".css")
    );
    assert.ok(sheet, "the stylesheet is in the ledger");
    assert.equal(sheet.phase, "lazy");
    assert.ok(sheet.gzipBytes > 0);
    assert.equal(accounted.total.gzipBytes, sum(accounted.ledger, "gzipBytes"));
    assert.ok(accounted.lazy.gzipBytes >= sheet.gzipBytes);
  });

  it("counts an unclaimed stylesheet as initial and never counts sourcemaps", () => {
    const ledger = emittedLedger([
      {
        type: "chunk",
        fileName: "entry.js",
        isEntry: true,
        imports: ["vue"],
        dynamicImports: [],
        code: "export const a = 1;",
      },
      { type: "asset", fileName: "styles.css", source: ".a{color:red}" },
      { type: "asset", fileName: "entry.js.map", source: "{}" },
    ]);
    assert.deepEqual(
      ledger.map(({ fileName, phase }) => [fileName, phase]),
      [
        ["entry.js", "initial"],
        ["styles.css", "initial"],
      ]
    );
    assert.deepEqual(ledger[0].externalImports, ["vue"]);
  });

  it("gives the same totals and ledger whatever order files are emitted in", async () => {
    write(LAZY_ENTRY);
    const { min, readable } = await rolldownBuild(join(dir, "lazy-entry.js"));
    assert.ok(min.length > 2);
    assert.deepEqual(
      accountOutputs([...min].reverse(), [...readable].reverse()),
      accountOutputs(min, readable)
    );
  });

  it("counts a chunk two entries share once", async () => {
    write({
      "shared.js": `export const shared = ${JSON.stringify("shared ".repeat(200))};`,
      "first.js":
        'import { shared } from "./shared.js";\nexport const first = shared + 1;',
      "second.js":
        'import { shared } from "./shared.js";\nexport const second = shared + 2;',
    });
    const { min, readable } = await rolldownBuild({
      first: join(dir, "first.js"),
      second: join(dir, "second.js"),
    });
    const accounted = accountOutputs(min, readable);
    const shared = accounted.ledger.filter(
      (file) => !file.isEntry && file.type === "chunk"
    );
    assert.equal(shared.length, 1, "rolldown split the shared module");
    assert.equal(accounted.total.files, 3);
    assert.equal(accounted.initial.files, 3);
    assert.equal(accounted.total.gzipBytes, sum(accounted.ledger, "gzipBytes"));
    const perEntryClosures = accounted.ledger
      .filter((file) => file.isEntry)
      .reduce(
        (total, entry) => total + entry.gzipBytes + shared[0].gzipBytes,
        0
      );
    assert.ok(accounted.total.gzipBytes < perEntryClosures);
  });

  it("refuses an output that emits one file name twice", () => {
    const chunk = {
      type: "chunk",
      fileName: "entry.js",
      isEntry: true,
      imports: [],
      dynamicImports: [],
      code: "",
    };
    assert.throws(() => emittedLedger([chunk, chunk]), /emitted twice/);
  });
});

describe("case selection", () => {
  it("reads repeated and comma-separated --case flags", () => {
    assert.deepEqual(
      requestedCases(["node", "x", "--case", "a", "--json", "--case=b,c"]),
      ["a", "b", "c"]
    );
    assert.deepEqual(requestedCases(["node", "x", "--json"]), []);
  });

  it("refuses a --case flag without an ID", () => {
    assert.throws(() => requestedCases(["--case"]), /needs a case ID/);
    assert.throws(
      () => requestedCases(["--case", "--json"]),
      /needs a case ID/
    );
    assert.throws(() => requestedCases(["--case="]), /needs a case ID/);
  });

  it("keeps full default coverage and fails on an unknown ID", () => {
    assert.equal(selectFixtures(FIXTURES, []), FIXTURES);
    assert.throws(
      () => selectFixtures(FIXTURES, ["mui-table", "no-such-case"]),
      /Unknown --case no-such-case/
    );
  });

  it("selects exactly the named cases in fixture order", () => {
    const picked = selectFixtures(FIXTURES, ["mui-table", "core-simple-table"]);
    assert.deepEqual(
      picked.map((fixture) => fixture.name),
      ["core · simple table", "mui · table"]
    );
  });

  it("gives every fixture a unique, stable kebab-case ID", () => {
    const ids = FIXTURES.map((fixture) => fixture.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const fixture of FIXTURES) {
      assert.match(fixture.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.equal(fixture.id, caseId(fixture.name));
    }
    assert.equal(caseId("mui · + export"), "mui-plus-export");
    assert.equal(
      caseId("vue-unstyled · table + preset"),
      "vue-unstyled-table-plus-preset"
    );
  });
});

describe("ceilings", () => {
  it("holds every fixture to an initial and a total ceiling", () => {
    for (const fixture of FIXTURES) {
      const { initialKB, totalKB } = fixtureCeilings(fixture);
      assert.ok(initialKB > 0, fixture.name);
      assert.ok(totalKB >= initialKB, fixture.name);
    }
  });

  it("keeps Vue ceilings, which always counted every output, as totals", () => {
    for (const fixture of FIXTURES.filter((f) => f.framework === "vue")) {
      assert.equal(fixture.totalKB, fixture.initialKB, fixture.name);
    }
  });

  it("refuses a fixture with a missing or inverted ceiling", () => {
    assert.throws(
      () => fixtureCeilings({ name: "x", initialKB: 10 }),
      /total ceiling/
    );
    assert.throws(
      () => fixtureCeilings({ name: "x", initialKB: 10, totalKB: 9 }),
      /total ceiling/
    );
  });

  it("holds the lazy PDF case to a total above its initial ceiling", () => {
    const pdf = FIXTURES.find((f) => f.id === "core-engine-plus-lazy-pdf");
    assert.ok(pdf);
    assert.ok(pdf.totalKB > pdf.initialKB);
    assert.match(pdf.code, /import\("ALSO"\)/);
  });
});

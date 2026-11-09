/**
 * The bundle budget — what a table actually costs, measured and enforced.
 *
 * AdaptTable's promise is that features are opt-in: a plain table pays for the
 * plain table and nothing else. A promise like that is worth exactly what it is
 * measured at, so this packs the packages a run needs, installs the tarballs
 * into a scratch consumer, bundles real consumer fixtures through their public
 * package names and `exports` maps — what npm ships, not the source — and
 * holds each one to a written ceiling. Every case is also type-checked against
 * the packed declarations, and the query and server cases run in Node with no
 * framework installed.
 *
 *   pnpm build && node scripts/bundle-budget.mjs      # measure and check
 *   node scripts/bundle-budget.mjs --update           # print current sizes
 *   node scripts/bundle-budget.mjs --json             # machine-readable sizes
 *   node scripts/bundle-budget.mjs --case mui-table --case core-formula
 *                                                     # only the named cases
 *
 * Sizes are minified + gzipped bytes of AdaptTable's own share of the graph.
 * React and the UI kits are external because an application already ships
 * them; counting them would drown the number the budget is about. Vue fixtures
 * externalize the same way — the Vue runtime and each kit's peer UI library.
 *
 * Every emitted chunk and asset is counted once, gzipped on its own, and
 * reported as initial (the entries' complete static closure and the styles
 * they load) or lazy (behind a dynamic import). Each fixture holds an initial
 * and a total ceiling.
 *
 * The bundler is rolldown, re-exported by tsdown, which builds this repo
 * already — the measurement adds no dependency of its own.
 *
 * Consumer paths live in `consumer-fixtures.mjs`: core-simple, every adapter
 * base (≤ 80 KB and ≥ 35% below the item-1 baseline), every feature delta on
 * MUI, `standardFeatures()` for every kit, representative combinations, and
 * the all-feature ceiling. Negative markers travel with each fixture.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import { Rolldown } from "tsdown";

import {
  angularTransformer,
  bundleAngularConsumer,
  compileAngularConsumers,
} from "./angular-consumer-build.mjs";
import { angularConsumerCoverageProblems } from "./angular-consumer-fixtures.mjs";
import { requestedCases, selectCases } from "./case-selection.mjs";
import {
  fixtureFolders,
  FIXTURES,
  PLAIN_ADAPTER_CEILING_KB,
  plantedLeakFixture,
} from "./consumer-fixtures.mjs";
import { packageRel } from "./packages.mjs";
import {
  declarationProblems,
  nodeConsumerProblems,
  packageClosure,
  packedConsumer,
  packedModules,
  workspacePackages,
} from "./packed-consumers.mjs";
import { publishedFigures, staleReason } from "./published-figures.mjs";
import {
  vueConsumerCoverageProblems,
  vueConsumerExternals,
  vueEmittedCss,
  vueMissingCss,
} from "./vue-consumer-fixtures.mjs";
import { buildVueCssConsumer } from "./vue-css-consumer.mjs";
import { buildVueNativeConsumer } from "./vue-native-consumer.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATE = process.argv.includes("--update");
const JSON_OUT = process.argv.includes("--json");
const KIB = 1024;

/** Anything an application already has. AdaptTable's share is what remains. */
const EXTERNAL = [
  /^react($|\/)/,
  /^react-dom($|\/)/,
  /^react-compiler-runtime($|\/)/,
  /^@mantine\//,
  /^@mui\//,
  /^@emotion\//,
  /^@chakra-ui\//,
  /^antd$/,
  /^@ant-design\//,
  /^@radix-ui\//,
  /^@base-ui($|\/)/,
  /^class-variance-authority$/,
  /^clsx$/,
  /^tailwind-merge$/,
  /^lucide-react$/,
];

const PEER_POLICY = {
  react: "React runtime and UI-kit libraries external",
  vue: "Vue runtime and the package's peerDependencies external",
  angular: "Angular framework and UI-kit libraries external; own share",
};

function extraFiles(fixture) {
  const extras = [...(fixture.alsoFiles ?? [])];
  if (fixture.alsoEntryFile && !extras.includes(fixture.alsoEntryFile)) {
    extras.unshift(fixture.alsoEntryFile);
  }
  return extras;
}

const SCOPED_SPECIFIER = /["'](@adapttable\/[^"']+)["']/g;

/**
 * The consumer module, and the public specifiers it imports. `PKG`, `ALSO*`
 * and `STYLE` name files of the fixture's package; `install` turns each one
 * into the specifier its packed `exports` map publishes for that file.
 */
export function entryModule(fixture, install) {
  const extras = extraFiles(fixture);
  let code = fixture.code;
  const use = (token, file) => {
    if (!code.includes(token)) return;
    if (!install) {
      throw new Error(
        `${fixture.name} imports ${token}: measure it from a packed install`
      );
    }
    code = code.replaceAll(token, install.specifier(fixture.pkg, file));
  };
  use("PKG", fixture.entryFile ?? "index.js");
  for (let index = extras.length - 1; index >= 0; index--) {
    use(`ALSO${index}`, extras[index]);
  }
  if (extras[0]) use("ALSO", extras[0]);
  if (fixture.styleEntryFile) use("STYLE", fixture.styleEntryFile);
  const imports = [...code.matchAll(SCOPED_SPECIFIER)].map((match) => match[1]);
  return { code, imports: [...new Set(imports)].sort() };
}

const SOURCE_MAP = /\.map$/;

/**
 * One language's label preset from `@adapttable/i18n`. Presets load on demand
 * and an application loads at most one, so a group of them counts as its
 * largest member, not their sum.
 */
const LOCALE_PRESET =
  /[\\/]@adapttable[\\/]i18n[\\/]dist[\\/](?!index|load|rolldown-runtime)[\w-]+\.js$/;

/** The group a lazy chunk is one alternative of, when it is one. */
function alternativeOf(file) {
  const ids = file.moduleIds ?? [];
  return ids.length > 0 && ids.every((id) => LOCALE_PRESET.test(id))
    ? "locale preset"
    : undefined;
}

function emittedBytes(file) {
  if (file.type === "chunk") return Buffer.from(file.code);
  return Buffer.from(file.source);
}

function linkedFiles(chunk) {
  return [
    ...chunk.imports,
    ...(chunk.viteMetadata?.importedCss ?? []),
    ...(chunk.viteMetadata?.importedAssets ?? []),
  ];
}

/**
 * Every emitted chunk and asset, once, ordered by file name and marked
 * initial or lazy.
 *
 * Initial is what loading the entries costs before any dynamic import runs:
 * each entry chunk, its complete static import closure, and the stylesheets
 * and assets those chunks link. An asset no lazy chunk claims is initial, so
 * an unsplit stylesheet the entry imports is never hidden as optional.
 * Sourcemaps are not shipped to the browser and are not counted.
 */
export function emittedLedger(output) {
  const files = new Map();
  for (const file of output) {
    if (SOURCE_MAP.test(file.fileName)) continue;
    if (files.has(file.fileName)) {
      throw new Error(`${file.fileName} was emitted twice`);
    }
    files.set(file.fileName, file);
  }
  const chunks = [...files.values()].filter((file) => file.type === "chunk");
  const initial = new Set();
  const pending = chunks
    .filter((chunk) => chunk.isEntry)
    .map((chunk) => chunk.fileName);
  while (pending.length) {
    const name = pending.pop();
    const file = files.get(name);
    if (!file || initial.has(name)) continue;
    initial.add(name);
    if (file.type === "chunk") pending.push(...linkedFiles(file));
  }
  const claimedLazily = new Set(
    chunks
      .filter((chunk) => !initial.has(chunk.fileName))
      .flatMap((chunk) => linkedFiles(chunk))
  );
  for (const file of files.values()) {
    if (file.type === "asset" && !claimedLazily.has(file.fileName)) {
      initial.add(file.fileName);
    }
  }
  const emitted = (name) => files.has(name);
  return [...files.values()]
    .sort((a, b) => (a.fileName < b.fileName ? -1 : 1))
    .map((file) => {
      const bytes = emittedBytes(file);
      return {
        fileName: file.fileName,
        type: file.type,
        phase: initial.has(file.fileName) ? "initial" : "lazy",
        ...(file.type === "chunk" && {
          isEntry: file.isEntry,
          imports: file.imports.filter(emitted),
          dynamicImports: file.dynamicImports.filter(emitted),
          externalImports: [...file.imports, ...file.dynamicImports].filter(
            (name) => !emitted(name)
          ),
        }),
        ...(file.type === "chunk" &&
          !initial.has(file.fileName) &&
          alternativeOf(file) && { alternative: alternativeOf(file) }),
        bytes: bytes.length,
        gzipBytes: gzipSync(bytes).length,
      };
    });
}

function phaseTotals(ledger) {
  const totals = {};
  for (const phase of ["initial", "lazy", "total"]) {
    totals[phase] = { files: 0, bytes: 0, gzipBytes: 0 };
  }
  const largest = new Map();
  for (const file of ledger) {
    if (file.alternative === undefined) continue;
    const held = largest.get(file.alternative);
    if (!held || file.gzipBytes > held.gzipBytes) {
      largest.set(file.alternative, file);
    }
  }
  const counted = ledger.filter(
    (file) =>
      file.alternative === undefined || largest.get(file.alternative) === file
  );
  for (const file of counted) {
    for (const phase of [file.phase, "total"]) {
      totals[phase].files++;
      totals[phase].bytes += file.bytes;
      totals[phase].gzipBytes += file.gzipBytes;
    }
  }
  return totals;
}

/**
 * Raw, minified and gzip bytes per phase, from the readable and minified
 * builds of the same graph. Gzip is of the minified files, each on its own.
 */
export function accountOutputs(minOutput, readableOutput) {
  const ledger = emittedLedger(minOutput);
  const minified = phaseTotals(ledger);
  const raw = phaseTotals(emittedLedger(readableOutput));
  const phases = {};
  for (const phase of ["initial", "lazy", "total"]) {
    phases[phase] = {
      files: minified[phase].files,
      rawBytes: raw[phase].bytes,
      minBytes: minified[phase].bytes,
      gzipBytes: minified[phase].gzipBytes,
    };
  }
  return { ...phases, ledger };
}

/**
 * Bundled code without its block and whole-line comments. A doc comment that
 * names a function is not that function, so a marker must match code.
 */
export function withoutComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

/**
 * Markers that leaked into, or are missing from, every emitted chunk and
 * stylesheet of the readable build.
 *
 * `absent` and `present` name runtime identifiers and are read from all
 * JavaScript chunks, lazy ones included. `absentCss` and `presentCss` are read
 * from the emitted stylesheets, where a published sheet legitimately carries
 * selectors for parts the runtime graph omits.
 */
export function inspectOutputs(fixture, readableOutput) {
  const code = withoutComments(
    readableOutput
      .filter((file) => file.type === "chunk")
      .map((file) => file.code)
      .join("\n")
  );
  const css = vueEmittedCss(readableOutput);
  const inCode = (name) => new RegExp(`\\b${name}`).test(code);
  return {
    leaked: [
      ...(fixture.absent ?? []).filter(inCode),
      ...(fixture.absentCss ?? [])
        .filter((marker) => css.includes(marker))
        .map((marker) => `CSS ${marker}`),
    ],
    missing: [
      ...(fixture.present ?? []).filter((name) => !inCode(name)),
      ...vueMissingCss(fixture, css).map((marker) => `CSS ${marker}`),
    ],
  };
}

/**
 * A plugin that collects every module id the bundler loaded, tree-shaken
 * barrels included — the graph resolution reached, not only what rendered.
 */
function moduleRecorder() {
  const ids = new Set();
  return {
    ids,
    plugin: {
      name: "adapttable-module-recorder",
      buildEnd() {
        for (const id of this.getModuleIds()) ids.add(id);
      },
    },
  };
}

/** Angular, RxJS and every kit UI library: what an Angular app already ships. */
const ANGULAR_EXTERNAL = [
  /^@angular\//,
  /^rxjs($|\/)/,
  /^zone\.js($|\/)/,
  /^tslib($|\/)/,
  /^@taiga-ui\//,
  /^ng-zorro-antd($|\/)/,
  /^@ng-bootstrap\//,
  /^ngx-bootstrap($|\/)/,
  /^@spartan-ng\//,
  /^@ng-icons\//,
];

/**
 * The compiled bootstrap entries for the Angular fixtures, keyed by case id.
 * One `ngc` run compiles them all; an empty selection compiles nothing.
 */
function angularEntries(fixtures, dir) {
  if (!fixtures.length) return new Map();
  return compileAngularConsumers(
    dir,
    fixtures.map((fixture) => ({ id: fixture.id, code: fixture.code }))
  );
}

async function bundleFixture(fixture, entry, dir, externals, plugins) {
  if (fixture.consumerHost) {
    return Promise.all(
      [true, false].map((minify) =>
        buildVueNativeConsumer(fixture, entry, dir, minify, plugins, externals)
      )
    );
  }
  if (fixture.styleEntryFile) {
    // Independent builds keep the stateful CSS collection passes separate.
    const min = await buildVueCssConsumer(entry, dir, true, plugins, externals);
    const readable = await buildVueCssConsumer(
      entry,
      dir,
      false,
      plugins,
      externals
    );
    return [min, readable];
  }
  const bundle = await Rolldown.rolldown({
    input: entry,
    external: (id) => externals.some((re) => re.test(id)),
    plugins,
    logLevel: "silent",
  });
  try {
    return await Promise.all([
      bundle.generate({ format: "esm", minify: true }),
      bundle.generate({ format: "esm" }),
    ]);
  } finally {
    await bundle.close();
  }
}

/**
 * Bundle one fixture: its emitted-file ledger and per-phase bytes, plus any
 * names that were supposed to be shaken out and were not.
 *
 * The sizes come from minified output because that is what ships. The marker
 * checks read the unminified build of the same graph, where identifiers still
 * carry their real names. `buildMs` is the bundler's wall-clock time for both
 * builds, not a browser parse measurement.
 *
 * With `install`, the entry is written into that packed consumer and every
 * module the graph reached is recorded: `resolvedFiles` from the tarballs,
 * `unpackedFiles` from anywhere under the workspace's `packages/`.
 */
/**
 * What a framework's application already ships. Only a Vue fixture reads its
 * package's peers, so other fixtures never need a workspace manifest.
 */
function consumerExternals(framework, pkg) {
  if (framework === "vue") return vueConsumerExternals(pkg);
  if (framework === "angular") return ANGULAR_EXTERNAL;
  return EXTERNAL;
}

export async function measure(fixture, dir, install, angular) {
  const { code, imports } = entryModule(fixture, install);
  const entry = join(dir, fixture.typeOnly ? "entry.ts" : "entry.js");
  writeFileSync(entry, code);
  const framework = fixture.framework ?? "react";
  const externals = consumerExternals(framework, fixture.pkg);

  const recorder = moduleRecorder();
  const started = performance.now();
  const compiled = angular?.get(fixture.id);
  const bundled = (external) =>
    bundleAngularConsumer(compiled.entry, {
      dir,
      externals: external,
      transformer: angular.transformer,
      plugins: [recorder.plugin],
    });
  const [min, readable] = compiled
    ? await bundled(externals)
    : await bundleFixture(fixture, entry, dir, externals, [recorder.plugin]);
  // The complete application bundles the framework too, so its bytes are
  // reported beside AdaptTable's own share and never checked against it.
  const application = compiled && (await bundled([]));
  const buildMs = Math.round(performance.now() - started);

  const accounted = accountOutputs(min.output, readable.output);
  const modules = packedModules(recorder.ids, dir);
  const app =
    application && accountOutputs(application[0].output, application[1].output);
  return {
    ...accounted,
    ...(app && { application: app.total }),
    entryCode: code,
    entryImports: imports,
    resolvedFiles: modules.files,
    unpackedFiles: modules.unpacked,
    peerPolicy: PEER_POLICY[framework],
    externalImports: [
      ...new Set(
        accounted.ledger.flatMap((file) => file.externalImports ?? [])
      ),
    ].sort(),
    buildMs,
    ...inspectOutputs(fixture, readable.output),
  };
}

/** The initial and total ceilings a fixture is held to, in KiB. */
export function fixtureCeilings(fixture) {
  const { initialKB, totalKB } = fixture;
  if (!(initialKB > 0 && totalKB >= initialKB)) {
    throw new Error(
      `${fixture.name} needs an initial ceiling and a total ceiling no lower than it`
    );
  }
  return { initialKB, totalKB, ...(fixture.appKB && { appKB: fixture.appKB }) };
}

export { requestedCases };

/** Every fixture when no IDs were requested; otherwise exactly the named ones. */
export const selectFixtures = selectCases;

/**
 * A planted import of a live hook must trip the negative assertion. If this
 * stays green, the detector is what failed — not the table.
 */
export async function provePlantedLeak(install) {
  const { leaked } = await measure(plantedLeakFixture(), install.dir, install);
  if (
    !leaked.includes("useTableEditHistory") ||
    !leaked.includes("asBatchGesture")
  ) {
    throw new Error(
      `planted leak did not fail the negative assertion — the detector is blind (saw ${leaked.join(", ") || "nothing"})`
    );
  }
  if (!JSON_OUT) {
    console.log(
      "✓ planted leak failed the negative assertion (useTableEditHistory, asBatchGesture)"
    );
  }
}

/**
 * Every size figure this repo publishes, and the fixture each one comes from.
 *
 * A budget is a ceiling, so a fixture can sit well under one for months while
 * the figure published beside it says something else entirely — which is how
 * `~51 kB` outlived a 134 KB measurement. Several of these pages tell the
 * reader the budget checks them; this is where that becomes true.
 *
 * `find` is the start of the line carrying the figure. `from` names the
 * fixtures it summarises — more than one publishes a range. Published figures
 * are initial transfer: what a page loads before any lazy import.
 */
const PUBLISHED = [
  {
    doc: "docs/faq.md",
    find: "| `useFrontendData` + `useDataTable` (react)",
    from: ["react · simple table"],
  },
  {
    doc: "docs/faq.md",
    find: "| every core export",
    from: ["core · every export"],
  },
  {
    doc: "docs/faq.md",
    find: "| `DataTable` from an adapter",
    from: FIXTURES.filter((f) => f.kind === "adapter-base").map((f) => f.name),
  },
  {
    doc: "docs/features.md",
    find: "Measured on MUI, the table alone is",
    from: ["mui · table", "mui · table + preset"],
  },
  {
    doc: "docs/getting-started.md",
    find: "A plain adapter `DataTable` is",
    from: FIXTURES.filter((f) => f.kind === "adapter-base").map((f) => f.name),
  },
  {
    doc: "docs/comparison.md",
    find: "A plain AdaptTable adapter `DataTable` is",
    from: FIXTURES.filter((f) => f.kind === "adapter-base").map((f) => f.name),
  },
  {
    doc: "docs/formulas.md",
    find: "columns never downloads a parser. It costs",
    from: ["core · formula"],
  },
  {
    doc: "docs/pivot.md",
    find: "never downloads the engine. It costs",
    from: ["core · pivot"],
  },
  {
    doc: `${packageRel("server")}/README.md`,
    find: "  no hooks and no client boundary, so an Express",
    from: ["server · parse a query"],
  },
];

const kib = (bytes) => bytes / KIB;

function headroomText(sizeKB, ceilingKB) {
  const headroom = ceilingKB - sizeKB;
  return headroom >= 0
    ? `${headroom.toFixed(1)} to spare`
    : `OVER by ${(-headroom).toFixed(1)}`;
}

function logRow(fixture, row) {
  const initialKB = kib(row.initial.gzipBytes);
  const totalKB = kib(row.total.gzipBytes);
  const lazy = row.lazy.files
    ? `   lazy ${kib(row.lazy.gzipBytes).toFixed(1)} KiB in ${row.lazy.files}`
    : "";
  const application = row.application
    ? `   app ${kib(row.application.gzipBytes).toFixed(1)} / ${row.appKB} KiB`
    : "";
  console.log(
    `${row.ok ? "✓" : "✗"} ${fixture.name.padEnd(34)}` +
      `initial ${initialKB.toFixed(1).padStart(6)} / ${String(Math.ceil(row.initialKB)).padStart(3)} KiB` +
      ` (${headroomText(initialKB, row.initialKB)})` +
      `   total ${totalKB.toFixed(1).padStart(6)} / ${String(Math.ceil(row.totalKB)).padStart(3)} KiB` +
      ` (${headroomText(totalKB, row.totalKB)})` +
      lazy +
      application +
      `   build ${String(row.buildMs).padStart(4)}ms`
  );
  if (fixture.kind === "adapter-base" && fixture.item1BaselineKB) {
    const cut = ((1 - initialKB / fixture.item1BaselineKB) * 100).toFixed(0);
    const vs80 =
      initialKB <= PLAIN_ADAPTER_CEILING_KB
        ? `≤ ${PLAIN_ADAPTER_CEILING_KB} KiB`
        : `OVER ${PLAIN_ADAPTER_CEILING_KB} KiB`;
    console.log(
      `  └ item-1 ${fixture.item1BaselineKB} KiB → ${cut}% smaller · ${vs80}`
    );
  }
  if (row.leaked.length) {
    console.log(
      `  └ reached the base import but should not have: ${row.leaked.join(", ")}`
    );
  }
  if (row.missing.length) {
    console.log(
      `  └ feature marker missing from the composed graph: ${row.missing.join(", ")}`
    );
  }
  for (const problem of row.resolutionProblems) console.log(`  └ ${problem}`);
  if (row.appOver) {
    console.log(
      `  └ complete app ${kib(row.application.gzipBytes).toFixed(1)} KiB exceeds ${row.appKB} KiB`
    );
  }
}

function logChecks(rows) {
  for (const row of rows) {
    for (const problem of row.declarationProblems) {
      console.log(`✗ ${row.name}: declarations · ${problem}`);
    }
    for (const problem of row.nodeProblems ?? []) {
      console.log(`✗ ${row.name}: Node consumer · ${problem}`);
    }
  }
  const nodeRuns = rows.filter((row) => row.nodeProblems).length;
  console.log(
    `\n${rows.length} entries type-checked against the packed declarations` +
      (nodeRuns ? `; ${nodeRuns} ran in Node with no framework installed` : "")
  );
}

function printJson(rows, packages) {
  console.log(
    JSON.stringify(
      {
        unit: "bytes; KiB = 1024 bytes",
        resolution: "packed tarballs installed into a scratch consumer",
        packages,
        fixtures: rows.map(jsonRow),
      },
      null,
      2
    )
  );
}

/**
 * Published figures whose fixtures this run measured, checked against the
 * initial transfer. A `--case` run skips the figures it did not measure.
 */
function countStale(rows) {
  let stale = 0;
  let checked = 0;
  for (const { doc, find, from } of PUBLISHED) {
    const measured = rows
      .filter((r) => from.includes(r.name))
      .map((r) => kib(r.initial.gzipBytes));
    if (measured.length !== from.length) continue;
    checked++;
    const figures = publishedFigures(join(ROOT, doc), find);
    if (figures === null) {
      stale++;
      console.error(
        `✗ ${doc}: no line starting "${find}" — the text moved or was reworded`
      );
      continue;
    }
    const reason = staleReason(figures, measured);
    if (reason) {
      stale++;
      console.error(`✗ ${doc} · ${find.trim()}: ${reason}`);
    }
  }
  if (!stale && checked) {
    console.log(`\n✓ ${checked} published size figures match this run`);
  }
  return stale;
}

function exitIfFailed(over, stale) {
  if (!over && !stale) return;
  if (over) {
    console.error(
      `\n${over} fixture(s) failed.\n` +
        `Over budget: either the weight belongs behind an optional entry point, ` +
        `or the budget needs raising — in the pull request, with a reason, never ` +
        `silently. A leak, an unpacked module, a declaration or a Node failure ` +
        `is a defect in what ships.`
    );
  }
  if (stale) {
    console.error(
      `\n${stale} published size figure(s) no longer match the build.\n` +
        `Correct the documented number; never widen the tolerance instead.`
    );
  }
  process.exit(1);
}

function jsonRow(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    peerPolicy: row.peerPolicy,
    entryImports: row.entryImports,
    resolvedFiles: row.resolvedFiles,
    externalImports: row.externalImports,
    declarations: row.declarationProblems.length
      ? { ok: false, problems: row.declarationProblems }
      : { ok: true },
    ...(row.nodeProblems && {
      node: row.nodeProblems.length
        ? { ok: false, problems: row.nodeProblems }
        : { ok: true, frameworkRuntimes: "not installed" },
    }),
    initial: row.initial,
    lazy: row.lazy,
    total: row.total,
    ...(row.application && {
      application: row.application,
      applicationCeilingKiB: row.appKB,
    }),
    ceilingsKiB: { initial: row.initialKB, total: row.totalKB },
    ok: row.ok,
    leaked: row.leaked,
    missing: row.missing,
    ledger: row.ledger,
  };
}

/** The fixtures this run's `--case` flags name; a bad request exits 2. */
function selectedFixtures() {
  try {
    return selectFixtures(FIXTURES, requestedCases(process.argv));
  } catch (error) {
    console.error(`✗ ${error.message}`);
    process.exit(2);
  }
}

/**
 * Why a measured graph does not prove the packed path: a module that came
 * from the workspace instead of a tarball, an `@adapttable/*` import the
 * install could not resolve (the bundler leaves it external rather than
 * failing), or a type-only import that still reached runtime code.
 */
export function resolutionProblems(fixture, measured) {
  const problems = [
    ...measured.unpackedFiles.map(
      (file) => `resolved outside the tarballs: ${file}`
    ),
    ...measured.externalImports
      .filter((specifier) => specifier.startsWith("@adapttable/"))
      .map((specifier) => `did not resolve from the tarballs: ${specifier}`),
  ];
  if (fixture.typeOnly && measured.resolvedFiles.length) {
    problems.push(
      `a type-only import reached runtime modules: ${measured.resolvedFiles.join(", ")}`
    );
  }
  return problems;
}

async function measuredRow(fixture, install, angular) {
  const measured = await measure(fixture, install.dir, install, angular);
  const ceilings = fixtureCeilings(fixture);
  const problems = resolutionProblems(fixture, measured);
  const appOver =
    measured.application && kib(measured.application.gzipBytes) > fixture.appKB;
  const ok =
    kib(measured.initial.gzipBytes) <= ceilings.initialKB &&
    kib(measured.total.gzipBytes) <= ceilings.totalKB &&
    !appOver &&
    measured.leaked.length === 0 &&
    measured.missing.length === 0 &&
    problems.length === 0;
  return {
    id: fixture.id,
    name: fixture.name,
    kind: fixture.kind,
    kit: fixture.kit,
    ...measured,
    ...ceilings,
    resolutionProblems: problems,
    ...(appOver && { appOver: true }),
    ok,
  };
}

/**
 * The entry as the compiler checks it. `export *` becomes a namespace
 * re-export: two barrels sharing a name are ambiguous to TypeScript but not
 * to a bundler, and the namespace form still needs each module's types.
 */
export function declarationSource(code) {
  let star = 0;
  return code.replaceAll(
    /export \* from (["'][^"']+["'])/g,
    (_, specifier) => `export * as star${star++} from ${specifier}`
  );
}

/** Each row's compiler errors against the packed declarations. */
function checkDeclarations(rows, install) {
  const problems = declarationProblems(
    install.dir,
    rows.map((row) => ({ id: row.id, code: declarationSource(row.entryCode) }))
  );
  for (const row of rows) {
    row.declarationProblems = problems.get(row.id);
    if (row.declarationProblems.length) row.ok = false;
  }
}

/**
 * Run each Node-side fixture's program from an install of only its own
 * package closure, with no framework or peer installed.
 */
function checkNodeConsumers(rows, selected, install, packages) {
  for (const fixture of selected.filter((entry) => entry.node)) {
    const row = rows.find((entry) => entry.id === fixture.id);
    const closure = new Set(packageClosure([fixture.pkg], packages));
    const program = fixture.node.replaceAll(
      "PKG",
      install.specifier(fixture.pkg, fixture.entryFile ?? "index.js")
    );
    row.nodeProblems = nodeConsumerProblems(
      install.packs.filter((pack) => closure.has(pack.folder)),
      program
    );
    if (row.nodeProblems.length) row.ok = false;
  }
}

/**
 * Compile the Angular fixtures once and record any that fail to compile.
 * Returns the linker and the compiled entries the measurement bundles, or
 * undefined when the run selected no Angular fixture.
 */
async function compiledAngular(selected, dir, rows) {
  const fixtures = selected.filter(
    (fixture) => fixture.framework === "angular"
  );
  if (!fixtures.length) return undefined;
  const compiled = angularEntries(fixtures, dir);
  for (const [id, result] of compiled) {
    if (!result.problems.length) continue;
    const fixture = fixtures.find((entry) => entry.id === id);
    const row = failedRow(fixture, result.problems);
    rows.push(row);
    if (!JSON_OUT) logRow(fixture, row);
  }
  return {
    transformer: angularTransformer(),
    get: (id) => compiled.get(id),
  };
}

/** A fixture whose consumer did not compile, reported as a failed row. */
function failedRow(fixture, problems) {
  const empty = { files: 0, rawBytes: 0, minBytes: 0, gzipBytes: 0 };
  return {
    id: fixture.id,
    name: fixture.name,
    kind: fixture.kind,
    initial: empty,
    lazy: empty,
    total: empty,
    ledger: [],
    entryCode: "",
    entryImports: [],
    resolvedFiles: [],
    unpackedFiles: [],
    peerPolicy: PEER_POLICY.angular,
    externalImports: [],
    buildMs: 0,
    leaked: [],
    missing: [],
    ...fixtureCeilings(fixture),
    resolutionProblems: problems.map(
      (problem) => `did not compile: ${problem}`
    ),
    ok: false,
  };
}

async function main() {
  const coverageProblems = [
    ...vueConsumerCoverageProblems(FIXTURES),
    ...angularConsumerCoverageProblems(FIXTURES),
  ];
  if (coverageProblems.length) throw new Error(coverageProblems.join("\n"));
  const selected = selectedFixtures();
  const packages = workspacePackages();
  const install = packedConsumer(
    fixtureFolders([...selected, plantedLeakFixture()], packages),
    { packages, peers: true }
  );
  const rows = [];

  try {
    const angular = await compiledAngular(selected, install.dir, rows);
    try {
      for (const fixture of selected) {
        if (rows.some((row) => row.id === fixture.id)) continue;
        const row = await measuredRow(fixture, install, angular);
        rows.push(row);
        if (!JSON_OUT) logRow(fixture, row);
      }
    } finally {
      await angular?.transformer.close();
    }
    checkDeclarations(rows, install);
    checkNodeConsumers(rows, selected, install, packages);
    await provePlantedLeak(install);
  } finally {
    install.dispose();
  }
  const over = rows.filter((row) => !row.ok).length;

  if (JSON_OUT) printJson(rows, install.packages);
  else logChecks(rows);

  if (UPDATE) {
    console.log("\nCurrent sizes with ~15% headroom — for the FIXTURES table:");
    for (const r of rows) {
      console.log(
        `  ${r.name.padEnd(34)} initialKB: ${Math.ceil(kib(r.initial.gzipBytes) * 1.15)}` +
          `   totalKB: ${Math.ceil(kib(r.total.gzipBytes) * 1.15)}`
      );
    }
    process.exit(over ? 1 : 0);
  }

  const stale = JSON_OUT ? 0 : countStale(rows);
  exitIfFailed(over, stale);
  if (!JSON_OUT) {
    console.log(`\nAll ${rows.length} fixtures within budget.`);
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();

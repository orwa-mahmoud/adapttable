/** Actual packed Vue entry graphs, shared by the gate and its planted negatives. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { Rolldown } from "tsdown";

import { packageDir } from "./packages.mjs";
import {
  PDF_WRITER_MARKER,
  VUE_LAYOUT_GRAPH_SPECS,
  VUE_OPTIONAL_BASE_MARKERS,
  vueConsumerExternals,
  vueEmittedCss,
  vueGraphProblems,
  XLSX_WRITER_MARKER,
} from "./vue-consumer-fixtures.mjs";
import { buildVueCssConsumer } from "./vue-css-consumer.mjs";
import { buildVueNativeConsumer } from "./vue-native-consumer.mjs";

export async function vueConsumerGraph(fixture, dir) {
  const base = join(packageDir(fixture.pkg), "dist");
  const entries = [join(base, fixture.entryFile ?? "index.js")];
  let code = fixture.code.replaceAll("PKG", entries[0]);
  if (fixture.alsoEntryFile) {
    entries.push(join(base, fixture.alsoEntryFile));
    code = code.replaceAll("ALSO", entries[1]);
  }
  if (fixture.styleEntryFile) {
    const stylesheet = join(base, fixture.styleEntryFile);
    entries.push(stylesheet);
    code = code.replaceAll("STYLE", stylesheet);
  }
  const input = join(
    dir,
    `${fixture.name.replaceAll(/[^a-zA-Z0-9.-]/g, "_")}.mjs`
  );
  writeFileSync(input, code);
  const imports = new Set();
  const plugins = [
    {
      name: "record-vue-consumer-imports",
      resolveId(source) {
        imports.add(source);
        return null;
      },
    },
  ];
  const externals = vueConsumerExternals(fixture.pkg);
  const bundle =
    fixture.styleEntryFile || fixture.consumerHost
      ? undefined
      : await Rolldown.rolldown({
          input,
          external: (id) => externals.some((pattern) => pattern.test(id)),
          logLevel: "silent",
          plugins,
        });
  try {
    let output;
    if (fixture.consumerHost)
      output = await buildVueNativeConsumer(
        fixture,
        input,
        dir,
        false,
        plugins,
        externals
      );
    else if (bundle) output = await bundle.generate({ format: "esm" });
    else
      output = await buildVueCssConsumer(input, dir, false, plugins, externals);
    const chunks = output.output.filter((chunk) => chunk.type === "chunk");
    return {
      code: chunks.map((chunk) => chunk.code).join("\n"),
      css: vueEmittedCss(output.output),
      imports,
      entries,
      modules: chunks.flatMap((chunk) =>
        Object.entries(chunk.modules).map(([id, module]) => ({
          id,
          renderedLength: module.renderedLength,
        }))
      ),
    };
  } finally {
    await bundle?.close();
  }
}

/** Import real production implementations that the normal consumer must reject. */
export function plantedVueConsumers(fixtures) {
  const base = fixtures.find(
    (fixture) => fixture.name === "vue-unstyled · table"
  );
  const pdf = fixtures.find(
    (fixture) => fixture.name === "vue-unstyled · + export-pdf"
  );
  const preset = fixtures.find(
    (fixture) => fixture.name === "vue-unstyled · preset"
  );
  const density = fixtures.find(
    (fixture) => fixture.name === "vue-unstyled · + density"
  );
  if (!base || !pdf || !preset || !density)
    throw new Error(
      "Planted Vue checks require the base, PDF, preset and density consumers"
    );
  const rowActionsBase = fixtures.find(
    (fixture) => fixture.name === "shadcn-vue · table"
  );
  if (!rowActionsBase)
    throw new Error(
      "Planted row-actions checks require the Shadcn Vue base consumer"
    );
  const native = join(packageDir("adapter-vue-unstyled"), "dist");
  const react = join(packageDir("adapter-unstyled"), "dist/index.js");
  const ai = join(packageDir("ai-vue"), "dist/index.js");
  const shell = VUE_LAYOUT_GRAPH_SPECS.find(
    (fixture) => fixture.name === "vue · headless adapter shell"
  );
  if (!shell) throw new Error("Missing headless adapter shell graph");
  const binding = join(packageDir("vue"), "dist/adapter.js");
  const optionalChrome = [
    "CommandPaletteChrome",
    "ContextMenuChrome",
    "SavedViewsPanelChrome",
    "GroupingPanelChrome",
    "RowReorderChrome",
    "TableAssistantChrome",
  ];
  return [
    ...["row-actions-trigger", "row-actions-menu"].map((marker) => ({
      fixture: {
        ...rowActionsBase,
        name: `${rowActionsBase.name} · planted ${marker}`,
        alsoEntryFile: "row-actions.js",
        code: `${rowActionsBase.code}\nexport { rowActions } from "ALSO";`,
      },
      expected: `leaked ${marker}`,
    })),
    ...optionalChrome.map((component) => ({
      fixture: {
        ...base,
        name: `${base.name} · planted ${component}`,
        absent: [...base.absent, ...VUE_OPTIONAL_BASE_MARKERS],
        code: `${base.code}\nexport { ${component} } from ${JSON.stringify(binding)};`,
      },
      expected: `leaked ${component}`,
    })),
    {
      fixture: {
        ...shell,
        name: `${shell.name} · planted table surface`,
        code: `${shell.code}\nexport { DataTableSurfaceChrome } from "PKG";`,
      },
      expected: "leaked DataTableSurfaceChrome",
    },
    {
      fixture: {
        ...density,
        name: `${density.name} · planted AI`,
        code: `${density.code}\nexport { tableAgent } from ${JSON.stringify(ai)};`,
      },
      expected: "leaked tableAgent",
    },
    {
      fixture: {
        ...preset,
        name: `${preset.name} · missing stylesheet`,
        code: preset.code.replace('\nimport "STYLE";', ""),
        styleEntryFile: undefined,
      },
      expected: "missing CSS filters-backdrop",
    },
    {
      fixture: {
        ...base,
        name: `${base.name} · planted PDF`,
        code: `${base.code}\nexport { pdfWriter } from ${JSON.stringify(join(native, "export-pdf.js"))};`,
      },
      expected: `leaked ${PDF_WRITER_MARKER}`,
    },
    {
      fixture: {
        ...pdf,
        name: `${pdf.name} · planted XLSX`,
        code: `${pdf.code}\nexport { xlsxWriter } from ${JSON.stringify(join(native, "export-xlsx.js"))};`,
      },
      expected: `leaked ${XLSX_WRITER_MARKER}`,
    },
    {
      fixture: {
        ...base,
        name: `${base.name} · planted React kit`,
        code: `${base.code}\nexport { DataTable as ReactTable } from ${JSON.stringify(react)};`,
      },
      expected: "reached another kit adapter-unstyled",
    },
  ];
}

export async function checkVueConsumerGraphs(fixtures, dir) {
  const failures = [];
  const evidence = [];
  const negativeEvidence = [];
  for (const fixture of [...fixtures, ...VUE_LAYOUT_GRAPH_SPECS]) {
    const graph = await vueConsumerGraph(fixture, dir);
    failures.push(...vueGraphProblems(fixture, graph));
    evidence.push({
      name: fixture.name,
      entries: graph.entries,
      modules: graph.modules,
    });
  }
  for (const { fixture, expected } of plantedVueConsumers(fixtures)) {
    const graph = await vueConsumerGraph(fixture, dir);
    const problems = vueGraphProblems(fixture, graph);
    negativeEvidence.push({
      name: fixture.name,
      expected,
      problems,
      entries: graph.entries,
      modules: graph.modules,
    });
    if (!problems.some((problem) => problem.includes(expected)))
      failures.push(
        `${fixture.name}: planted negative was not rejected for ${expected}`
      );
  }
  return { failures, evidence, negativeEvidence };
}

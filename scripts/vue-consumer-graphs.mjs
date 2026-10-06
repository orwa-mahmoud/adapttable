/** Actual packed Vue entry graphs, shared by the gate and its planted negatives. */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { Rolldown } from "tsdown";

import { packageDir } from "./packages.mjs";
import {
  PDF_WRITER_MARKER,
  VUE_RUNTIME_EXTERNALS,
  vueEmittedCss,
  vueGraphProblems,
  XLSX_WRITER_MARKER,
} from "./vue-consumer-fixtures.mjs";
import { buildVueCssConsumer } from "./vue-css-consumer.mjs";

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
  const bundle = fixture.styleEntryFile
    ? undefined
    : await Rolldown.rolldown({
        input,
        external: (id) =>
          VUE_RUNTIME_EXTERNALS.some((pattern) => pattern.test(id)),
        logLevel: "silent",
        plugins,
      });
  try {
    const output = bundle
      ? await bundle.generate({ format: "esm" })
      : await buildVueCssConsumer(input, dir, false, plugins);
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
  const native = join(packageDir("adapter-vue-unstyled"), "dist");
  const react = join(packageDir("adapter-unstyled"), "dist/index.js");
  const ai = join(packageDir("ai-vue"), "dist/index.js");
  return [
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
  for (const fixture of fixtures) {
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

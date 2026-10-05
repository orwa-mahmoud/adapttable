/** Packed Vue consumers use existing comparable ceilings, never an invented baseline. */
import { KITS } from "./kits.mjs";

export const VUE_RUNTIME_EXTERNALS = [/^vue($|\/)/];
export const PDF_WRITER_MARKER = "function pdfWriter";
export const XLSX_WRITER_MARKER = "function xlsxWriter";
const writers = [PDF_WRITER_MARKER, XLSX_WRITER_MARKER];
const drawerStyles = ["data-adapttable-filter-dialog", "filters-backdrop"];

/** Each row names the actual published entries and functionality being measured. */
export const VUE_CONSUMER_SPECS = [
  {
    name: "vue · simple table",
    pkg: "vue",
    comparable: "react · simple table",
    code: 'export { useFrontendData, useDataTable } from "PKG";',
    functionality: "Source composable and headless table model",
    present: ["useFrontendData", "useDataTable"],
    absent: writers,
  },
  {
    name: "vue-unstyled · table",
    pkg: "adapter-vue-unstyled",
    hardBaseCeiling: true,
    code: 'export { DataTable } from "PKG";',
    functionality: "Native table without optional features",
    present: ["DataTable"],
    absent: [...writers, "export-progress-surface"],
  },
  {
    name: "vue-unstyled · preset",
    pkg: "adapter-vue-unstyled",
    entryFile: "preset.js",
    comparable: "mui · preset",
    code: 'export { standardFeatures } from "PKG";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: drawerStyles,
    functionality:
      "All standard preset factories and conditional configured members",
    present: ["standardFeatures", "export-progress-surface"],
    absent: writers,
  },
  {
    name: "vue-unstyled · table + preset",
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: "preset.js",
    comparable: "mui · table + preset",
    code: 'export { DataTable } from "PKG";\nexport { standardFeatures } from "ALSO";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: drawerStyles,
    functionality: "Native table and standard preset",
    present: ["DataTable", "standardFeatures", "export-progress-surface"],
    absent: writers,
  },
  ...[
    ["export", "exportCsv", [], writers],
    ["export-csv", "exportCsv", [], writers],
    ["export-pdf", "exportPdf", [PDF_WRITER_MARKER], [XLSX_WRITER_MARKER]],
    ["export-xlsx", "exportXlsx", [XLSX_WRITER_MARKER], [PDF_WRITER_MARKER]],
  ].map(([entry, factory, present, absent]) => ({
    name: `vue-unstyled · + ${entry}`,
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: `${entry}.js`,
    comparable: "mui · + export",
    code: `export { DataTable } from "PKG";\nexport { ${factory} } from "ALSO";`,
    functionality: `Native table, ${factory}, export controller and native progress controls`,
    present: ["DataTable", "export-progress-surface", ...present],
    absent,
  })),
  {
    name: "vue-unstyled · features barrel",
    pkg: "adapter-vue-unstyled",
    alsoEntryFile: "features.js",
    comparable: "mui · all features",
    code: 'export { DataTable } from "PKG";\nexport * from "ALSO";\nimport "STYLE";',
    styleEntryFile: "styles.css",
    presentCss: drawerStyles,
    functionality:
      "Native table and every runtime export in its features barrel",
    present: ["DataTable", ...writers],
    absent: [],
  },
];

export function vueConsumerFixtures(comparables, hardBaseCeiling) {
  return VUE_CONSUMER_SPECS.map((spec) => {
    const comparable = comparables.find(
      (fixture) => fixture.name === spec.comparable
    );
    if (!spec.hardBaseCeiling && !comparable)
      throw new Error(`Missing comparable Vue budget: ${spec.comparable}`);
    return {
      ...spec,
      framework: "vue",
      kind: "vue-consumer",
      kit: spec.pkg === "vue" ? undefined : "vue-unstyled",
      budgetKB: spec.hardBaseCeiling ? hardBaseCeiling : comparable.budgetKB,
    };
  });
}

/** Registry membership must not silently bypass packed-consumer coverage. */
export function vueConsumerCoverageProblems(fixtures, kits = KITS) {
  const problems = [];
  for (const spec of VUE_CONSUMER_SPECS) {
    if (
      fixtures.filter(
        (fixture) => fixture.name === spec.name && fixture.framework === "vue"
      ).length !== 1
    )
      problems.push(`Expected exactly one packed Vue consumer: ${spec.name}`);
  }
  for (const kit of kits.filter(
    (kit) => kit.framework === "vue" && kit.role !== "private"
  )) {
    if (
      !fixtures.some(
        (fixture) =>
          fixture.framework === "vue" &&
          fixture.pkg === kit.name &&
          fixture.hardBaseCeiling
      )
    )
      problems.push(`Missing Vue kit base consumer: ${kit.name}`);
  }
  return problems;
}

function kitForImport(source, kits) {
  return kits.find((kit) => {
    const name = `@adapttable/${kit.name.replace(/^adapter-/, "")}`;
    return (
      source === name ||
      source.startsWith(`${name}/`) ||
      source.includes(`/packages/${kit.framework}/${kit.name}/`)
    );
  });
}

export function vueForeignImport(source, fixture, kits = KITS) {
  const imported = source.replaceAll("\\", "/");
  const kit = kitForImport(imported, kits);
  if (kit && kit.name !== fixture.pkg) return `another kit ${kit.name}`;
  if (
    /^(?:react(?:-dom|-compiler-runtime)?)(?:$|\/)/.test(imported) ||
    /^@angular\//.test(imported) ||
    /^@adapttable\/(?:react|angular|ai-react|ai-angular)(?:$|\/)/.test(
      imported
    ) ||
    /\/packages\/(?:react|angular)\//.test(imported)
  )
    return `another framework ${source}`;
  return undefined;
}

/** Read emitted CSS assets, never a matching string in a JavaScript chunk. */
export function vueEmittedCss(output) {
  return output
    .filter((file) => file.type === "asset" && file.fileName.endsWith(".css"))
    .map((file) =>
      typeof file.source === "string"
        ? file.source
        : new TextDecoder().decode(file.source)
    )
    .join("\n");
}

export function vueMissingCss(fixture, css) {
  return (fixture.presentCss ?? []).filter((marker) => !css.includes(marker));
}

export function vueGraphProblems(fixture, { code, imports, css = "" }) {
  const failures = [];
  for (const marker of fixture.present ?? [])
    if (!new RegExp(`\\b${marker}\\b`).test(code))
      failures.push(`${fixture.name}: missing ${marker}`);
  for (const marker of fixture.absent ?? [])
    if (new RegExp(`\\b${marker}\\b`).test(code))
      failures.push(`${fixture.name}: leaked ${marker}`);
  for (const marker of vueMissingCss(fixture, css))
    failures.push(`${fixture.name}: missing CSS ${marker}`);
  for (const source of imports) {
    const foreign = vueForeignImport(source, fixture);
    if (foreign) failures.push(`${fixture.name}: reached ${foreign}`);
  }
  return failures;
}

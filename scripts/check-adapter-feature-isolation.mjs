#!/usr/bin/env node
/**
 * Prove each adapter feature entry keeps sibling feature engines and other
 * kits outside its consumer graph.
 *
 * Runs after package builds, beside the size budget. The readable bundles are
 * used only as graph evidence; React and kit libraries stay external exactly
 * as they do in bundle-budget.mjs.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Rolldown } from "tsdown";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KITS = [
  "mui",
  "mantine",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "unstyled",
  "shadcn",
];
const KIT_PACKAGES = new Set(KITS.map((kit) => `@adapttable/${kit}`));
const FEATURES = [
  { entry: "editing", marker: "useCellEditing" },
  { entry: "filters", marker: "useFilterTreeChips" },
  { entry: "grouping", marker: "groupedEntriesForStrategy" },
  { entry: "row-detail", marker: "useRowExpansion" },
  { entry: "row-reorder", marker: "ROW_DND_MIME" },
  { entry: "context-menu", marker: "useTableContextMenu" },
  { entry: "command-palette", marker: "useCommandPalette" },
];
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

function adapterPackage(specifier) {
  for (const pkg of KIT_PACKAGES) {
    if (specifier === pkg || specifier.startsWith(`${pkg}/`)) return pkg;
  }
  return undefined;
}

async function graphFor(kit, entry, dir) {
  const input = join(dir, `${kit}-${entry}.js`);
  const target = join(
    ROOT,
    "packages",
    `adapter-${kit}`,
    "dist",
    `${entry}.js`
  );
  writeFileSync(input, `export * from ${JSON.stringify(target)};`);
  const adapterImports = new Set();
  const bundle = await Rolldown.rolldown({
    input,
    external: (id) => EXTERNAL.some((pattern) => pattern.test(id)),
    logLevel: "silent",
    plugins: [
      {
        name: "record-adapter-imports",
        resolveId(source) {
          const pkg = adapterPackage(source);
          if (pkg) adapterImports.add(pkg);
          return null;
        },
      },
    ],
  });
  const output = await bundle.generate({ format: "esm" });
  await bundle.close();
  return {
    code: output.output
      .filter((chunk) => chunk.type === "chunk")
      .map((chunk) => chunk.code)
      .join("\n"),
    adapterImports,
  };
}

const dir = mkdtempSync(join(tmpdir(), "adapttable-feature-graphs-"));
const failures = [];

try {
  for (const kit of KITS) {
    for (const feature of FEATURES) {
      const { code, adapterImports } = await graphFor(kit, feature.entry, dir);
      if (!new RegExp(`\\b${feature.marker}\\b`).test(code)) {
        failures.push(
          `${kit}/${feature.entry}: own marker ${feature.marker} is absent`
        );
      }
      for (const sibling of FEATURES) {
        if (
          sibling === feature ||
          !new RegExp(`\\b${sibling.marker}\\b`).test(code)
        ) {
          continue;
        }
        failures.push(
          `${kit}/${feature.entry}: reached sibling ${sibling.entry} marker ${sibling.marker}`
        );
      }

      const allowed = new Set([`@adapttable/${kit}`]);
      // shadcn is deliberately the Tailwind styling layer over the unstyled
      // native-control renderer. It may reach that same feature entry, never
      // a sibling; all other kits are independent renderers.
      if (kit === "shadcn") allowed.add("@adapttable/unstyled");
      for (const imported of adapterImports) {
        if (!allowed.has(imported)) {
          failures.push(
            `${kit}/${feature.entry}: reached another kit ${imported}`
          );
        }
      }
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(
    `\n✗ adapter feature isolation: ${failures.length} graph violation(s):\n`
  );
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(
  `✓ adapter feature isolation: ${String(KITS.length * FEATURES.length)} packed graphs, no sibling-feature or unintended cross-kit reachability`
);

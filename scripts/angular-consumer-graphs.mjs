/**
 * Graph checks for the packed Angular consumers.
 *
 * The size budget already measures every fixture. This adds the checks a byte
 * count cannot make: each kit's base entry imports only the binding subpaths
 * it declares, an optional controller planted into a base table is caught,
 * and a feature that is turned on is actually present in the linked graph.
 *
 * Both run through the same linker and bundler as the budget, over the same
 * packed install, so a graph that passes here is the graph the bytes describe.
 */
import {
  angularTransformer,
  bundleAngularConsumer,
} from "./angular-consumer-build.mjs";
import {
  angularBaseImports,
  angularConsumerFixtures,
  angularKits,
} from "./angular-consumer-fixtures.mjs";
import { inspectOutputs } from "./bundle-budget.mjs";
import { caseId } from "./consumer-fixtures.mjs";

/** The binding subpaths every Angular kit's base entry imports today. */
export const ANGULAR_BASE_IMPORTS = [
  "@adapttable/angular",
  "@adapttable/angular/adapter",
  "@adapttable/angular/pivot",
];

/**
 * A base table whose template names an optional controller it never renders.
 * The reference is a constructor argument, which the compiler has to keep, so
 * the controller survives into the bundle. The absence check must reject it; a
 * pass here means the check cannot see a planted leak.
 */
export function plantedControllerFixture(fixtures = angularConsumerFixtures()) {
  const base = fixtures.find(
    (fixture) => fixture.name === "angular · angular-unstyled table"
  );
  if (!base) throw new Error("The planted check needs the unstyled base table");
  const name = `${base.name} · planted controller`;
  // The template calls the controller, so the compiler keeps it. A plain
  // import would be tree-shaken and the check would pass for the wrong reason.
  const planted = base.code
    .replace(
      'import { Component } from "@angular/core";',
      'import { Component } from "@angular/core";\nimport { injectIsMobile } from "@adapttable/angular";'
    )
    .replace(
      "<adapt-data-table",
      "<span>{{ planted() }}</span>\n    <adapt-data-table"
    )
    .replace(
      "readonly features = [];",
      "readonly features = [];\n  readonly planted = injectIsMobile;"
    );
  return {
    ...base,
    name,
    id: caseId(name),
    absent: [...base.absent, "injectIsMobile"],
    code: planted,
  };
}

/** A kit base entry that imports a binding subpath outside the known set. */
export function baseImportProblems(kits = angularKits()) {
  return kits.flatMap((kit) =>
    angularBaseImports(kit.folder)
      .filter((specifier) => !ANGULAR_BASE_IMPORTS.includes(specifier))
      .map(
        (specifier) =>
          `${kit.name} base imports ${specifier}, which is not a known binding subpath`
      )
  );
}

/**
 * Bundle one compiled fixture and report the markers that leaked or went
 * missing. `entry` is the bootstrap file `ngc` emitted for it.
 */
async function graphProblems(fixture, entry, dir, transformer) {
  const [, readable] = await bundleAngularConsumer(entry, {
    dir,
    externals: [/^@angular\//, /^rxjs($|\/)/, /^tslib($|\/)/],
    transformer,
  });
  return inspectOutputs(fixture, readable.output);
}

/**
 * The graph verdicts for the Angular fixtures: base-import violations, the
 * planted controller, and each feature's presence. `dir` is the packed
 * consumer the fixtures were compiled in.
 */
export async function angularGraphProblems(dir, compiled) {
  const problems = [...baseImportProblems()];
  const transformer = angularTransformer();
  try {
    const planted = plantedControllerFixture();
    const plantedGraph = await graphProblems(
      planted,
      compiled.get(planted.id).entry,
      dir,
      transformer
    );
    if (!plantedGraph.leaked.includes("injectIsMobile")) {
      problems.push("the planted controller was not caught");
    }
    for (const fixture of angularConsumerFixtures()) {
      if (!fixture.present?.length) continue;
      const graph = await graphProblems(
        fixture,
        compiled.get(caseId(fixture.name)).entry,
        dir,
        transformer
      );
      for (const marker of graph.missing) {
        problems.push(
          `${fixture.name}: ${marker} is missing from the linked graph`
        );
      }
    }
  } finally {
    await transformer.close();
  }
  return problems;
}

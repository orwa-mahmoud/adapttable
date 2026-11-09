import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { compileAngularConsumers } from "./angular-consumer-build.mjs";
import {
  angularBaseImports,
  angularConsumerCoverageProblems,
  angularConsumerFixtures,
  angularKits,
} from "./angular-consumer-fixtures.mjs";
import {
  ANGULAR_BASE_IMPORTS,
  angularGraphProblems,
  baseImportProblems,
  plantedControllerFixture,
} from "./angular-consumer-graphs.mjs";
import { caseId, fixtureFolders, FIXTURES } from "./consumer-fixtures.mjs";
import { packedConsumer } from "./packed-consumers.mjs";

describe("angular consumer fixtures", () => {
  it("covers every Angular kit plus the headless table and each feature", () => {
    const fixtures = angularConsumerFixtures();
    const kits = angularKits();
    assert.ok(
      kits.length >= 9,
      `expected the Angular kits, got ${kits.length}`
    );
    for (const kit of kits) {
      const base = fixtures.filter((fixture) => fixture.pkg === kit.folder);
      assert.ok(base.length >= 1, `${kit.name} has no base consumer`);
    }
    for (const feature of [
      "grouping",
      "editing",
      "filters",
      "virtualize",
      "preset",
    ]) {
      assert.ok(
        fixtures.some((fixture) => fixture.name.includes(feature)),
        `no fixture turns on ${feature}`
      );
    }
    assert.ok(fixtures.some((fixture) => fixture.name.includes("aggregation")));
    assert.ok(fixtures.some((fixture) => fixture.name.includes("combination")));
    assert.ok(fixtures.some((fixture) => fixture.pkg === "angular"));
    assert.deepEqual(angularConsumerCoverageProblems(FIXTURES), []);
  });

  it("fails when an Angular kit base disappears from the budget", () => {
    const kept = FIXTURES.filter(
      (fixture) => fixture.pkg !== "adapter-angular-unstyled"
    );
    const problems = angularConsumerCoverageProblems(kept);
    assert.ok(
      problems.some((problem) => problem.includes("angular-unstyled")),
      problems.join("\n")
    );
  });

  it("gives every fixture its own case id and a ceiling above zero", () => {
    const ids = new Set();
    for (const fixture of angularConsumerFixtures()) {
      const id = caseId(fixture.name);
      assert.equal(ids.has(id), false, `${fixture.name} shares ${id}`);
      ids.add(id);
      assert.ok(fixture.initialKB > 0 && fixture.totalKB >= fixture.initialKB);
      assert.ok(fixture.appKB > fixture.initialKB, fixture.name);
      assert.equal(fixture.framework, "angular");
    }
  });

  it("imports each feature from the fixture's own kit", () => {
    const fixtures = angularConsumerFixtures();
    const grouping = fixtures.find((fixture) =>
      fixture.name.includes("+ grouping")
    );
    assert.match(
      grouping.code,
      /from "@adapttable\/angular-unstyled\/grouping"/
    );
    const material = fixtures.find(
      (fixture) => fixture.pkg === "adapter-material"
    );
    assert.match(material.code, /from "@adapttable\/angular-material"/);
    assert.equal(material.code.includes("angular-unstyled"), false);
  });

  it("reads each kit base entry's binding imports from its build", () => {
    for (const kit of angularKits()) {
      const imports = angularBaseImports(kit.folder);
      assert.deepEqual(imports, ANGULAR_BASE_IMPORTS, kit.name);
    }
    assert.deepEqual(baseImportProblems(), []);
  });

  it("plants a controller the base table does not use", () => {
    const planted = plantedControllerFixture();
    assert.match(planted.code, /injectIsMobile/);
    assert.ok(planted.absent.includes("injectIsMobile"));
    const base = angularConsumerFixtures().find(
      (fixture) => fixture.name === "angular · angular-unstyled table"
    );
    assert.equal(base.code.includes("injectIsMobile"), false);
  });
});

describe("angular consumer graphs", () => {
  let install;

  before(() => {
    const fixtures = [...angularConsumerFixtures(), plantedControllerFixture()];
    install = packedConsumer(fixtureFolders(fixtures), { peers: true });
  });

  after(() => install?.dispose());

  it("compiles every fixture and catches the planted controller", async () => {
    const fixtures = [...angularConsumerFixtures(), plantedControllerFixture()];
    const compiled = compileAngularConsumers(
      install.dir,
      fixtures.map((fixture) => ({
        id: caseId(fixture.name),
        code: fixture.code,
      }))
    );
    for (const fixture of fixtures) {
      const result = compiled.get(caseId(fixture.name));
      assert.deepEqual(result.problems, [], fixture.name);
    }
    const scratch = mkdtempSync(join(tmpdir(), "angular-graphs-"));
    try {
      const problems = await angularGraphProblems(install.dir, compiled);
      assert.deepEqual(problems, [], problems.join("\n"));
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("fails a consumer whose packed entry lost its component", () => {
    const fixture = angularConsumerFixtures().find(
      (entry) => entry.name === "angular · angular-unstyled table"
    );
    const declaration = join(
      install.dir,
      "node_modules/@adapttable/angular-unstyled/dist/types/adapttable-angular-unstyled.d.ts"
    );
    const original = readFileSync(declaration, "utf8");
    writeFileSync(
      declaration,
      original.replace(
        "export declare class AdaptDataTable",
        "export declare class AdaptDataTableRemoved"
      )
    );
    try {
      const result = compileAngularConsumers(install.dir, [
        { id: "broken", code: fixture.code },
      ]).get("broken");
      assert.ok(
        result.problems.some((problem) => problem.includes("AdaptDataTable")),
        result.problems.join("\n")
      );
    } finally {
      writeFileSync(declaration, original);
    }
    // The workspace source still exports the component, so only the packed
    // declaration the consumer compiled against was broken.
    assert.match(
      readFileSync(
        new URL(
          "../packages/angular/adapter-angular-unstyled/dist/types/adapttable-angular-unstyled.d.ts",
          import.meta.url
        ),
        "utf8"
      ),
      /export declare class AdaptDataTable\b/
    );
  });
});

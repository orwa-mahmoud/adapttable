import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractWithReportRetention,
  shouldRetainEntryDeclarations,
} from "./api-report-retention.mjs";
import { classifyForgottenExport } from "./api-warnings.mjs";

const report = (body) => `\n\`\`\`ts\n${body}\n\`\`\`\n`;
const incomplete = report("export type Public = Public_2;");
const complete = report(
  "interface Public_2 { id: string } export type Public = Public_2;"
);
const warning = (name) => ({
  messageId: "ae-forgotten-export",
  text: `The symbol "${name}" needs to be exported`,
  sourceFilePath: "entry.d.ts",
  sourceFileLine: 2,
  sourceFileColumn: 1,
});

function extract(reports, messages, options = {}) {
  const calls = [];
  const findings = [];
  const compilerState = {};
  let fresh;
  const result = extractWithReportRetention({
    publishedBases: new Set(["Public"]),
    includeForgottenExports: false,
    onMessage(message) {
      findings.push(message.text);
    },
    readReport: () => fresh,
    invoke(call) {
      const index = calls.length;
      calls.push(call);
      fresh = reports[index];
      for (const message of messages[index] ?? [])
        call.messageCallback(message);
      return { succeeded: true, compilerState };
    },
    ...options,
  });
  return { result, calls, findings, compilerState };
}

test("retention preserves preflight blockers even when the final extraction drops their warnings", () => {
  const firstPrivate = warning("PrivateMember");
  const repeatedCopy = warning("Public_2");
  const run = extract(
    [incomplete, complete],
    [[warning("Public_2"), firstPrivate], [repeatedCopy]]
  );
  assert.equal(run.calls.length, 2);
  assert.equal(run.calls[0].includeForgottenExports, false);
  assert.equal(run.calls[1].includeForgottenExports, true);
  assert.equal(run.calls[1].compilerState, run.compilerState);
  assert.deepEqual(run.findings, [warning("Public_2").text, firstPrivate.text]);
  assert.equal(repeatedCopy.handled, true);
  assert.equal(run.result.retainedTargets, 1);
  assert.deepEqual(run.result.missingTargets, []);
});

test("the retained pass adds new findings without losing or recounting the first pass", () => {
  const run = extract(
    [incomplete, complete],
    [[warning("Public_2")], [warning("Public_2"), warning("NewPrivate")]]
  );
  assert.deepEqual(run.findings, [
    warning("Public_2").text,
    warning("NewPrivate").text,
  ]);
});

test("unrelated or already complete entries remain single-pass", () => {
  for (const options of [
    { publishedBases: new Set() },
    { includeForgottenExports: true },
  ]) {
    const run = extract([incomplete], [[]], options);
    assert.equal(run.calls.length, 1);
    assert.equal(run.result.retainedTargets, 0);
  }
  const run = extract([complete], [[]]);
  assert.equal(run.calls.length, 1);
});

test("final dangling targets and alias cycles cannot count as successful retention", () => {
  for (const final of [
    incomplete,
    report("type Public_2 = Public; export type Public = Public_2;"),
  ]) {
    const run = extract([incomplete, final], [[], []]);
    assert.equal(run.result.retainedTargets, 0);
    assert.equal(run.result.missingTargets.length, 1);
  }
});

test("invalid reports and alias cycles do not qualify for a retention retry", () => {
  for (const first of [
    "not a report",
    report("type Public_2 = Public; export type Public = Public_2;"),
  ]) {
    const run = extract([first], [[]]);
    assert.equal(run.calls.length, 1);
    assert.equal(run.result.retainedTargets, 0);
    assert.equal(run.result.missingTargets.length, 1);
  }
});

test("intermediate copy notices do not claim a final public API change", () => {
  const notice = () => ({
    messageId: "console-api-report-copied",
    text: "You have changed the API signature for this project. Updating report.api.md",
  });
  const repeated = notice();
  const run = extract([incomplete, complete], [[notice()], [repeated]]);
  assert.deepEqual(run.findings, [
    "Updated API report extraction output: report.api.md",
  ]);
  assert.equal(repeated.handled, true);
});

test("same-spelled private declarations at different origins remain separate blockers", () => {
  const observed = [];
  const classifyMessage = (message) => {
    const symbol = /"([^"]+)"/.exec(message.text)?.[1];
    observed.push({
      symbol,
      origin: message.sourceFilePath,
      kind: classifyForgottenExport({
        symbol,
        report: "fixture.api.md",
        isMainEntry: true,
        exports: new Set(["Public"]),
      }).kind,
    });
  };
  const firstPrivate = {
    ...warning("Private_2"),
    sourceFilePath: "first.d.ts",
  };
  const secondPrivate = {
    ...warning("Private_2"),
    sourceFilePath: "second.d.ts",
  };
  const run = extract(
    [incomplete, complete],
    [
      [warning("Public_2"), firstPrivate],
      [warning("Public_2"), secondPrivate],
    ],
    { onMessage: classifyMessage }
  );
  assert.equal(run.result.retainedTargets, 1);
  assert.deepEqual(observed, [
    { symbol: "Public_2", origin: "entry.d.ts", kind: "published" },
    { symbol: "Private_2", origin: "first.d.ts", kind: "front-door" },
    { symbol: "Private_2", origin: "second.d.ts", kind: "front-door" },
  ]);
  assert.equal(secondPrivate.handled, undefined);
});

test("warning events with changed origins remain distinct without declaration identity proof", () => {
  const relocated = { ...warning("Public_2"), sourceFileLine: 99 };
  const run = extract(
    [incomplete, complete],
    [[warning("Public_2")], [relocated]]
  );
  assert.equal(run.findings.length, 2);
  assert.equal(run.result.retainedTargets, 1);
  assert.equal(relocated.handled, undefined);
  const otherEntry = extract([incomplete], [[warning("Public_2")]], {
    publishedBases: new Set(),
    onMessage(message) {
      assert.equal(
        classifyForgottenExport({
          symbol: /"([^"]+)"/.exec(message.text)?.[1],
          report: "other.api.md",
          isMainEntry: true,
          exports: new Set(),
        }).kind,
        "front-door"
      );
    },
  });
  assert.equal(otherEntry.calls.length, 1);
});

test("split Angular and Vue bindings retain canonical sibling declarations by default", () => {
  for (const dir of ["angular", "vue"]) {
    assert.equal(
      shouldRetainEntryDeclarations({
        dir,
        includeForgottenExports: false,
        hasValueAliases: false,
      }),
      true
    );
  }
});

test("binding retention does not include unrelated packages or native kits", () => {
  for (const dir of [
    "core",
    "react",
    "ai-angular",
    "adapter-angular-unstyled",
    "adapter-vue-unstyled",
    "adapter-spartan",
    "angular-extra",
  ]) {
    assert.equal(
      shouldRetainEntryDeclarations({
        dir,
        includeForgottenExports: false,
        hasValueAliases: false,
      }),
      false
    );
    assert.equal(
      shouldRetainEntryDeclarations({
        dir,
        includeForgottenExports: true,
        hasValueAliases: false,
      }),
      true
    );
    assert.equal(
      shouldRetainEntryDeclarations({
        dir,
        includeForgottenExports: false,
        hasValueAliases: true,
      }),
      true
    );
  }
});

test("default binding retention keeps unresolved ownership warnings visible", () => {
  for (const dir of ["angular", "vue"]) {
    const run = extract([complete], [[warning("CanonicalSibling")]], {
      includeForgottenExports: shouldRetainEntryDeclarations({
        dir,
        includeForgottenExports: false,
        hasValueAliases: false,
      }),
    });
    assert.equal(run.calls.length, 1);
    assert.equal(run.calls[0].includeForgottenExports, true);
    assert.deepEqual(run.findings, [warning("CanonicalSibling").text]);
  }
});

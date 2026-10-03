import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";

import {
  createDemoSession,
  createLatestDemoTask,
  demoOptionSignature,
} from "../apps/showcase/src/angular/demoTransitions.mjs";

it("retains host edits independently for each dataset through provider recreation", () => {
  const session = createDemoSession();
  const original = [{ id: "1", name: "Original" }];
  const edited = [{ id: "1", name: "Edited" }];
  assert.equal(
    session.read("rows:people", () => original),
    original
  );
  session.write("rows:people", edited);
  session.read("rows:large", () => [{ id: "2" }]);
  assert.equal(
    session.read("rows:people", () => {
      throw new Error("Must not reseed edited rows");
    }),
    edited
  );
  session.write("nextId", 100001);
  assert.equal(
    session.read("nextId", () => 100000),
    100001
  );
});
it("leaves table query history to the binding and rebuilds for host option history", () => {
  const baseline =
    "https://example.test/angular/demo/all-options/?kit=material&lab.q=ada&lab.page=2";
  assert.equal(
    demoOptionSignature(baseline),
    demoOptionSignature(
      baseline.replace("lab.q=ada&lab.page=2", "lab.q=grace&lab.page=3")
    )
  );
  for (const changed of [
    "kit=ng-zorro",
    "locale=ar",
    "editing-mode=batch",
    "options=open",
  ])
    assert.notEqual(
      demoOptionSignature(baseline),
      demoOptionSignature(
        `${baseline}&${changed}`.replace(
          "kit=material&lab",
          changed.startsWith("kit=") ? "lab" : "kit=material&lab"
        )
      )
    );
});
it("serializes transitions and drops stale asynchronous kit loads", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const commits = [];
  let calls = 0;
  const request = createLatestDemoTask(async (isCurrent) => {
    const id = ++calls;
    if (id === 1) await gate;
    if (isCurrent()) commits.push(id);
  });
  const first = request();
  const latest = request();
  release();
  await Promise.all([first, latest]);
  assert.deepEqual(commits, [2]);
  await request();
  assert.deepEqual(commits, [2, 3]);
});
it("allows another transition after a failed attempt", async () => {
  let fail = true;
  const request = createLatestDemoTask(async () => {
    if (fail) throw new Error("Kit unavailable");
  });
  await assert.rejects(request(), /Kit unavailable/);
  fail = false;
  await request();
});
it("keeps host option and saved-view updates in this document", () => {
  const page = readFileSync(
    new URL("../apps/showcase/src/angular/demoPage.ts", import.meta.url),
    "utf8"
  );
  const entry = readFileSync(
    new URL("../apps/showcase/src/angular/entry-demo.ts", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(page, /location\.reload\(/);
  assert.doesNotMatch(page, /location\.assign\(url\.href\)/);
  assert.match(page, /registerDemoCapture/);
  assert.match(entry, /application\?\.destroy\(\)/);
  assert.match(entry, /refreshShowcasePresentation\(\)/);
  assert.match(entry, /"popstate"/);
});

it("reverses a blocked history traversal without overwriting either entry", async () => {
  const { createDemoHistory } =
    await import("../apps/showcase/src/angular/demoTransitions.mjs");
  const entries = [
    {
      href: "https://example.test/angular/demo/?kit=unstyled",
      state: { external: "kept" },
    },
  ];
  let position = 0;
  const history = createDemoHistory({
    href: () => entries[position].href,
    state: () => entries[position].state,
    push: (state, href) => {
      entries.splice(position + 1);
      entries.push({ state, href });
      position++;
    },
    replace: (state, href) => {
      entries[position] = { state, href };
    },
    go: (delta) => {
      position += delta;
    },
  });
  history.navigate(new URL("https://example.test/angular/demo/?kit=material"));
  history.commit();
  history.adapter.setSearch("kit=material&live.q=Ada", { push: true });
  let notifications = 0;
  history.adapter.subscribe(() => notifications++);
  const before = structuredClone(entries);
  position--;
  assert.equal(history.pop(true), false);
  assert.equal(position, 2);
  assert.equal(history.pop(true), false); // Restoration event is also suppressed.
  assert.deepEqual(entries, before);
  assert.equal(notifications, 0);
  assert.equal(entries[0].state.external, "kept");
  position--;
  assert.equal(history.pop(false), true);
  assert.equal(position, 1);
  assert.equal(notifications, 1);
});

it("rolls a late-blocked kit load back to the mounted provider's original entry", async () => {
  const { createDemoHistory } =
    await import("../apps/showcase/src/angular/demoTransitions.mjs");
  const entries = [
    { href: "https://example.test/angular/demo/?kit=unstyled", state: null },
  ];
  let position = 0;
  const history = createDemoHistory({
    href: () => entries[position].href,
    state: () => entries[position].state,
    push: (state, href) => {
      entries.splice(position + 1);
      entries.push({ state, href });
      position++;
    },
    replace: (state, href) => {
      entries[position] = { state, href };
    },
    go: (delta) => {
      position += delta;
    },
  });
  history.navigate(new URL("https://example.test/angular/demo/?kit=material"));
  history.navigate(new URL("https://example.test/angular/demo/?kit=ng-zorro"));
  history.reject();
  assert.equal(position, 0);
  assert.equal(history.pop(true), false);
  assert.equal(entries.length, 3);
  assert.ok(entries[2].href.endsWith("kit=ng-zorro"));
});

it("detects active cell, row, batch and conflicted-batch edit surfaces", async () => {
  const { hasPendingDemoEdits, PENDING_EDIT_SELECTOR } =
    await import("../apps/showcase/src/angular/demoTransitions.mjs");
  for (const part of [
    "edit-cell-editor",
    "row-edit-save",
    "row-edit-cancel",
    "batch-edit-save",
    "batch-edit-cancel",
    "batch-edit-bar",
  ])
    assert.ok(PENDING_EDIT_SELECTOR.includes(part));
  assert.equal(hasPendingDemoEdits({ querySelector: () => null }), false);
  assert.equal(hasPendingDemoEdits({ querySelector: () => ({}) }), true);
});

it("guards saved-view actions and provider destruction before either can discard a draft", () => {
  const transitions = readFileSync(
    new URL(
      "../apps/showcase/src/angular/demoTransitions.mjs",
      import.meta.url
    ),
    "utf8"
  );
  const entry = readFileSync(
    new URL("../apps/showcase/src/angular/entry-demo.ts", import.meta.url),
    "utf8"
  );
  const template = readFileSync(
    new URL("../apps/showcase/src/angular/demoPage.html", import.meta.url),
    "utf8"
  );
  const guard = transitions.slice(
    transitions.indexOf("export function refreshDemo"),
    transitions.indexOf("export function navigateDemo")
  );
  assert.ok(guard.indexOf("canReplaceDemo()") < guard.indexOf("action()"));
  assert.ok(
    entry.indexOf("if (!canReplaceDemo()) return") <
      entry.indexOf("application?.destroy()")
  );
  assert.match(entry, /event.stopImmediatePropagation\(\)/);
  assert.match(entry, /"beforeunload"/);
  assert.match(template.replace(/\s+/g, " "), /switching resets undo history/);
});

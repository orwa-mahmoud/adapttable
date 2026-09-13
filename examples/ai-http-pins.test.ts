import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createExamplePinStore,
  EXAMPLE_PIN_MAX_SESSIONS,
  EXAMPLE_PIN_TTL_MS,
} from "./ai-http-pins.ts";

function pin(tableId = "orders") {
  return { tableId, catalog: [], manifest: { viewRevision: 1 } };
}

describe("the example backend's pin store", () => {
  it("answers only the session a pin was issued for", () => {
    const store = createExamplePinStore<unknown[], { viewRevision: number }>();
    store.set("sess-a", pin());

    assert.ok(store.get("sess-a"));
    // No table-name fallback: knowing the table is not knowing the session.
    assert.equal(store.get("sess-b"), undefined);
    assert.equal(store.get(undefined), undefined);
  });

  it("drops a pin that has idled past its lifetime", () => {
    const clock = { now: 0 };
    const store = createExamplePinStore<unknown[], { viewRevision: number }>({
      ttlMs: 1_000,
      now: () => clock.now,
    });
    store.set("sess-a", pin());

    clock.now = 999;
    assert.ok(store.get("sess-a"));
    clock.now = 2_000;
    assert.equal(store.get("sess-a"), undefined);
  });

  it("keeps a session that is still being used", () => {
    const clock = { now: 0 };
    const store = createExamplePinStore<unknown[], { viewRevision: number }>({
      ttlMs: 1_000,
      now: () => clock.now,
    });
    store.set("sess-a", pin());

    // Touched just inside its window each time, so it never idles out.
    for (let step = 0; step < 5; step += 1) {
      clock.now += 900;
      assert.ok(store.get("sess-a"));
    }
  });

  it("evicts the least recently used session past its ceiling", () => {
    const clock = { now: 0 };
    const store = createExamplePinStore<unknown[], { viewRevision: number }>({
      maxSessions: 2,
      now: () => clock.now,
    });
    store.set("a", pin());
    clock.now += 1;
    store.set("b", pin());
    clock.now += 1;
    // Touching a leaves b the oldest.
    store.get("a");
    clock.now += 1;
    store.set("c", pin());

    assert.ok(store.get("a"));
    assert.ok(store.get("c"));
    assert.equal(store.get("b"), undefined);
    assert.equal(store.size(), 2);
  });

  it("replaces a session's pin rather than holding two", () => {
    const store = createExamplePinStore<unknown[], { viewRevision: number }>();
    store.set("sess-a", pin("orders"));
    assert.equal(store.get("sess-a")?.tableId, "orders");

    store.set("sess-a", pin("invoices"));
    assert.equal(store.get("sess-a")?.tableId, "invoices");
    assert.equal(store.size(), 1);
  });

  it("ships bounds a demo cannot leak past", () => {
    assert.equal(EXAMPLE_PIN_MAX_SESSIONS, 100);
    assert.equal(EXAMPLE_PIN_TTL_MS, 30 * 60 * 1000);
  });
});

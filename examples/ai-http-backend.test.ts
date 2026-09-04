import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AGENT_HTTP_SCHEMA, type AgentHttpRequest } from "@adapttable/ai/http";

import {
  exampleRequiresToken,
  handleExampleAgentTurn,
} from "./ai-http-backend.ts";

function request(): AgentHttpRequest {
  return {
    schemaVersion: AGENT_HTTP_SCHEMA,
    kind: "turn",
    tableId: "orders",
    message: "Go to page 2",
    catalog: [],
    manifest: {
      schemaVersion: AGENT_HTTP_SCHEMA,
      tableId: "orders",
      viewRevision: 1,
      capabilities: [],
      columns: [],
      rowAddressing: { scope: "visible", key: "rowKey" },
      limits: { pageMax: 10, readMax: 50 },
      policy: { write: "allow", approval: "writes", commit: "stage" },
      source: {
        fullDataset: false,
        grouping: false,
        selectAcrossPages: false,
        exportScope: "page",
        totalCount: "loaded",
      },
    },
  };
}

describe("exampleRequiresToken", () => {
  it("requires a token only for a non-loopback bind", () => {
    assert.equal(exampleRequiresToken("127.0.0.1", ""), false);
    assert.equal(exampleRequiresToken("localhost", ""), false);
    assert.equal(exampleRequiresToken("::1", ""), false);
    assert.equal(exampleRequiresToken("0.0.0.0", ""), true);
    assert.equal(exampleRequiresToken("0.0.0.0", "secret"), false);
  });
});

describe("handleExampleAgentTurn", () => {
  it("mints a unique action id per turn even when the model repeats one", async () => {
    const complete = () =>
      Promise.resolve(
        JSON.stringify({
          text: "Moved.",
          actions: [
            {
              key: "view.setPage",
              args: { page: 2 },
              idempotencyKey: "orders:view.setPage:0",
            },
          ],
        })
      );
    const signal = new AbortController().signal;
    const first = await handleExampleAgentTurn(request(), complete, signal);
    const second = await handleExampleAgentTurn(request(), complete, signal);
    assert.notEqual(
      first.actions?.[0]?.idempotencyKey,
      second.actions?.[0]?.idempotencyKey
    );
    assert.match(first.actions?.[0]?.idempotencyKey ?? "", /^[0-9a-f]+:0$/);
  });
});

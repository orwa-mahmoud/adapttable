import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AGENT_HTTP_SCHEMA, type AgentHttpRequest } from "@adapttable/ai/http";

import {
  completeForProvider,
  exampleConfigError,
  exampleRequiresToken,
  handleExampleAgentTurn,
} from "./ai-http-backend.ts";

function request(kind: "hello" | "turn" = "turn"): AgentHttpRequest {
  return {
    schemaVersion: AGENT_HTTP_SCHEMA,
    kind,
    tableId: "orders",
    message: kind === "turn" ? "Go to page 2" : undefined,
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
  it("returns a typed hello without calling the provider", async () => {
    const complete = () => {
      throw new Error("provider must not run on hello");
    };
    const hello = await handleExampleAgentTurn(
      request("hello"),
      complete,
      new AbortController().signal
    );
    assert.equal(hello.ok, true);
    assert.match(hello.text ?? "", /Connected/i);
  });

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

  it("rejects malformed provider JSON", async () => {
    const complete = () => Promise.resolve('"not-an-object"');
    await assert.rejects(
      handleExampleAgentTurn(request(), complete, new AbortController().signal),
      /non-object/
    );
  });

  it("forwards needs and text-only replies from mocked providers", async () => {
    const complete = () =>
      Promise.resolve(
        JSON.stringify({
          text: "Need a guide.",
          needs: { describe: ["edit.cells"] },
        })
      );
    const reply = await handleExampleAgentTurn(
      request(),
      complete,
      new AbortController().signal
    );
    assert.equal(reply.text, "Need a guide.");
    assert.deepEqual(reply.needs?.describe, ["edit.cells"]);
  });
});

describe("completeForProvider", () => {
  for (const provider of [
    "openai",
    "anthropic",
    "gemini",
    "deepseek",
  ] as const) {
    it(`registers a complete function for ${provider}`, () => {
      assert.equal(typeof completeForProvider(provider), "function");
    });
  }
});

/** Capture one mocked HTTP exchange without reaching a provider. */
function mockFetch(payload: unknown, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = ((url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return Promise.resolve(
      new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json" },
      })
    );
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

/** The JSON body a provider adapter posted, as text. */
function bodyText(init: RequestInit): string {
  return typeof init.body === "string" ? init.body : "";
}

const args = {
  system: "You drive a table.",
  user: "Go to page 2",
  signal: new AbortController().signal,
};

/** Each provider's own success shape, error shape and empty-content shape. */
const PROVIDER_WIRE = {
  openai: {
    host: "api.openai.com",
    ok: { choices: [{ message: { content: '{"text":"done"}' } }] },
    empty: { choices: [{ message: {} }] },
  },
  deepseek: {
    host: "api.deepseek.com",
    ok: { choices: [{ message: { content: '{"text":"done"}' } }] },
    empty: { choices: [] },
  },
  anthropic: {
    host: "api.anthropic.com",
    ok: { content: [{ type: "text", text: '{"text":"done"}' }] },
    empty: { content: [{ type: "thinking" }] },
  },
  gemini: {
    host: "generativelanguage.googleapis.com",
    ok: {
      candidates: [{ content: { parts: [{ text: '{"text":"done"}' }] } }],
    },
    empty: { candidates: [] },
  },
} as const;

describe("provider adapters over mocked HTTP", () => {
  for (const [provider, wire] of Object.entries(PROVIDER_WIRE)) {
    it(`${provider} posts to its own endpoint and reads its own body shape`, async () => {
      const mock = mockFetch(wire.ok);
      try {
        const text = await completeForProvider(provider)(args);
        assert.equal(text, '{"text":"done"}');
        assert.equal(mock.calls.length, 1);
        const call = mock.calls[0]!;
        assert.ok(
          call.url.includes(wire.host),
          `${provider} posted to ${call.url}`
        );
        assert.equal(call.init.method, "POST");
        // The user turn always reaches the provider.
        assert.ok(bodyText(call.init).includes("Go to page 2"));
      } finally {
        mock.restore();
      }
    });

    it(`${provider} surfaces a provider error message`, async () => {
      const mock = mockFetch({ error: { message: "quota exhausted" } }, 429);
      try {
        await assert.rejects(
          completeForProvider(provider)(args),
          /quota exhausted/
        );
      } finally {
        mock.restore();
      }
    });

    it(`${provider} rejects a well-formed reply carrying no content`, async () => {
      const mock = mockFetch(wire.empty);
      try {
        await assert.rejects(completeForProvider(provider)(args), /no content/);
      } finally {
        mock.restore();
      }
    });
  }

  it("keeps the API key out of the anthropic request body", async () => {
    const mock = mockFetch(PROVIDER_WIRE.anthropic.ok);
    try {
      await completeForProvider("anthropic")(args);
      const call = mock.calls[0]!;
      const headers = call.init.headers as Record<string, string>;
      assert.ok("x-api-key" in headers);
      assert.ok(!bodyText(call.init).includes("x-api-key"));
    } finally {
      mock.restore();
    }
  });
});

describe("exampleConfigError", () => {
  const base = { AGENT_PROVIDER: "openai", OPENAI_API_KEY: "k" };

  it("accepts a complete configuration", () => {
    assert.equal(exampleConfigError({ ...base }), undefined);
    assert.equal(
      exampleConfigError({
        ...base,
        AGENT_PORT: "8787",
        AGENT_MAX_BODY: "1024",
      }),
      undefined
    );
  });

  it("names the variable that is wrong", () => {
    assert.match(
      exampleConfigError({ ...base, AGENT_PORT: "not-a-port" }) ?? "",
      /AGENT_PORT/
    );
    assert.match(
      exampleConfigError({ ...base, AGENT_PORT: "70000" }) ?? "",
      /AGENT_PORT/
    );
    assert.match(
      exampleConfigError({ ...base, AGENT_PORT: "0" }) ?? "",
      /AGENT_PORT/
    );
    assert.match(
      exampleConfigError({ ...base, AGENT_MAX_BODY: "-5" }) ?? "",
      /AGENT_MAX_BODY/
    );
    assert.match(
      exampleConfigError({ ...base, AGENT_HOST: "  " }) ?? "",
      /AGENT_HOST/
    );
    assert.match(
      exampleConfigError({ ...base, AGENT_MODEL: "" }) ?? "",
      /AGENT_MODEL/
    );
  });

  it("reports a missing key and an unknown provider", () => {
    assert.match(
      exampleConfigError({ AGENT_PROVIDER: "gemini" }) ?? "",
      /GEMINI_API_KEY/
    );
    assert.match(
      exampleConfigError({ AGENT_PROVIDER: "lodestar" }) ?? "",
      /unsupported AGENT_PROVIDER/
    );
  });
});

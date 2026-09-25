/**
 * Packed-consumer smoke for the portable AI integration subpaths.
 *
 *   node scripts/ai-integrations-smoke.mjs
 *
 * Imports the built `@adapttable/ai` json / openai / mcp entries and
 * asserts they export the adapter functions without pulling in a model
 * SDK or React.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { packageDir } from "./packages.mjs";

const dist = join(packageDir("ai"), "dist");

const ENTRIES = [
  {
    file: "json.js",
    exports: [
      "toJsonTools",
      "executeJsonTool",
      "parseEnvelope",
      "executeEnvelope",
    ],
  },
  {
    file: "openai.js",
    exports: [
      "toOpenAITools",
      "executeOpenAITool",
      "toOpenAIToolName",
      "fromOpenAIToolName",
    ],
  },
  {
    file: "mcp.js",
    exports: [
      "toMcpTools",
      "toMcpResources",
      "mcpListChanged",
      "executeMcpTool",
    ],
  },
  {
    file: "http.js",
    exports: [
      "createAgentHttpClient",
      "connectAgentHttp",
      "runAgentHttpTurn",
      "parseAgentHttpRequest",
      "parseAgentHttpResponse",
    ],
  },
  {
    file: "context.js",
    exports: ["buildAgentContext", "sampleColumnValues", "rowProvenance"],
  },
  {
    file: "assistant.js",
    exports: ["createTableAssistant", "planUndo", "runUndo"],
  },
  {
    file: "voice.js",
    exports: ["createSpeechInput"],
  },
  {
    file: "webmcp.js",
    exports: ["registerWebMcpTools"],
  },
  {
    file: "agui.js",
    exports: ["aguiTransport", "aguiTools", "statePatch"],
  },
  {
    file: "aiSdk.js",
    exports: ["aiSdkTransport", "aiSdkTools", "assertAiSdkVersion"],
  },
  {
    file: "mcpApps.js",
    exports: ["mcpAppResource", "mcpAppCsp", "createMcpAppBridge"],
  },
];

const FORBIDDEN = [
  'from "openai"',
  "from 'openai'",
  'from "@modelcontextprotocol/sdk"',
  "from '@modelcontextprotocol/sdk'",
  'from "react"',
  "from 'react'",
  // The protocol adapters name these protocols; they must not depend on the
  // packages that implement them.
  'from "ai"',
  "from 'ai'",
  'from "@ag-ui/client"',
  "from '@ag-ui/client'",
];

for (const entry of ENTRIES) {
  const path = join(dist, entry.file);
  const text = readFileSync(path, "utf8");
  for (const needle of FORBIDDEN) {
    assert.equal(
      text.includes(needle),
      false,
      `${entry.file} must not import ${needle}`
    );
  }
  const mod = await import(pathToFileURL(path).href);
  for (const name of entry.exports) {
    assert.equal(
      typeof mod[name],
      "function",
      `${entry.file} must export ${name}`
    );
  }
}

console.log(
  `✓ @adapttable/ai ${ENTRIES.map((entry) => entry.file.replace(/\.js$/, "")).join(", ")} export their adapter functions without openai, the MCP SDK, the AI SDK, an AG-UI client or React`
);

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
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "packages/ai/dist");

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
    exports: ["toOpenAITools", "executeOpenAITool"],
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
];

const FORBIDDEN = [
  'from "openai"',
  "from 'openai'",
  'from "@modelcontextprotocol/sdk"',
  "from '@modelcontextprotocol/sdk'",
  'from "react"',
  "from 'react'",
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
  "✓ @adapttable/ai json, openai and mcp export the adapter functions without openai, MCP SDK or React"
);

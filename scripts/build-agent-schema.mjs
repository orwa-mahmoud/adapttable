/**
 * Write the agent HTTP protocol to `schemas/agent-http.v1.json`, and the
 * general model rules to `docs/agent-rules.txt`.
 *
 * Both are generated from the package's own source of truth — the parsers'
 * constants and `agentInstructions` — so a backend written in Python, Go
 * or .NET implements the wire and copies the words without reading any
 * TypeScript, and neither file can drift from what the client actually does.
 *
 *   node scripts/build-agent-schema.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import prettier from "prettier";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const { agentHttpJsonSchema } = await import(
  join(ROOT, "packages/ai/dist/http.js")
);
const { agentInstructions } = await import(
  join(ROOT, "packages/ai/dist/context.js")
);

/**
 * Write one artifact, formatted the way the repository formats that kind of
 * file.
 *
 * A generator that emits its own house style produces a file the commit hook
 * then rejects, which turns every regeneration into a second manual step. The
 * repository's own Prettier configuration is the one authority on how a
 * committed file looks, so the generator asks it rather than guessing —
 * `.txt` has no parser and is written as it is.
 */
async function write(relative, contents) {
  const path = join(ROOT, relative);
  await mkdir(dirname(path), { recursive: true });
  const info = await prettier.getFileInfo(path);
  const formatted = info.inferredParser
    ? await prettier.format(contents, {
        ...(await prettier.resolveConfig(path)),
        parser: info.inferredParser,
      })
    : contents;
  await writeFile(path, formatted, "utf8");
  console.log(`wrote ${relative}`);
}

await write(
  "schemas/agent-http.v1.json",
  `${JSON.stringify(agentHttpJsonSchema(), null, 2)}\n`
);

await write(
  "docs/agent-rules.txt",
  [
    "AdaptTable — general agent rules.",
    "",
    "Generated from @adapttable/ai. Copy these into your own system prompt if",
    "you are not using the TypeScript prompt helpers. They name no capability",
    "and no argument shape, so they stay correct on every table.",
    "",
    agentInstructions(),
    "",
  ].join("\n")
);

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import { format } from "prettier";

import { scopeStyles } from "./scope-styles.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstream = path.dirname(require.resolve("@clr/ui/package.json"));
const css = scopeStyles(
  await readFile(path.join(upstream, "clr-ui.css"), "utf8"),
  postcss
);
const additions = await readFile(path.join(root, "src/styles.css"), "utf8");
await writeFile(
  path.join(root, "styles.css"),
  await format(
    `/*! Clarity 18.3.0 | Copyright 2016-2026 Broadcom | MIT: CLARITY-LICENSE. Scoped by scripts/build-styles.mjs; embedded fonts omitted. */\n${css}\n${additions}`,
    { parser: "css" }
  )
);

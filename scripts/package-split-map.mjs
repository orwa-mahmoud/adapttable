/**
 * Classify every published public export for the v3 core / React split.
 *
 * The symbol list comes from `etc/api-contract.json` (the committed contract),
 * plus the `@adapttable/ai/http` surface that is published today but not yet
 * extracted. Classification is a documented rule, not a second hand list.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { entrypoints } from "./api-entrypoints.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ETC = join(ROOT, "etc");
const MANIFEST = join(ETC, "api-contract.json");

const APPLICATION_HOOKS = new Set([
  "useQuerySource",
  "useFrontendData",
  "useServerData",
  "useTableData",
]);

const REACT_CHROME_NAMES = new Set([
  "TableChrome",
  "useTableChrome",
  "usePlainChromeBodyData",
  "useVirtualChromeBodyData",
  "useChromeScrollReset",
  "ChromeBodyData",
  "MultiSelectEditorChrome",
  "MultiSelectEditorChromeProps",
]);

const HTTP_SURFACE = [
  "AGENT_HTTP_SCHEMA",
  "AGENT_SCHEMA_VERSION",
  "AgentApply",
  "AgentCellEdit",
  "AgentColumn",
  "AgentHttpAction",
  "AgentHttpClientOptions",
  "AgentHttpKind",
  "AgentHttpMessage",
  "AgentHttpNeeds",
  "AgentHttpRequest",
  "AgentHttpResponse",
  "AgentHttpTurnResult",
  "AgentLimits",
  "AgentManifest",
  "AgentObservation",
  "AgentPolicy",
  "AgentRowAddressing",
  "AgentSession",
  "ApprovalOutcome",
  "ApprovalPolicy",
  "CAPABILITY_KEYS",
  "CapabilityGuide",
  "CapabilityKey",
  "CatalogEntry",
  "CommitPolicy",
  "connectAgentHttp",
  "createAgentHttpClient",
  "ExecuteError",
  "ExecuteResult",
  "JsonSchema",
  "parseAgentHttpRequest",
  "parseAgentHttpResponse",
  "ResolvedRow",
  "RowAddressScope",
  "RowKeyRef",
  "RowPositionRef",
  "RowReadQuery",
  "RowRef",
  "RowWindow",
  "RowWindowRow",
  "runAgentHttpTurn",
  "TableAgentBridge",
  "WriteExecuteResult",
  "WritePolicy",
  "WriteProposal",
  "WriteRowResult",
];

const CLASSES = new Set([
  "neutral-model",
  "neutral-operation",
  "react-binding",
  "react-chrome",
  "kit-rendering",
  "application-hook",
]);

export { CLASSES };

function packageName(dir) {
  return JSON.parse(
    readFileSync(join(ROOT, "packages", dir, "package.json"), "utf8")
  ).name;
}

function specifier(name, subpath) {
  return subpath === "." ? name : `${name}/${subpath.slice(2)}`;
}

function reportKind(text, exportName) {
  if (!text)
    return exportName[0] === exportName[0]?.toUpperCase() ? "type" : "value";
  const escaped = exportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const functionRe = new RegExp(`^export function ${escaped}\\b`, "m");
  const constRe = new RegExp(`^export const ${escaped}\\b`, "m");
  const typeRe = new RegExp(
    `^export (?:type|interface|enum|namespace) ${escaped}\\b`,
    "m"
  );
  const aliasRe = new RegExp(`\\bas ${escaped}\\b`);
  const isValue = functionRe.test(text) || constRe.test(text);
  const isType = typeRe.test(text);
  if (isValue && isType) return "both";
  if (isValue) return "value";
  if (isType) return "type";
  if (aliasRe.test(text)) return "value";
  return exportName[0] === exportName[0]?.toUpperCase() ? "type" : "value";
}

function mentionsReact(text, exportName) {
  if (!text) return false;
  const idx = text.search(
    new RegExp(
      `^export (?:function|const|type|interface|enum) ${exportName}\\b`,
      "m"
    )
  );
  if (idx < 0)
    return /React(?:Node|Element|Component)|ComponentType|RefObject/.test(text);
  const next = text.slice(idx + 1).search(/^export /m);
  const block = next < 0 ? text.slice(idx) : text.slice(idx, idx + 1 + next);
  return /React(?:Node|Element|Component)|ComponentType|CSSProperties|HTMLAttributes|RefObject|JSX\.|MouseEvent|KeyboardEvent/.test(
    block
  );
}

function classifyAi(subpath, name) {
  if (
    subpath === "./react" ||
    name === "tableAgent" ||
    name.startsWith("TableAgent")
  ) {
    return "react-binding";
  }
  if (name.startsWith("use")) return "react-binding";
  if (
    /^(create|parse|connect|run|to|from|execute|build|guide|summary|enabled|validate)/.test(
      name
    )
  ) {
    return "neutral-operation";
  }
  return "neutral-model";
}

function classifyCoreFeatures(name, reportText) {
  if (name.startsWith("use") || /^[a-z]/.test(name)) return "react-binding";
  if (mentionsReact(reportText, name)) return "react-binding";
  return "neutral-model";
}

function classifyCoreAdapter(name, reportText) {
  const chromeName =
    mentionsReact(reportText, name) ||
    /^(Html|Header|Body|Filter|Row|Column|Editable)/.test(name);
  return chromeName ? "react-chrome" : "neutral-operation";
}

function classifyCore({ subpath, name, reportText }) {
  if (APPLICATION_HOOKS.has(name)) return "application-hook";
  if (REACT_CHROME_NAMES.has(name) || /Chrome/.test(name))
    return "react-chrome";
  if (name.startsWith("use")) return "react-binding";
  if (subpath === "./features") return classifyCoreFeatures(name, reportText);
  if (subpath === "./adapter") return classifyCoreAdapter(name, reportText);
  if (mentionsReact(reportText, name)) return "react-binding";
  if (/^[a-z]/.test(name)) return "neutral-operation";
  return "neutral-model";
}

function classify({ dir, subpath, name, reportText }) {
  if (dir.startsWith("adapter-")) return "kit-rendering";
  if (dir === "cli" || dir === "server" || dir === "i18n") {
    return "application-hook";
  }
  if (dir === "ai") return classifyAi(subpath, name);
  return classifyCore({ subpath, name, reportText });
}

function proposedImport(current, cls, dir) {
  if (dir !== "core") return current;
  if (cls === "neutral-model" || cls === "neutral-operation") return current;
  return current.replace("@adapttable/core", "@adapttable/react");
}

function entrySymbols(entry, manifest) {
  if (entry.dir === "ai" && entry.subpath === "./http") return HTTP_SURFACE;
  const policy = manifest.entrypoints[entry.report];
  if (!policy) return [];
  const surface = policy.surface ?? policy.reexport;
  return manifest.surfaces[surface] ?? [];
}

export function buildPackageSplitMap() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const reports = {};
  for (const file of Object.keys(manifest.entrypoints)) {
    const path = join(ETC, file);
    if (existsSync(path)) reports[file] = readFileSync(path, "utf8");
  }
  const symbols = [];
  const seen = new Set();
  for (const entry of entrypoints()) {
    if (!entry.published) continue;
    const name = packageName(entry.dir);
    const currentImport = specifier(name, entry.subpath);
    const reportText = reports[entry.report];
    for (const exportName of entrySymbols(entry, manifest)) {
      const key = `${currentImport}\u0000${exportName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cls = classify({
        dir: entry.dir,
        subpath: entry.subpath,
        name: exportName,
        reportText,
      });
      symbols.push({
        export: exportName,
        currentImport,
        kind: reportKind(reportText, exportName),
        class: cls,
        proposedImport: proposedImport(currentImport, cls, entry.dir),
        behavior: "",
      });
    }
  }
  symbols.sort((a, b) => {
    const left = `${a.currentImport}\0${a.export}`;
    const right = `${b.currentImport}\0${b.export}`;
    return left.localeCompare(right);
  });
  return {
    $comment:
      "Every current public export and its destination after the v3 core/React split. Rules live in scripts/package-split-map.mjs. A blank behavior means specifier-only. @adapttable/ai/http is listed from source until etc/ai-http.api.md joins the contract.",
    generatedFrom: "etc/api-contract.json",
    symbols,
  };
}

export function contractKeys(manifest) {
  const keys = new Set();
  for (const entry of entrypoints()) {
    if (!entry.published) continue;
    const name = packageName(entry.dir);
    const currentImport = specifier(name, entry.subpath);
    const policy = manifest.entrypoints[entry.report];
    if (!policy) continue;
    const surface = policy.surface ?? policy.reexport;
    for (const exportName of manifest.surfaces[surface] ?? []) {
      keys.add(`${currentImport}\u0000${exportName}`);
    }
  }
  return keys;
}

export function mapKeys(map) {
  return new Set(
    map.symbols.map((row) => `${row.currentImport}\u0000${row.export}`)
  );
}

export function splitMapErrors(map, manifest) {
  const errors = [];
  const expected = contractKeys(manifest);
  const actual = mapKeys(map);
  for (const key of expected) {
    if (!actual.has(key)) {
      const [imp, name] = key.split("\u0000");
      errors.push(`missing ${name} from ${imp}`);
    }
  }
  for (const row of map.symbols) {
    if (!CLASSES.has(row.class)) {
      errors.push(`${row.export}: unknown class ${row.class}`);
    }
    if (!row.currentImport || !row.proposedImport) {
      errors.push(`${row.export}: empty import`);
    }
    const key = `${row.currentImport}\u0000${row.export}`;
    const isHttp = row.currentImport === "@adapttable/ai/http";
    if (!expected.has(key) && !isHttp) {
      errors.push(`unmapped extra ${row.export} on ${row.currentImport}`);
    }
  }
  const http = map.symbols.filter(
    (row) => row.currentImport === "@adapttable/ai/http"
  );
  if (http.length !== HTTP_SURFACE.length) {
    errors.push(
      `@adapttable/ai/http must list ${HTTP_SURFACE.length} exports (has ${http.length})`
    );
  }
  return errors;
}

export function representativeExamplesAgree(map) {
  const by = (imp, name) =>
    map.symbols.find((row) => row.currentImport === imp && row.export === name);
  const errors = [];
  const source = by("@adapttable/core", "TableSource");
  if (!source || source.proposedImport !== "@adapttable/core") {
    errors.push("TableSource must stay on @adapttable/core");
  }
  if (source?.class !== "neutral-model") {
    errors.push("TableSource must be classified neutral-model");
  }
  const hook = by("@adapttable/core", "useDataTable");
  if (!hook || hook.proposedImport !== "@adapttable/react") {
    errors.push("useDataTable must move to @adapttable/react");
  }
  const cols = by("@adapttable/core", "ColumnDef");
  if (!cols || cols.proposedImport !== "@adapttable/react") {
    errors.push("ColumnDef must move to @adapttable/react");
  }
  const kit = by("@adapttable/mui", "DataTable");
  if (!kit || kit.proposedImport !== "@adapttable/mui") {
    errors.push("kit DataTable must stay on the kit");
  }
  const session = by("@adapttable/ai", "createAgentSession");
  if (!session || session.proposedImport !== "@adapttable/ai") {
    errors.push("createAgentSession must stay on @adapttable/ai");
  }
  const agent = by("@adapttable/ai/react", "tableAgent");
  if (!agent || agent.proposedImport !== "@adapttable/ai/react") {
    errors.push("tableAgent must stay on @adapttable/ai/react");
  }
  const query = by("@adapttable/core", "useQuerySource");
  if (!query || query.proposedImport !== "@adapttable/react") {
    errors.push("useQuerySource must move to @adapttable/react");
  }
  return errors;
}

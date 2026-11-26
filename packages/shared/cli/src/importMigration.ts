/**
 * The import rewriting every major's codemod shares: named imports move to
 * the specifier that serves them now, whole subpaths redirect, and a renamed
 * export keeps the name the file already uses through an alias.
 */

/**
 * One source location a migration cannot rewrite safely.
 */
export interface MigrationIssue {
  /** One-based source line. */
  line: number;
  /** One-based source column. */
  column: number;
  /** Why the source needs a person to choose its replacement. */
  message: string;
}

/**
 * Result of applying a major's safe source transforms.
 */
export interface MigrationResult {
  /** Rewritten source, or the original source when nothing was safe to change. */
  code: string;
  /** Whether `code` differs from the input. */
  changed: boolean;
  /** Number of named imports moved or renamed. */
  movedImports: number;
  /** Usages that need a person, left untouched. */
  issues: readonly MigrationIssue[];
}

/**
 * Where one named export lives now: a specifier, or a specifier and the
 * export's new name when it was renamed.
 */
export type ImportRoute =
  string | { readonly to: string; readonly name: string };

/** What a major moved, keyed by the specifier a source imported from. */
export interface ImportMoves {
  /** Subpaths that moved whole: every name keeps its spelling. */
  readonly redirects: Readonly<Record<string, string>>;
  /** Named exports that moved or were renamed. */
  readonly routes: Readonly<
    Record<string, Readonly<Record<string, ImportRoute>>>
  >;
}

const ADAPTTABLE_IMPORT =
  /(import|export)\s+(type\s+)?\{([^{}]*)\}\s+from\s+(["'])(@adapttable\/[a-z0-9/-]+)\4[ \t]*;?/g;
const IMPORT_SPECIFIER =
  /^(?:type\s+)?([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/;

function locationAt(
  source: string,
  index: number
): Pick<MigrationIssue, "line" | "column"> {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n");
  return { line, column: index - lineStart };
}

/**
 * An issue at an offset of `source`.
 *
 * @param source - The file's text.
 * @param index - Offset of the usage.
 * @param message - What the person has to decide.
 * @returns The issue with its line and column.
 */
export function issueAt(
  source: string,
  index: number,
  message: string
): MigrationIssue {
  return { ...locationAt(source, index), message };
}

/**
 * Report every match of each pattern, leaving the source untouched.
 *
 * @param source - The file's text.
 * @param patterns - Global patterns and the message each match reports.
 * @param issues - Where the issues are appended.
 */
export function reportPatterns(
  source: string,
  patterns: readonly (readonly [RegExp, string])[],
  issues: MigrationIssue[]
): void {
  for (const [pattern, message] of patterns) {
    for (const match of source.matchAll(pattern)) {
      issues.push(issueAt(source, match.index, message));
    }
  }
}

/** Specifier order is alphabetical, so a second pass sees the same text. */
function bySpecifier(left: string, right: string): number {
  return left.localeCompare(right);
}

function formatImport(
  keyword: string,
  typeOnly: boolean,
  specifiers: readonly string[],
  quote: string,
  source: string
): string {
  return `${keyword}${typeOnly ? " type" : ""} { ${specifiers.join(
    ", "
  )} } from ${quote}${source}${quote};`;
}

/** The specifier as written at its new home: renamed under the local name. */
function respell(
  specifier: string,
  imported: string,
  local: string | undefined,
  route: ImportRoute
): string {
  if (typeof route === "string" || route.name === imported) return specifier;
  const typePrefix = specifier.startsWith("type ") ? "type " : "";
  return `${typePrefix}${route.name} as ${local ?? imported}`;
}

/**
 * Sort one import's specifiers by where each name lives now. A specifier
 * whose name did not move stays; one renamed in place stays under its new
 * name; the rest are grouped by destination.
 */
function routeSpecifiers(
  specifiers: readonly string[],
  parsed: readonly (RegExpExecArray | null)[],
  routes: Readonly<Record<string, ImportRoute>>,
  from: string
): { kept: string[]; byDestination: Map<string, string[]>; moved: number } {
  const kept: string[] = [];
  const byDestination = new Map<string, string[]>();
  let moved = 0;
  specifiers.forEach((specifier, specifierIndex) => {
    const imported = parsed[specifierIndex]?.[1] ?? "";
    const local = parsed[specifierIndex]?.[2];
    const route = routes[imported];
    if (route === undefined) {
      kept.push(specifier);
      return;
    }
    const destination = typeof route === "string" ? route : route.to;
    const written = respell(specifier, imported, local, route);
    if (destination === from) {
      // Renamed in place: same import, new name.
      kept.push(written);
      moved += 1;
      return;
    }
    const bucket = byDestination.get(destination) ?? [];
    bucket.push(written);
    byDestination.set(destination, bucket);
  });
  return { kept, byDestination, moved };
}

/**
 * One import or re-export declaration as v4 writes it: the text, how many
 * names moved, and an issue when it was too complex to split.
 */
function rewriteDeclaration(
  match: RegExpMatchArray,
  moves: ImportMoves,
  source: string
): { text: string; moved: number; issue?: MigrationIssue } {
  const [
    declaration,
    keyword = "import",
    typeKeyword = "",
    body = "",
    quote = '"',
    from = "",
  ] = match;
  const redirect = moves.redirects[from];
  const routes = moves.routes[from];
  if (!redirect && !routes) return { text: declaration, moved: 0 };

  const specifiers = body
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const parsed = specifiers.map((specifier) =>
    IMPORT_SPECIFIER.exec(specifier)
  );
  if (specifiers.length === 0 || parsed.includes(null)) {
    return {
      text: declaration,
      moved: 0,
      issue: issueAt(
        source,
        match.index ?? 0,
        `Complex ${from} import left unchanged; split or comment-preserving migration requires review.`
      ),
    };
  }

  const typeOnly = typeKeyword.length > 0;
  if (redirect) {
    const further = moves.routes[redirect];
    if (!further) {
      // The whole subpath moved, so the names are untouched and only the
      // specifier changes.
      return {
        text: formatImport(keyword, typeOnly, specifiers, quote, redirect),
        moved: specifiers.length,
      };
    }
    // A redirected barrel can still split: each name lands on the entry that
    // owns it, in this same pass.
    const { kept, byDestination } = routeSpecifiers(
      specifiers,
      parsed,
      further,
      redirect
    );
    const declarations: string[] = [];
    if (kept.length > 0) {
      declarations.push(formatImport(keyword, typeOnly, kept, quote, redirect));
    }
    for (const destination of [...byDestination.keys()].sort(bySpecifier)) {
      declarations.push(
        formatImport(
          keyword,
          typeOnly,
          byDestination.get(destination) ?? [],
          quote,
          destination
        )
      );
    }
    return { text: declarations.join("\n"), moved: specifiers.length };
  }

  const { kept, byDestination, moved } = routeSpecifiers(
    specifiers,
    parsed,
    routes ?? {},
    from
  );
  if (byDestination.size === 0) {
    return {
      text:
        kept.join() === specifiers.join()
          ? declaration
          : formatImport(keyword, typeOnly, kept, quote, from),
      moved,
    };
  }

  const declarations: string[] = [];
  if (kept.length > 0) {
    declarations.push(formatImport(keyword, typeOnly, kept, quote, from));
  }
  let total = moved;
  const destinations = [...byDestination.keys()].sort(bySpecifier);
  for (const destination of destinations) {
    const names = byDestination.get(destination) ?? [];
    declarations.push(
      formatImport(keyword, typeOnly, names, quote, destination)
    );
    total += names.length;
  }
  return { text: declarations.join("\n"), moved: total };
}

type HideRange = (from: number, until: number) => void;

function hideThrough(
  source: string,
  start: number,
  hide: HideRange,
  marker: string,
  extra: number
): number {
  const end = source.indexOf(marker, start + marker.length);
  const until = end === -1 ? source.length : end + extra;
  hide(start, until);
  return until;
}

function skipQuoted(
  source: string,
  index: number,
  hide: HideRange
): number | undefined {
  const current = source[index];
  if (current !== "'" && current !== '"' && current !== "`") return undefined;
  if (current === "`") return hideTemplate(source, index, hide);
  const until = endOfString(source, index, current);
  hide(index, until);
  return until;
}

/** True for each index that is source code, not a string, comment or template text. */
function codeIndexes(source: string): boolean[] {
  const code = Array.from({ length: source.length }, () => true);
  const hide: HideRange = (from, until) => {
    for (let index = from; index < until && index < code.length; index += 1) {
      code[index] = false;
    }
  };
  let index = 0;
  while (index < source.length) {
    const next = source[index + 1];
    if (source[index] === "/" && next === "/") {
      index = hideThrough(source, index, hide, "\n", 0);
      continue;
    }
    if (source[index] === "/" && next === "*") {
      index = hideThrough(source, index, hide, "*/", 2);
      continue;
    }
    const quoted = skipQuoted(source, index, hide);
    index = quoted ?? index + 1;
  }
  return code;
}

function endOfString(source: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === quote) return index + 1;
    index += 1;
  }
  return source.length;
}

function hideTemplate(source: string, start: number, hide: HideRange): number {
  let index = start + 1;
  let text = start;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === "`") {
      hide(text, index + 1);
      return index + 1;
    }
    if (source[index] === "$" && source[index + 1] === "{") {
      hide(text, index);
      index = endOfInterpolation(source, index + 2, hide);
      text = index;
      continue;
    }
    index += 1;
  }
  hide(text, source.length);
  return source.length;
}

function skipInterpolationToken(
  source: string,
  index: number,
  hide: HideRange
): number | undefined {
  const quoted = skipQuoted(source, index, hide);
  if (quoted !== undefined) return quoted;
  const next = source[index + 1];
  if (source[index] === "/" && next === "/") {
    return hideThrough(source, index, hide, "\n", 0);
  }
  if (source[index] === "/" && next === "*") {
    return hideThrough(source, index, hide, "*/", 2);
  }
  return undefined;
}

function endOfInterpolation(
  source: string,
  start: number,
  hide: HideRange
): number {
  let depth = 1;
  let index = start;
  while (index < source.length && depth > 0) {
    const skipped = skipInterpolationToken(source, index, hide);
    if (skipped !== undefined) {
      index = skipped;
      continue;
    }
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return index + 1;
    index += 1;
  }
  return source.length;
}

const NAMESPACE_IMPORT =
  /import\s+\*\s+as\s+[A-Za-z_$][\w$]*\s+from\s+(["'])(@adapttable\/[a-z0-9/-]+)\1/g;
const WILDCARD_REEXPORT =
  /export\s+\*(?:\s+as\s+[A-Za-z_$][\w$]*)?\s+from\s+(["'])(@adapttable\/[a-z0-9/-]+)\1/g;
const DYNAMIC_IMPORT = /import\s*\(\s*(["'])(@adapttable\/[a-z0-9/-]+)\1\s*\)/g;
const REQUIRE_CALL = /require\s*\(\s*(["'])(@adapttable\/[a-z0-9/-]+)\1\s*\)/g;

/**
 * Where a whole module moves, when every name shares that one destination.
 * A barrel whose names then split is not rewritten.
 */
export function wholeModuleDestination(
  from: string,
  moves: ImportMoves
): string | undefined {
  const redirect = moves.redirects[from];
  if (!redirect) return undefined;
  const further = moves.routes[redirect];
  if (further && Object.keys(further).length > 0) return undefined;
  const own = moves.routes[from];
  if (!own) return redirect;
  const destinations = new Set(
    Object.values(own).map((route) =>
      typeof route === "string" ? route : route.to
    )
  );
  if (destinations.size === 1 && destinations.has(redirect)) return redirect;
  return undefined;
}

function removedModule(from: string, moves: ImportMoves): boolean {
  return (
    moves.redirects[from] !== undefined || moves.routes[from] !== undefined
  );
}

interface ModuleEdit {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly moved: number;
  readonly issue?: MigrationIssue;
}

function moduleEdits(
  source: string,
  moves: ImportMoves,
  code: boolean[]
): ModuleEdit[] {
  const edits: ModuleEdit[] = [];
  const patterns = [
    NAMESPACE_IMPORT,
    WILDCARD_REEXPORT,
    DYNAMIC_IMPORT,
    REQUIRE_CALL,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (!code[start]) continue;
      const from = match[2] ?? "";
      if (!removedModule(from, moves)) continue;
      const destination = wholeModuleDestination(from, moves);
      if (!destination) {
        edits.push({
          start,
          end: start + match[0].length,
          text: match[0],
          moved: 0,
          issue: issueAt(
            source,
            start,
            `Whole-module import from ${from} was left unchanged: its names do not share one destination.`
          ),
        });
        continue;
      }
      const quoted = match[1] + from + match[1];
      const at = match[0].lastIndexOf(quoted);
      const text =
        match[0].slice(0, at) +
        match[1] +
        destination +
        match[1] +
        match[0].slice(at + quoted.length);
      edits.push({
        start,
        end: start + match[0].length,
        text,
        moved: 1,
      });
    }
  }
  return edits;
}

/**
 * Move the named imports and re-exports `moves` describes.
 *
 * @param source - The file's text.
 * @param moves - What the major moved.
 * @returns The rewritten text, how many names moved, and the imports too
 *   complex to split safely.
 */
/**
 * A Vue single-file component's script block, its body in group 1. Tag names
 * match in any case, and the closing tag ends at its own `>` whatever follows
 * the name, as an HTML parser reads it.
 */
export const VUE_SCRIPT_BLOCK = /<script\b[^>]*>([\s\S]*?)<\/script\b[^>]*>/gi;

/**
 * Rewrite each Vue script with `migrate`, leaving the template bytes alone.
 * Diagnostics use the script's position in the file.
 */
export function migrateVueScripts(
  source: string,
  migrate: (block: string) => MigrationResult
): MigrationResult {
  let code = "";
  let cursor = 0;
  let movedImports = 0;
  const issues: MigrationIssue[] = [];
  for (const match of source.matchAll(VUE_SCRIPT_BLOCK)) {
    const body = match[1] ?? "";
    const bodyStart = (match.index ?? 0) + match[0].indexOf(body);
    code += source.slice(cursor, bodyStart);
    const rewritten = migrate(body);
    code += rewritten.code;
    cursor = bodyStart + body.length;
    movedImports += rewritten.movedImports;
    const lineOffset = source.slice(0, bodyStart).split("\n").length - 1;
    for (const issue of rewritten.issues) {
      issues.push({ ...issue, line: issue.line + lineOffset });
    }
  }
  code += source.slice(cursor);
  return {
    code,
    changed: code !== source,
    movedImports,
    issues,
  };
}

export function rewriteImports(
  source: string,
  moves: ImportMoves
): { code: string; movedImports: number; issues: MigrationIssue[] } {
  const code = codeIndexes(source);
  const edits: ModuleEdit[] = [];
  for (const match of source.matchAll(ADAPTTABLE_IMPORT)) {
    const start = match.index ?? 0;
    if (!code[start]) continue;
    const rewritten = rewriteDeclaration(match, moves, source);
    edits.push({
      start,
      end: start + match[0].length,
      text: rewritten.text,
      moved: rewritten.moved,
      ...(rewritten.issue ? { issue: rewritten.issue } : {}),
    });
  }
  edits.push(...moduleEdits(source, moves, code));
  edits.sort((left, right) => left.start - right.start);
  let next = "";
  let cursor = 0;
  let movedImports = 0;
  const issues: MigrationIssue[] = [];
  let coveredUntil = -1;
  for (const edit of edits) {
    if (edit.start < coveredUntil) continue;
    next += source.slice(cursor, edit.start);
    next += edit.text;
    cursor = edit.end;
    coveredUntil = edit.end;
    movedImports += edit.moved;
    if (edit.issue) issues.push(edit.issue);
  }
  next += source.slice(cursor);
  return { code: next, movedImports, issues };
}

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
    for (const destination of [...byDestination.keys()].sort((left, right) =>
      left.localeCompare(right)
    )) {
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
  const destinations = [...byDestination.keys()].sort((left, right) =>
    left.localeCompare(right)
  );
  for (const destination of destinations) {
    const names = byDestination.get(destination) ?? [];
    declarations.push(
      formatImport(keyword, typeOnly, names, quote, destination)
    );
    total += names.length;
  }
  return { text: declarations.join("\n"), moved: total };
}

/**
 * Move the named imports and re-exports `moves` describes.
 *
 * @param source - The file's text.
 * @param moves - What the major moved.
 * @returns The rewritten text, how many names moved, and the imports too
 *   complex to split safely.
 */
export function rewriteImports(
  source: string,
  moves: ImportMoves
): { code: string; movedImports: number; issues: MigrationIssue[] } {
  let code = "";
  let cursor = 0;
  let movedImports = 0;
  const issues: MigrationIssue[] = [];
  for (const match of source.matchAll(ADAPTTABLE_IMPORT)) {
    code += source.slice(cursor, match.index);
    cursor = match.index + match[0].length;
    const rewritten = rewriteDeclaration(match, moves, source);
    code += rewritten.text;
    movedImports += rewritten.moved;
    if (rewritten.issue) issues.push(rewritten.issue);
  }
  code += source.slice(cursor);
  return { code, movedImports, issues };
}

#!/usr/bin/env node
/**
 * `data-adapttable-part` parity across the adapters.
 *
 * A part name is public contract: an app styles or tests against it, so the
 * same name has to land in every kit that renders the thing. Nothing enforced
 * that, and it drifted three separate times — `selection-cell` and
 * `selection-header` were emitted by adapter-unstyled alone, then `bulk-bar`,
 * then five more parts of the same bar. Each was found by accident, while
 * someone was building something else.
 *
 * This finds it on purpose: any part emitted by SOME shell adapters and not
 * others fails, and the message names the kits that are missing it.
 *
 * Two things stop it crying wolf, which matters more than the check itself —
 * a parity check with false failures teaches people to add allowlist entries,
 * and the allowlist is where real gaps then hide:
 *
 * 1. **Both spellings count.** A kit that forwards loose props to an inner
 *    element passes the part through a prop object instead
 *    (`wrapperProps={{ "data-adapttable-part": … }}` in Mantine's checkbox),
 *    so matching only `data-adapttable-part="x"` reports a defect that is not
 *    there.
 * 2. **Ownership counts.** Native kits name the fallback elements they build;
 *    derived kits inherit their base's parts. Themed kits are compared with
 *    each other, and native kits must agree on their own plus their binding's
 *    parts. Names supplied by themed Chrome also count as rendered by those
 *    kits when deciding whether a native name is exclusive. `EXPECTED_GAPS`
 *    records what a themed kit genuinely cannot render, with its reason.
 *
 * Two whole classes of part were invisible to it, which is how
 * `saved-view-readonly` and `saved-view-default` survived: emitted by
 * adapter-unstyled alone, they never entered the comparison at all, because a
 * name no themed kit spells cannot be missing from a themed kit. So there are
 * now these sources and comparisons:
 *
 * - **The themed kits**, compared part-for-part as before.
 * - **adapter-unstyled**, whose exclusive names are now checked rather than
 *   used only as an oracle. Each one has to be accounted for in
 *   `FALLBACK_ONLY` (unstyled builds this structure itself, because native IS
 *   its kit, and the themed kits reach the same affordance through their own
 *   kit's component) or in `UNNAMED_IN_KITS` (the themed kits do render this
 *   element and have never named it — a real gap, listed rather than
 *   discovered by accident, and printed on every run). A name in neither list
 *   fails: that is the drift this check now catches at the moment it appears.
 * - **Core's chrome**, which names parts the kits never spell — some rendered
 *   by core itself, some handed to a kit's slot as a `part` prop, some kept in
 *   a `*_PARTS` table or `*Parts` factory the kits render through, some set on a
 *   ref. Those land in every kit by construction, so they are exempt from the unstyled
 *   comparison and counted in the summary instead of being unaccounted for.
 * - **The native kits together**, compared using each kit's own names plus
 *   its framework's Chrome, so a part cannot disappear from one native kit
 *   while another keeps the native-only union unchanged.
 *
 * Both lists are checked for rot in the other direction too: an entry that no
 * longer applies — the part is named by every themed kit now, or unstyled
 * stopped emitting it — fails as well. A list of gaps that cannot shrink is a
 * list nobody trusts.
 *
 * All of that is comparative, and comparison has one blind spot left: a part
 * every kit renders and NONE of them names looks like agreement. `table`,
 * `thead` and `toolbar` sat in exactly that state. So above the comparison there
 * is a positive list — {@link CONTRACT} — of the names an app is entitled to
 * find in every kit, and a missing one fails on its own.
 *
 * Part names are framework-neutral, so the comparison runs across every kit in
 * `scripts/kits.mjs` whatever it is built on. Each kit is read in its own
 * framework's files — a React kit's `.ts`/`.tsx`, a Vue kit's `.vue` and `.ts`,
 * an Angular kit's `.html` and `.ts` — and a template spells a part either as a
 * plain attribute or as a binding to a string literal. Core's chrome is
 * per-framework too: `@adapttable/core` plus the binding the kit builds on.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { inheritedBindingSources } from "./binding-inheritance.mjs";
import {
  bindingDir,
  contractKits,
  coreDir,
  frameworkFiles,
  FRAMEWORKS,
  frameworksIn,
  kitDir,
  kitRegistryErrors,
  KITS,
  kitSourceDirs,
  nativeKits,
  NEUTRAL,
  shellKits,
} from "./kits.mjs";
import { REPO_ROOT } from "./packages.mjs";
import {
  vueBindingSources,
  vueForwardsAttributeApi,
  vueKitWithBindingSources,
  vueRenderedParts,
} from "./vue-binding-structure.mjs";

/**
 * The kit each private kit is measured against while it is built: every part
 * the reference renders is a part the private kit still has to render.
 * `--report` prints the difference; an entry leaves this map when its kit
 * joins the contract.
 */
export const REPORT_REFERENCES = {};

/**
 * Parts a kit genuinely cannot render, with the reason. An entry here is a
 * claim about that kit's own component model — not a way to quiet the check.
 */
const EXPECTED_GAPS = {
  "adapter-antd": {
    "header-group-row":
      "antd nests group columns as `children` on the column def; it exposes one `header.row` seam, not a separate group-row element.",
  },
};

/**
 * The structural contract: the seven names an app is entitled to find in EVERY
 * kit that renders the shell (owner decision, 2026-08-16).
 *
 * The comparison this file was built for asks "does any kit disagree with the
 * others", which is blind by construction to a part no kit names at all —
 * `table`, `thead` and `toolbar` were rendered by six kits and named by none of
 * them. This asks the opposite question, and a missing name fails.
 */
const CONTRACT = [
  "row",
  "cell",
  "table",
  "thead",
  "tbody",
  "toolbar",
  "header-cell",
];

/**
 * Contract parts that arrive from a binding rather than from a literal in the
 * kit, with the binding APIs that carry them, per framework. Each one names the
 * part once for every kit that spreads what it returns, so a kit satisfies the
 * contract by CALLING one of them — and each kit's `RowParts.test.tsx` asserts
 * the name on the rendered DOM, which is the only place a spread can be proved.
 *
 * `row` has two such routes in React. A kit that lays out its own body spreads
 * `getRowProps` directly; a kit thinned onto the shared desktop assembly
 * receives the same props already merged, through `createDesktopRow`.
 * Vue renders its imported Chrome with complete model attrs and calls the
 * neutral `rowAttributes` API through its binding; both sides are checked.
 * Angular assembles each body entry from `table.rowAttrs` (or the grid's
 * preserving wrapper), then binds that record whole with `adaptAttrs` on its
 * `<tr>`. A framework with no entry has no such route, and its kits name every
 * contract part themselves.
 */
const CORE_GETTER_PARTS = {
  react: { row: ["getRowProps", "createDesktopRow"] },
  angular: { row: ["rowAttrs"] },
  vue: { row: ["rowAttributes"] },
};

/**
 * Parts adapter-unstyled names because adapter-unstyled builds the thing.
 *
 * Native controls and native structure are that adapter's kit, so it assembles
 * a popover, a menu, a pager and a skeleton out of elements it owns. The themed
 * kits reach the same affordance through their kit's Popover, Menu, Pagination
 * and Skeleton, whose internals are the kit's — there is no element of theirs
 * that the same name would belong on. Grouped by the widget, with the reason
 * per group.
 */
const FALLBACK_ONLY = {
  // Its own shortcuts menu: a native disclosure wrapping a <menu> of buttons,
  // where a themed kit reaches the same affordance through its own Menu.
  "assistant shortcuts": ["assistant-examples-list"],
  // Its own anchored card and drawer, built from divs and a backdrop.
  filters: [
    "filters-anchor",
    "filters-backdrop",
    "filters-body",
    "filters-button",
    "filters-clear",
    "filters-close",
    "filters-count",
    "filters-done",
    "filters-footer",
    "filters-header",
    "filters-icon",
    "filters-panel",
    "filters-popover",
    "filters-title",
    "filter-checkbox-group",
    "filter-options-loading",
  ],
  // Its own column menu: a panel of native buttons and separators.
  "column menu": [
    "column-menu",
    "column-menu-auto-size",
    "column-menu-choice-label",
    "column-menu-choice-select",
    "column-menu-grip",
    "column-menu-header",
    "column-menu-label",
    "column-menu-panel",
    "column-menu-pin",
    "column-menu-reset",
    "column-menu-separator",
    "column-menu-title",
    "column-menu-visibility",
  ],
  // Its own saved-views menu, down to the save row and the divider.
  "views menu": [
    "views-button",
    "views-delete",
    "views-divider",
    "views-input",
    "views-item",
    "views-menu",
    "views-panel",
    "views-row",
    "views-save",
    "views-save-row",
  ],
  // Its own pager: numbered buttons, an ellipsis, a rows-per-page select.
  pager: [
    "page-ellipsis",
    "page-next",
    "page-number",
    "page-prev",
    "pager",
    "rows-per-page",
    "load-more",
    "load-more-button",
  ],
  // Its own loading skeleton, drawn as lines and blocks.
  skeleton: [
    "loading",
    "loading-card",
    "loading-cards",
    "loading-cell",
    "loading-header-cell",
    "loading-header-row",
    "loading-line",
    "loading-row",
    "loading-table",
    "refresh-indicator",
  ],
  // Native controls: a select for sorting where a kit has a Select, a bare
  // checkbox where a kit has a Checkbox, a button where a kit has a Button.
  "native controls": [
    "checkbox",
    "empty-clear",
    "expand-button",
    "export-spinner",
    "retry-button",
    "sort-button",
    "sort-index",
    "sort-select",
  ],
  // Structure only the native shell has: the spacer that gives a virtualized
  // column window its width.
  virtualization: ["virtual-spacer"],
};

/**
 * Shared structural parts still missing from a themed kit. Each entry must
 * name the concrete surface and its reason; the guard rejects stale entries
 * once every themed kit names the real element. No shared structural gaps
 * remain in the participating kits.
 */
const UNNAMED_IN_KITS = {};

/**
 * Parts one native kit renders for UI the other frameworks' native kits do not
 * have, each with the reason. A listed part must still be rendered by its kit
 * and still be missing from another native kit; otherwise the entry is stale.
 */
const NATIVE_EXTRAS = {
  "adapter-vue-unstyled": {
    "row-edit-error":
      "Vue's row-edit actions show the host's failed commit as a status; React and Angular surface edit errors on the cell editors only.",
    "batch-edit-error":
      "Vue's batch-edit bar shows the host's failed batch commit as a status; React and Angular have no batch-level error status.",
    "assistant-voice-error":
      "Vue's assistant composer names its voice-input error; React and Angular assistants show no voice-input error element.",
    "sort-direction":
      "Vue's mobile sort control toggles the direction with its own button; React and Angular mobile sorting uses the sort select alone.",
  },
};

/** Every part named in one of the two accounted-for lists. */
function accountedFor(groups) {
  return new Set(Object.values(groups).flat());
}

/**
 * Every spelling of a literal part name in a kit's own files.
 *
 * The attribute and the string key a kit uses when it hands the part through a
 * prop object to an inner element; a template binding whose expression is a
 * string literal; and a ref write where a third-party component owns the
 * element.
 */
const DATASET_PART =
  /dataset\.adapttablePart\s*=\s*["'](?<part>[a-z0-9-]+)["']/g;
const KIT_PART_PATTERNS = [
  // `data-adapttable-part="x"` as a JSX or template attribute, and
  // `{ "data-adapttable-part": "x" }` handed through a prop object.
  // A Vue `:data-adapttable-part="name"` (or `v-bind:`) binds an expression,
  // not a literal, so a leading colon does not name a part.
  /(?<!:)["']?data-adapttable-part["']?\s*[=:]\s*["'](?<part>[a-z0-9-]+)["']/g,
  // A template binding to a string literal: Vue's
  // `:data-adapttable-part="'x'"` (and `v-bind:`), Angular's
  // `[attr.data-adapttable-part]="'x'"`, and the same binding as a key of an
  // Angular component's `host` map.
  /data-adapttable-part\]?["']?\s*[=:]\s*(["'])\s*(["'])(?<part>[a-z0-9-]+)\2\s*\1/g,
  // A kit whose third-party component owns the element sets the name on it
  // through a ref: Radix Themes' `Table.Root` renders the real `<table>`
  // inside a ScrollArea and forwards loose props to the wrapper div, so the
  // only way to name the same element every other kit names is `setAttribute`
  // or the equivalent `dataset.adapttablePart` write.
  /setAttribute\(\s*["']data-adapttable-part["']\s*,\s*["'](?<part>[a-z0-9-]+)["']/g,
  DATASET_PART,
];

/**
 * The spellings the shared chrome adds: the `part` prop it hands a kit's slot
 * to put on the kit's own element, as a JSX or template attribute and as a
 * template binding to a string literal.
 */
const CHROME_PART_PATTERNS = [
  ...KIT_PART_PATTERNS,
  /\bpart[=:]\s*["'](?<part>[a-z0-9-]+)["']/g,
  /\bpart\]?\s*=\s*(["'])\s*(["'])(?<part>[a-z0-9-]+)\2\s*\1/g,
];

/** A `*_PARTS` table the kits render through: every quoted name in it. */
const PARTS_TABLE = /\b[A-Z][A-Z0-9_]*PARTS\b\s*=\s*(\{[\s\S]*?\n\})/g;

/** A structural part factory returns records, not arbitrary nested strings. */
function returnedRecordParts(expression, declarations, seen = new Set()) {
  if (!expression) return [];
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression)
  ) {
    return returnedRecordParts(expression.expression, declarations, seen);
  }
  if (ts.isIdentifier(expression)) {
    if (seen.has(expression.text)) return [];
    return returnedRecordParts(
      constantValue(expression.text, declarations),
      declarations,
      new Set([...seen, expression.text])
    );
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...returnedRecordParts(expression.whenTrue, declarations, seen),
      ...returnedRecordParts(expression.whenFalse, declarations, seen),
    ];
  }
  if (!ts.isObjectLiteralExpression(expression)) return [];
  return expression.properties.flatMap((property) =>
    ts.isPropertyAssignment(property)
      ? expressionParts(property.initializer, declarations)
      : []
  );
}

/**
 * Exported `*Parts` functions are the dynamic form of `*_PARTS` tables. Only
 * the values of their returned records are structural names: conditions,
 * helper arguments, unused records and nested callbacks are not outputs.
 */
function factoryPartNames(file, text) {
  const found = new Set();
  if (!/\.tsx?$/.test(file)) return found;
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const declarations = valueDeclarations(source);
  for (const statement of source.statements) {
    if (
      !ts.isFunctionDeclaration(statement) ||
      !statement.name?.text.endsWith("Parts") ||
      !statement.body ||
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    ) {
      continue;
    }
    function visit(node) {
      if (ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node)) {
        for (const part of returnedRecordParts(node.expression, declarations)) {
          found.add(part);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(statement.body);
  }
  return found;
}

/**
 * A sixth way to name a part: a helper whose returned record sets
 * `data-adapttable-part` from one of its own parameters, as
 * `part(name, names)` does. Each call to that helper in the same file with a
 * string literal in that position names the part. Only a helper that really
 * returns the parameter as the part counts; its name is irrelevant.
 */
function helperPartNames(file, text) {
  const found = new Set();
  if (!/\.tsx?$/.test(file)) return found;
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const helpers = declaredPartHelpers(source);
  helpers.local = new Set(helpers.keys());
  for (const [name, index] of importedPartHelpers(file, source))
    if (!helpers.has(name)) helpers.set(name, index);
  const thunks = localThunks(source);
  function visit(node) {
    const helper = ts.isCallExpression(node) && calledHelper(node, helpers);
    if (helper !== undefined && helper !== false)
      for (const name of literalBranches(node.arguments[helper], thunks))
        found.add(name);
    const value = partPropertyValue(node);
    if (value && !ts.isIdentifier(value) && namesRenderedPart(node))
      for (const name of literalBranches(value, thunks)) found.add(name);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

/**
 * The part position of a call to a known helper: `helper(...)`, or
 * `record.helper(...)` when the file itself declares a part helper of that
 * name and hands it around in a record.
 */
function calledHelper(call, helpers) {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return helpers.get(callee.text);
  if (
    ts.isPropertyAccessExpression(callee) &&
    helpers.local?.has(callee.name.text)
  )
    return helpers.get(callee.name.text);
  return undefined;
}

/** Zero-parameter local arrow functions with an expression body. */
function localThunks(source) {
  const thunks = new Map();
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isArrowFunction(node.initializer) &&
      node.initializer.parameters.length === 0 &&
      !ts.isBlock(node.initializer.body)
    )
      thunks.set(node.name.text, node.initializer.body);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return thunks;
}

/**
 * A source file's part helpers, at any depth, by declared name. A helper that
 * hands its parameter to another part helper is one too, so this repeats until
 * no new helper appears.
 */
function declaredPartHelpers(source) {
  const helpers = new Map();
  const functions = [];
  function visit(node) {
    const fn = helperFunction(node);
    if (fn) functions.push(fn);
    ts.forEachChild(node, visit);
  }
  visit(source);
  let grew = true;
  while (grew) {
    grew = false;
    for (const fn of functions) {
      if (helpers.has(fn.name)) continue;
      const index = partParameterIndex(fn.node, helpers);
      if (index >= 0) {
        helpers.set(fn.name, index);
        grew = true;
      }
    }
  }
  return helpers;
}

/** `part ?? fallback` sets the part from `part` first; that is its subject. */
function fallbackSubject(expression) {
  if (
    expression &&
    ts.isBinaryExpression(expression) &&
    (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  )
    return expression.left;
  return expression;
}

/** The argument a call hands to a known part helper's part position. */
function forwardedPart(node, helpers) {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression))
    return undefined;
  const index = helpers.get(node.expression.text);
  return index === undefined ? undefined : node.arguments[index];
}

/** A named function declaration, or a variable initialized with a function. */
function helperFunction(node) {
  if (ts.isFunctionDeclaration(node) && node.name)
    return { name: node.name.text, node };
  if (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    node.initializer &&
    (ts.isArrowFunction(node.initializer) ||
      ts.isFunctionExpression(node.initializer))
  )
    return { name: node.name.text, node: node.initializer };
  return undefined;
}

/**
 * Part helpers a file imports by relative path, resolved to the declaring file
 * rather than matched by name, so a same-named function elsewhere never counts.
 */
function importedPartHelpers(file, source) {
  const helpers = new Map();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.moduleSpecifier.text.startsWith(".") ||
      statement.importClause?.isTypeOnly
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    const base = join(dirname(file), statement.moduleSpecifier.text);
    const target = [`${base}.ts`, join(base, "index.ts"), base].find(
      (candidate) => /\.tsx?$/.test(candidate) && existsSync(candidate)
    );
    if (!target) continue;
    const declared = localPartHelpers(target);
    for (const element of bindings.elements) {
      const original = (element.propertyName ?? element.name).text;
      if (declared.has(original))
        helpers.set(element.name.text, declared.get(original));
    }
  }
  return helpers;
}

const localHelperCache = new Map();
/** A file's own part helpers, by declared name. */
function localPartHelpers(file) {
  if (!localHelperCache.has(file)) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true
    );
    localHelperCache.set(file, declaredPartHelpers(source));
  }
  return localHelperCache.get(file);
}

/** Which parameter a function returns as its record's `data-adapttable-part`. */
function partParameterIndex(fn, helpers = new Map()) {
  const parameters = fn.parameters.map((parameter) =>
    ts.isIdentifier(parameter.name) ? parameter.name.text : undefined
  );
  let index = -1;
  function visit(node) {
    if (index >= 0 || (node !== fn && ts.isFunctionLike(node))) return;
    const value = fallbackSubject(
      partPropertyValue(node) ?? forwardedPart(node, helpers)
    );
    if (value && ts.isIdentifier(value) && isReturned(node)) {
      index = parameters.indexOf(value.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(fn);
  return index;
}

/**
 * The value an object property gives a part: `"data-adapttable-part": value`
 * on an element, or `part: value` handed to a kit's slot, shorthand included.
 */
function partPropertyValue(node) {
  if (ts.isShorthandPropertyAssignment(node) && node.name.text === "part")
    return node.name;
  if (!ts.isPropertyAssignment(node)) return undefined;
  const named = ts.isStringLiteral(node.name) || ts.isIdentifier(node.name);
  const key = named ? node.name.text : undefined;
  return key === "data-adapttable-part" || key === "part"
    ? node.initializer
    : undefined;
}

/**
 * An element's `data-adapttable-part` names a part wherever it is written; a
 * `part` key only does when its record is handed straight to a call — a kit's
 * slot or a part helper — rather than sitting in an unrelated object.
 */
function namesRenderedPart(property) {
  const key = property.name.text;
  if (key === "data-adapttable-part") return true;
  const record = property.parent;
  return (
    ts.isObjectLiteralExpression(record) &&
    ts.isCallExpression(record.parent) &&
    record.parent.arguments.includes(record)
  );
}

/** The string literals an expression can evaluate to, through ternaries. */
function literalBranches(expression, thunks = new Map(), seen = new Set()) {
  if (!expression || seen.has(expression)) return [];
  const next = new Set([...seen, expression]);
  if (ts.isParenthesizedExpression(expression))
    return literalBranches(expression.expression, thunks, next);
  if (ts.isStringLiteralLike(expression)) return [expression.text];
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    expression.arguments.length === 0 &&
    thunks.has(expression.expression.text)
  )
    return literalBranches(
      thunks.get(expression.expression.text),
      thunks,
      next
    );
  if (ts.isConditionalExpression(expression))
    return [
      ...literalBranches(expression.whenTrue, thunks, next),
      ...literalBranches(expression.whenFalse, thunks, next),
    ];
  if (
    ts.isBinaryExpression(expression) &&
    (expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expression.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  )
    return [
      ...literalBranches(expression.left, thunks, next),
      ...literalBranches(expression.right, thunks, next),
    ];
  return [];
}

/** Whether an object property belongs to a record the function returns. */
function isReturned(property) {
  let node = property.parent;
  while (node && !ts.isFunctionLike(node)) {
    if (ts.isReturnStatement(node)) return true;
    if (ts.isArrowFunction(node.parent) && node.parent.body === node)
      return true;
    if (ts.isParenthesizedExpression(node)) {
      node = node.parent;
      continue;
    }
    if (ts.isObjectLiteralExpression(node) || ts.isCallExpression(node)) {
      node = node.parent;
      continue;
    }
    if (ts.isSpreadAssignment(node) || ts.isPropertyAssignment(node)) {
      node = node.parent;
      continue;
    }
    return false;
  }
  return false;
}

/** A value declaration that can introduce or shadow a JSX identifier. */
function valueName(node) {
  const declaresValue =
    ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isBindingElement(node) ||
    ts.isImportSpecifier(node) ||
    ts.isImportClause(node) ||
    ts.isNamespaceImport(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isClassDeclaration(node);
  return declaresValue && node.name && ts.isIdentifier(node.name)
    ? node.name.text
    : undefined;
}

/**
 * Definitions, rather than every string constant in a file. Ambiguous names
 * are not followed: a parameter or local declaration can shadow the constant
 * a naive file-wide lookup would mistakenly claim is rendered.
 */
function valueDeclarations(source) {
  const declarations = new Map();
  function visit(node) {
    const name = valueName(node);
    if (name) {
      const entries = declarations.get(name) ?? [];
      entries.push(node);
      declarations.set(name, entries);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return declarations;
}

/** A uniquely bound, immutable constant's initializer, if there is one. */
function constantValue(name, declarations) {
  const entries = declarations.get(name);
  if (entries?.length !== 1) return undefined;
  const [node] = entries;
  if (
    !ts.isVariableDeclaration(node) ||
    !ts.isVariableDeclarationList(node.parent)
  ) {
    return undefined;
  }
  // Const is a single flag bit; the declaration may also carry parse-context
  // flags, so equality with NodeFlags.Const would reject valid constants.
  const isConst = Math.floor(node.parent.flags / ts.NodeFlags.Const) % 2 === 1;
  return isConst ? node.initializer : undefined;
}

/** Only literal results of bounded expressions can be part names. */
function expressionParts(expression, declarations, seen = new Set()) {
  if (!expression) return [];
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return /^[a-z0-9-]+$/.test(expression.text) ? [expression.text] : [];
  }
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isNonNullExpression(expression)
  ) {
    return expressionParts(expression.expression, declarations, seen);
  }
  if (ts.isIdentifier(expression)) {
    if (seen.has(expression.text)) return [];
    return expressionParts(
      constantValue(expression.text, declarations),
      declarations,
      new Set([...seen, expression.text])
    );
  }
  if (ts.isConditionalExpression(expression)) {
    return [
      ...expressionParts(expression.whenTrue, declarations, seen),
      ...expressionParts(expression.whenFalse, declarations, seen),
    ];
  }
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  ) {
    return [
      ...expressionParts(expression.left, declarations, seen),
      ...expressionParts(expression.right, declarations, seen),
    ];
  }
  // A string passed to a function, read from an arbitrary object, or used as
  // the condition is not evidence that the expression renders that string.
  return [];
}

/** Unshadowed named imports from the modules that own the relevant contract. */
function bindingImports(source, declarations, importedName, modules) {
  const names = new Set();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.importClause?.isTypeOnly
    ) {
      continue;
    }
    if (!modules.includes(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const imported of bindings.elements) {
      if (
        !imported.isTypeOnly &&
        (imported.propertyName ?? imported.name).text === importedName &&
        declarations.get(imported.name.text)?.length === 1
      ) {
        names.add(imported.name.text);
      }
    }
  }
  return names;
}

/** A DOM-style dataset write, excluding comparisons and unrelated properties. */
function datasetPartValue(node) {
  if (
    !ts.isBinaryExpression(node) ||
    node.operatorToken.kind !== ts.SyntaxKind.EqualsToken ||
    !ts.isPropertyAccessExpression(node.left) ||
    node.left.name.text !== "adapttablePart"
  ) {
    return undefined;
  }
  const target = node.left.expression;
  return ts.isPropertyAccessExpression(target) && target.name.text === "dataset"
    ? node.right
    : undefined;
}

/**
 * JSX expressions and real dataset writes: conditional or fallback names,
 * referenced constants, and the binding's LiveRegion prop. Never infer a
 * rendered part from arbitrary strings, comments or call arguments.
 */
function scriptPartNames(file, text) {
  const found = new Set();
  if (!/\.tsx?$/.test(file)) return found;
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const declarations = valueDeclarations(source);
  const liveRegions = bindingImports(source, declarations, "LiveRegion", [
    "@adapttable/react",
    "@adapttable/react/adapter",
  ]);
  function visit(node) {
    for (const part of expressionParts(datasetPartValue(node), declarations)) {
      found.add(part);
    }
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
      const tag = node.parent.parent.tagName;
      const forwardsPart =
        node.name.text === "part" &&
        ts.isIdentifier(tag) &&
        liveRegions.has(tag.text);
      if (node.name.text === "data-adapttable-part" || forwardsPart) {
        const initializer = node.initializer;
        const value =
          initializer && ts.isJsxExpression(initializer)
            ? initializer.expression
            : initializer;
        for (const part of expressionParts(value, declarations)) {
          found.add(part);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

/** The end of an HTML opening tag, ignoring `>` inside attribute values. */
function templateTagEnd(text, start) {
  let quote;
  for (let index = start + 1; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return index;
    }
  }
  return -1;
}

/** Opening tags only, with whole HTML comments excluded. */
function* templateTags(text) {
  let offset = 0;
  while (offset < text.length) {
    const start = text.indexOf("<", offset);
    if (start === -1) return;
    if (text.startsWith("<!--", start)) {
      const end = text.indexOf("-->", start + 4);
      if (end === -1) return;
      offset = end + 3;
      continue;
    }
    if (!/^[a-z]/i.test(text.charAt(start + 1))) {
      offset = start + 1;
      continue;
    }
    const end = templateTagEnd(text, start);
    if (end === -1) return;
    offset = end + 1;
    yield text.slice(start + 1, end);
  }
}

/** The next non-whitespace character in a template tag. */
function skipTemplateWhitespace(text, offset) {
  while (/\s/.test(text.charAt(offset))) offset++;
  return offset;
}

/** An opening tag's attributes, without interpreting unrelated values. */
function templateAttributes(tag) {
  const attributes = new Map();
  const namePattern = /[^\s=<>]+/y;
  const valuePattern = /"([^"]*)"|'([^']*)'|([^\s>]+)/y;
  let offset = 0;
  while (offset < tag.length) {
    offset = skipTemplateWhitespace(tag, offset);
    namePattern.lastIndex = offset;
    const name = namePattern.exec(tag);
    if (!name) {
      offset++;
      continue;
    }
    offset = skipTemplateWhitespace(tag, namePattern.lastIndex);
    let value;
    if (tag[offset] === "=") {
      offset = skipTemplateWhitespace(tag, offset + 1);
      valuePattern.lastIndex = offset;
      const match = valuePattern.exec(tag);
      if (match) {
        value = match[1] ?? match[2] ?? match[3];
        offset = valuePattern.lastIndex;
      }
    }
    attributes.set(name[0], value);
  }
  return attributes;
}

/** Angular's literal/conditional subset also parses as a TypeScript expression. */
function templateExpressionParts(text) {
  if (text === undefined) return [];
  const source = ts.createSourceFile(
    "part-expression.ts",
    `const part = (${text});`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (source.parseDiagnostics.length > 0) return [];
  const [statement] = source.statements;
  if (!statement || !ts.isVariableStatement(statement)) return [];
  return expressionParts(
    statement.declarationList.declarations[0].initializer,
    new Map()
  );
}

/** Bounded expressions on real attributes and the known live-region directive. */
function angularTemplateParts(template, liveRegion = false) {
  const found = new Set();
  for (const tag of templateTags(template)) {
    const attrs = templateAttributes(tag);
    for (const part of templateExpressionParts(
      attrs.get("[attr.data-adapttable-part]")
    )) {
      found.add(part);
    }
    if (
      !liveRegion ||
      (!attrs.has("[adaptLiveRegion]") && !attrs.has("adaptLiveRegion"))
    ) {
      continue;
    }
    const literal = attrs.get("part");
    if (literal && /^[a-z0-9-]+$/.test(literal)) found.add(literal);
    for (const part of templateExpressionParts(attrs.get("[part]"))) {
      found.add(part);
    }
  }
  return found;
}

/** Static metadata of a real @Component decorator, not a function argument. */
function componentTemplate(node, components, liveRegions) {
  if (
    !ts.isDecorator(node) ||
    !ts.isCallExpression(node.expression) ||
    !ts.isIdentifier(node.expression.expression) ||
    !components.has(node.expression.expression.text)
  ) {
    return undefined;
  }
  const [metadata] = node.expression.arguments;
  if (!metadata || !ts.isObjectLiteralExpression(metadata)) return undefined;
  const properties = new Map(
    metadata.properties
      .filter(ts.isPropertyAssignment)
      .map((property) => [property.name.text, property.initializer])
  );
  const imports = properties.get("imports");
  const liveRegion =
    imports &&
    ts.isArrayLiteralExpression(imports) &&
    imports.elements.some(
      (entry) => ts.isIdentifier(entry) && liveRegions.has(entry.text)
    );
  const template = properties.get("template");
  if (
    template &&
    (ts.isStringLiteral(template) ||
      ts.isNoSubstitutionTemplateLiteral(template))
  ) {
    return { template: template.text, liveRegion };
  }
  const templateUrl = properties.get("templateUrl");
  return templateUrl && ts.isStringLiteral(templateUrl)
    ? { templateUrl: templateUrl.text, liveRegion }
    : undefined;
}

/** Inline Angular templates and their explicitly paired external templates. */
function angularPartNames(sources) {
  const found = new Set();
  for (const [file, text] of sources) {
    if (file.endsWith(".html")) {
      for (const part of angularTemplateParts(text)) found.add(part);
    }
    if (!file.endsWith(".ts") || !text.includes("@angular/core")) continue;
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const declarations = valueDeclarations(source);
    const components = bindingImports(source, declarations, "Component", [
      "@angular/core",
    ]);
    const liveRegions = bindingImports(
      source,
      declarations,
      "AdaptLiveRegion",
      ["@adapttable/angular", "@adapttable/angular/adapter"]
    );
    function visit(node) {
      const entry = componentTemplate(node, components, liveRegions);
      if (entry) {
        const template =
          entry.template ?? sources.get(join(dirname(file), entry.templateUrl));
        if (template !== undefined) {
          for (const part of angularTemplateParts(template, entry.liveRegion)) {
            found.add(part);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return found;
}

/** Every literal or bounded JSX expression that names a rendered part. */
function namesIn(files, patterns) {
  const found = new Set();
  const sources = new Map(
    files.map((file) => [file, readFileSync(file, "utf8")])
  );
  for (const [file, text] of sources) {
    for (const part of scriptPartNames(file, text)) found.add(part);
    for (const pattern of patterns) {
      // Script assignments are parsed above so examples/comments do not
      // count. A Vue template's script retains the existing literal route.
      if (pattern === DATASET_PART && /\.tsx?$/.test(file)) continue;
      for (const match of text.matchAll(pattern)) found.add(match.groups.part);
    }
  }
  for (const part of angularPartNames(sources)) found.add(part);
  return found;
}

/** Every file of a kit's sources its framework's guards read. */
const kitFiles = (kit, root) =>
  kitSourceDirs(kit, root).flatMap((dir) => frameworkFiles(dir, kit.framework));

/**
 * The part names one adapter emits, read from its framework's sources and
 * templates.
 */
function partsOf(kit, root) {
  const files = kitFiles(kit, root);
  const found = namesIn(files, KIT_PART_PATTERNS);
  for (const file of files)
    for (const part of helperPartNames(file, readFileSync(file, "utf8")))
      found.add(part);
  if (kit.framework === "vue") {
    for (const part of vueRenderedParts(vueBindingSources(files, root)))
      found.add(part);
  }
  return found;
}

/**
 * The part names the chrome in these files owns.
 *
 * Chrome names a part in five ways, and only the first looks like the others:
 * the attribute it renders itself, the `part` prop it hands a kit's slot to put
 * on the kit's own element, a `*_PARTS` table or `*Parts` factory the kits render
 * through, and a `setAttribute` / `dataset.adapttablePart` on a ref where the element belongs
 * to the kit but the naming does not. All five land in every kit by
 * construction, which is exactly why none of them shows up in an adapter's
 * source.
 */
function chromeNamesIn(files) {
  const found = namesIn(files, CHROME_PART_PATTERNS);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const part of factoryPartNames(file, text)) found.add(part);
    for (const part of helperPartNames(file, text)) found.add(part);
    for (const match of text.matchAll(PARTS_TABLE)) {
      for (const name of match[1].matchAll(/["']([a-z0-9-]+)["']/g)) {
        found.add(name[1]);
      }
    }
  }
  return found;
}

/** Binding sources include Angular's explicitly configured secondary entries. */
function bindingFiles(framework, root) {
  const dir = bindingDir(framework, root);
  if (!existsSync(dir)) return [];
  const secondary = readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(dir, entry.name, "ng-package.json"))
    )
    .map((entry) => join(dir, entry.name));
  return [join(dir, "src"), ...secondary].flatMap((source) =>
    frameworkFiles(source, framework)
  );
}

/**
 * The part names the shared chrome owns, per framework — `@adapttable/core`
 * and that framework's binding together, since the split put the engine in one
 * and the structural Chrome in the other. Both are upstream of every kit on the
 * framework, so both count as "core owns this name" for those kits.
 */
function chromeByFramework(frameworks, root) {
  const core = chromeNamesIn(
    frameworkFiles(join(coreDir(root), "src"), NEUTRAL)
  );
  return new Map(
    frameworks.map((framework) => [
      framework,
      new Set([...core, ...chromeNamesIn(bindingFiles(framework, root))]),
    ])
  );
}

/** Whether a kit's files call one of its binding's prop-getters by name. */
function callsCoreGetter(kit, getter, root) {
  if (kit.framework === "vue") {
    const sources = vueKitWithBindingSources(kitFiles(kit, root), root);
    return vueForwardsAttributeApi(sources, "tr", getter);
  }
  // Angular also uses `rowAttrs` for the assembled record and for reorder
  // state. Only the table/grid call carries the canonical row part.
  const call = new RegExp(
    kit.framework === "angular"
      ? `\\b(?:table|grid)\\.${getter}\\s*\\(`
      : `\\b${getter}\\b`
  );
  return kitFiles(kit, root).some(
    (file) =>
      call.test(readFileSync(file, "utf8")) ||
      inheritedBindingSources(file, kit.framework, root).some((base) =>
        call.test(base.source)
      )
  );
}

/**
 * How one kit accounts for one contract part: its own literal, a binding
 * prop-getter it spreads, an EXPECTED_GAPS entry — or nothing, which fails.
 */
/**
 * The structural parts a Vue kit's own server-rendered contract test asserts.
 * A Vue kit can forward the binding's attrs through its kit's own wrapper
 * components, where no static trace can follow them; the rendered table is the
 * proof then, as each React kit's `RowParts.test.tsx` is. Only a test that lists
 * the parts and asserts the rendered list equals them counts.
 */
const VUE_CONTRACT_TEST = "test/structural-parts.ssr.test.ts";
function renderedContractParts(kit, root) {
  const file = join(kitDir(kit, root), VUE_CONTRACT_TEST);
  if (kit.framework !== "vue" || !existsSync(file)) return new Set();
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
  const listed = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .filter((declaration) => declaration.name.getText() === "STRUCTURAL_PARTS")
    .flatMap((declaration) => {
      let value = declaration.initializer;
      while (value && ts.isAsExpression(value)) value = value.expression;
      return value && ts.isArrayLiteralExpression(value)
        ? value.elements.filter(ts.isStringLiteral).map((item) => item.text)
        : [];
    });
  return source.text.includes("toEqual([...STRUCTURAL_PARTS])")
    ? new Set(listed)
    : new Set();
}

function contractAccount(kit, part, parts, context) {
  if (parts.has(part)) return null;
  if (renderedContractParts(kit, context.root).has(part)) return null;
  const routes = context.getterParts[kit.framework]?.[part];
  if (routes?.some((getter) => callsCoreGetter(kit, getter, context.root))) {
    return null;
  }
  if (context.expectedGaps[kit.name]?.[part] !== undefined) return null;
  return routes
    ? `neither names it nor calls ${routes.join(" or ")}`
    : "not named";
}

/**
 * The claim that a binding owns a contract name, checked for rot: a route that
 * stops emitting its part takes every kit on that framework down with it, so
 * it fails here by name rather than as one identical failure per kit.
 */
function coreOwnershipFailures(chrome, getterParts) {
  const failures = [];
  for (const [framework, parts] of chrome) {
    for (const [part, routes] of Object.entries(getterParts[framework] ?? {})) {
      if (parts.has(part)) continue;
      failures.push({
        part,
        pkg: FRAMEWORKS[framework].binding,
        why: `${routes.join(" and ")} no longer emit it, so no kit spreads it`,
      });
    }
  }
  return failures;
}

/**
 * The contract side of the check: every name in {@link CONTRACT}, in every kit
 * the contract binds, accounted for.
 */
function contractFailures(byKit, chrome, context) {
  const failures = coreOwnershipFailures(chrome, context.getterParts);
  for (const part of context.contract) {
    for (const kit of context.contractKits) {
      const why = contractAccount(kit, part, byKit.get(kit.name), context);
      if (why) failures.push({ part, pkg: kit.name, why });
    }
  }
  return failures;
}

/**
 * The native-only side of the check: every name a native kit emits that no
 * themed kit does and its framework's chrome does not own has to be accounted
 * for, and every account has to still be true of some native kit.
 */
function nativeOnlyFailures(byKit, everyPart, chrome, context) {
  const fallback = accountedFor(context.fallbackOnly);
  const unnamed = accountedFor(context.unnamedInKits);
  // A shell can receive a name from its binding rather than spelling it in
  // its own files. Compare effective themed parts here as well: a native kit
  // on another framework must not make that shared name look native-only.
  const themedParts = new Set([
    ...everyPart,
    ...context.shellKits.flatMap((kit) => [...chrome.get(kit.framework)]),
  ]);
  const gap = new Set();
  for (const kit of context.nativeKits) {
    const owned = chrome.get(kit.framework);
    for (const part of byKit.get(kit.name)) {
      if (!themedParts.has(part) && !owned.has(part)) gap.add(part);
    }
  }
  const unaccounted = [...gap].filter(
    (part) => !fallback.has(part) && !unnamed.has(part)
  );
  const stale = [...fallback, ...unnamed].filter((part) => !gap.has(part));
  return {
    unaccounted: unaccounted.sort(),
    stale: stale.sort(),
    unnamed: unnamed.size,
  };
}

/**
 * Every native kit renders the same public parts, whether each name comes
 * from the kit itself or its binding's Chrome. Comparing only the union of
 * native literals against themed kits lets one native kit lose a part while
 * another keeps it, hiding that loss even from the native-only account lists.
 */
function nativeParityFailures(byKit, chrome, context) {
  const native = context.nativeKits;
  const rendered = new Map(
    native.map((kit) => [
      kit.name,
      new Set([...byKit.get(kit.name), ...chrome.get(kit.framework)]),
    ])
  );
  const everyPart = new Set(
    [...rendered.values()].flatMap((parts) => [...parts])
  );
  return [...everyPart].sort().flatMap((part) => {
    const missing = native
      .filter((kit) => !rendered.get(kit.name).has(part))
      .map((kit) => kit.name);
    if (missing.length === 0) return [];
    const owners = native.filter((kit) => !missing.includes(kit.name));
    const accounted = owners.every(
      (kit) => context.nativeExtras[kit.name]?.[part] !== undefined
    );
    return accounted ? [] : [{ part, missing }];
  });
}

/**
 * Every native extra still describes the kits as they are: the listed kit
 * renders the part and at least one other native kit still does not.
 */
function staleNativeExtras(byKit, chrome, context) {
  const rendered = (kit) =>
    new Set([...byKit.get(kit.name), ...chrome.get(kit.framework)]);
  return Object.entries(context.nativeExtras).flatMap(([name, parts]) =>
    Object.keys(parts).flatMap((part) => {
      const kit = context.nativeKits.find((item) => item.name === name);
      // A run over a subset of the registry (a fixture) judges only its kits.
      if (!kit)
        return context.registered.has(name)
          ? [`${part} — ${name} is not a native kit`]
          : [];
      if (!rendered(kit).has(part))
        return [`${part} — ${name} no longer renders it`];
      const others = context.nativeKits.filter((item) => item !== kit);
      return others.every((item) => rendered(item).has(part))
        ? [`${part} — every native kit renders it now`]
        : [];
    })
  );
}

/**
 * The themed side of the check: a part some themed kits spell and others do not.
 * Names a binding's prop-getters emit are skipped — they appear in no kit's
 * source by design, so comparing spellings would report the kits that take it
 * the shared way; the contract check owns those. A kit whose framework's chrome
 * names the part has it by construction.
 */
function themedFailures(byKit, nativeParts, everyPart, chrome, context) {
  const shell = context.shellKits;
  const getterNames = new Set(
    [...chrome.keys()].flatMap((framework) =>
      Object.keys(context.getterParts[framework] ?? {})
    )
  );
  const failures = [];
  const renders = (kit, part) =>
    byKit.get(kit.name).has(part) || chrome.get(kit.framework).has(part);
  for (const part of [...everyPart].sort()) {
    if (getterNames.has(part)) continue;
    // Themed kits are held to the parts their own framework's themed kits
    // render; frameworks are held to each other through their native kits.
    const frameworks = new Set(
      shell.filter((kit) => renders(kit, part)).map((kit) => kit.framework)
    );
    const missing = shell.filter(
      (kit) =>
        frameworks.has(kit.framework) &&
        !renders(kit, part) &&
        context.expectedGaps[kit.name]?.[part] === undefined
    );
    if (missing.length === 0) continue;
    // A part only ONE themed kit renders is usually that kit's own — unless a
    // native kit renders it too, which makes it shared chrome the others
    // simply never named. `cards` sat in exactly that state: antd and
    // unstyled emitted it, five kits rendered the list without naming it, and
    // treating "one kit" as "kit-specific" hid it.
    const peers = shell.filter((kit) => frameworks.has(kit.framework));
    if (!nativeParts.has(part) && missing.length === peers.length - 1) {
      continue;
    }
    failures.push({ part, missing: missing.map((kit) => kit.name) });
  }
  return failures;
}

/**
 * Run every side of the check.
 *
 * Returns the failure groups in the order they are reported — each with a
 * headline, one line per failure and the advice that closes it — and the
 * summary a clean run prints. The registry is checked first, because a kit it
 * cannot place is a kit this would otherwise read nothing from.
 *
 * @param {object} [options] everything the check reads, for fixtures
 * @param {string} [options.root] repository root
 * @param {readonly import("./kits.mjs").Kit[]} [options.kits] the kit registry
 * @param {readonly string[]} [options.contract] the structural contract
 * @param {Record<string, Record<string, string>>} [options.expectedGaps]
 * @param {Record<string, Record<string, string[]>>} [options.getterParts]
 * @param {Record<string, string[]>} [options.fallbackOnly]
 * @param {Record<string, string[]>} [options.unnamedInKits]
 * @param {Record<string, Record<string, string>>} [options.nativeExtras]
 * @returns {{ failures: { headline: string, lines: string[], advice: string }[], summary: string }}
 */
export function checkPartsParity({
  root = REPO_ROOT,
  kits = KITS,
  contract = CONTRACT,
  expectedGaps = EXPECTED_GAPS,
  getterParts = CORE_GETTER_PARTS,
  fallbackOnly = FALLBACK_ONLY,
  unnamedInKits = UNNAMED_IN_KITS,
  nativeExtras = NATIVE_EXTRAS,
} = {}) {
  const registry = kitRegistryErrors(root, kits);
  if (registry.length > 0) {
    return {
      failures: [
        {
          headline: `${registry.length} kit registry problem(s):`,
          lines: registry,
          advice:
            "scripts/kits.mjs registers every kit with its framework and role " +
            "— correct the entry or the package so the two agree.",
        },
      ],
      summary: "",
    };
  }

  const context = {
    root,
    contract,
    expectedGaps,
    getterParts,
    fallbackOnly,
    unnamedInKits,
    nativeExtras,
    registered: new Set(kits.map((kit) => kit.name)),
    // The adapters that render the shared shell's chrome with their own kit's
    // components. They should agree part-for-part.
    shellKits: shellKits(kits),
    nativeKits: nativeKits(kits),
    // The kits the contract binds: the themed shells plus each
    // framework's native kit, which builds the same shell out of native
    // elements. adapter-shadcn renders adapter-unstyled and inherits every
    // name from it, and adapter-bootstrap is the private minimal reference —
    // it has no toolbar at all. Both roles sit outside the contract in
    // `scripts/kits.mjs`.
    contractKits: contractKits(kits),
  };
  const byKit = new Map(
    context.contractKits.map((kit) => [kit.name, partsOf(kit, root)])
  );
  const chrome = chromeByFramework(frameworksIn(context.contractKits), root);
  // A native kit renders the fallback for every piece of shared chrome, so a
  // name it emits is shared by definition — the reference for telling "this
  // kit's own part" from "a part the others forgot".
  const nativeParts = new Set(
    context.nativeKits.flatMap((kit) => [...byKit.get(kit.name)])
  );
  const everyPart = new Set(
    context.shellKits.flatMap((kit) => [...byKit.get(kit.name)])
  );
  const natives =
    context.nativeKits.map((kit) => kit.name).join(" and ") ||
    "the native kits";

  const contractMissing = contractFailures(byKit, chrome, context);
  const native = nativeParityFailures(byKit, chrome, context);
  const staleExtras = staleNativeExtras(byKit, chrome, context);
  const themed = themedFailures(byKit, nativeParts, everyPart, chrome, context);
  const { unaccounted, stale, unnamed } = nativeOnlyFailures(
    byKit,
    everyPart,
    chrome,
    context
  );

  const failures = [
    {
      headline: `${contractMissing.length} structural contract part(s) are missing:`,
      lines: contractMissing.map(
        ({ part, pkg, why }) => `${part} — ${pkg}: ${why}`
      ),
      advice:
        "These seven names are the structural contract (owner decision, " +
        `2026-08-16): ${contract.join(" · ")}. Every kit that renders the ` +
        "shell emits all seven — put the attribute on the element that kit " +
        "renders, or route it through the core prop-getter every kit spreads.",
    },
    {
      headline: `${native.length} part(s) differ between native kits:`,
      lines: native.map(
        ({ part, missing }) => `${part} — missing from ${missing.join(", ")}`
      ),
      advice:
        "Every native kit renders the same public parts, supplied by its " +
        "own elements or its binding's Chrome. Restore each missing part " +
        "where that element renders; another native kit naming it does not " +
        "satisfy this kit's contract.",
    },
    {
      headline: `${staleExtras.length} native extra(s) in NATIVE_EXTRAS are stale:`,
      lines: staleExtras,
      advice:
        "Each NATIVE_EXTRAS entry names a part only its native kit renders. " +
        "Remove an entry once every native kit renders the part, or when its " +
        "kit stops rendering it.",
    },
    {
      headline: `${themed.length} part(s) are rendered by some adapters and not others:`,
      lines: themed.map(
        ({ part, missing }) => `${part} — missing from ${missing.join(", ")}`
      ),
      advice:
        "A part name is public contract: the same name lands on the same " +
        "element in every kit that renders the thing. Add it where it is " +
        "missing, or — if a kit genuinely cannot render it — add an " +
        "EXPECTED_GAPS entry in scripts/check-parts-parity.mjs saying why.",
    },
    {
      headline: `${unaccounted.length} part(s) are emitted by ${natives} alone:`,
      lines: unaccounted,
      advice:
        "A part the native fallback names and no themed kit does is either a " +
        "widget only that adapter builds — add it to FALLBACK_ONLY in " +
        "scripts/check-parts-parity.mjs with the reason — or the same element " +
        "in every themed kit with a name in one, which is the defect this " +
        "catches: add the name to every kit that renders it.",
    },
    {
      headline: `${stale.length} accounted-for part(s) no longer match reality:`,
      lines: stale,
      advice:
        "Each of these is listed in FALLBACK_ONLY or UNNAMED_IN_KITS in " +
        "scripts/check-parts-parity.mjs, but the themed kits now name it (or " +
        `${natives} no longer does). Remove the entry — a list of gaps ` +
        "that cannot shrink is a list nobody trusts.",
    },
  ].filter((failure) => failure.lines.length > 0);

  const chromeNames = new Set([...chrome.values()].flatMap((set) => [...set]));
  return {
    failures,
    summary:
      `parts-parity: the ${contract.length} contract parts hold in ${context.contractKits.length} kits; ` +
      `${everyPart.size} part names agree across ${context.shellKits.length} adapters; ` +
      `${chromeNames.size} more come from core's chrome; ` +
      `${unnamed} structural parts are still unnamed outside ${natives}.`,
  };
}

/**
 * What each private kit still lacks against its reference: the parts the
 * reference renders — its own and its framework's chrome — that the kit and
 * its framework's chrome do not.
 *
 * @param {object} [options] everything the report reads, for fixtures
 * @param {string} [options.root] repository root
 * @param {readonly import("./kits.mjs").Kit[]} [options.kits] the kit registry
 * @param {Record<string, string>} [options.references] private kit → reference kit
 * @returns {{ kit: string, reference: string, missing: string[] }[]}
 */
export function partsGapReport({
  root = REPO_ROOT,
  kits = KITS,
  references = REPORT_REFERENCES,
} = {}) {
  const byName = new Map(kits.map((kit) => [kit.name, kit]));
  const pairs = kits
    .filter((kit) => kit.role === "private" && byName.has(references[kit.name]))
    .map((kit) => [kit, byName.get(references[kit.name])]);
  const chrome = chromeByFramework(frameworksIn(pairs.flat()), root);
  const rendered = (kit) =>
    new Set([...partsOf(kit, root), ...chrome.get(kit.framework)]);
  return pairs.map(([kit, reference]) => {
    const has = rendered(kit);
    return {
      kit: kit.name,
      reference: reference.name,
      missing: [...rendered(reference)].filter((part) => !has.has(part)).sort(),
    };
  });
}

/** Print the gap report: one block per private kit, then exit 0. */
function printReport() {
  for (const { kit, reference, missing } of partsGapReport()) {
    console.log(
      `${kit} is missing ${missing.length} part(s) ${reference} renders:`
    );
    for (const part of missing) console.log(`  ${part}`);
  }
}

function main() {
  const { failures, summary } = checkPartsParity();
  const [first] = failures;
  if (first) {
    console.error(`\n${first.headline}\n`);
    for (const line of first.lines) console.error(`  ${line}`);
    console.error(`\n${first.advice}`);
    process.exit(1);
  }
  console.log(summary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--report")) printReport();
  else main();
}

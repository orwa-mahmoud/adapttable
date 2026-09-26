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
 * 2. **Only shared surfaces are compared.** adapter-unstyled renders the
 *    native fallbacks for every kit and so names far more parts than any
 *    themed adapter; shadcn wraps it and names almost none. Neither is a
 *    defect, so parity is judged across the six themed adapters that share
 *    the shell, and `EXPECTED_GAPS` records the ones a kit genuinely cannot
 *    render — each with the reason, so an entry is an argument rather than a
 *    silencer.
 *
 * Two whole classes of part were invisible to it, which is how
 * `saved-view-readonly` and `saved-view-default` survived: emitted by
 * adapter-unstyled alone, they never entered the comparison at all, because a
 * name no themed kit spells cannot be missing from a themed kit. So there are
 * now three sources, not two:
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
 *   a `*_PARTS` table the kits render through, some set on a ref. Those land
 *   in every kit by construction, so they are exempt from the unstyled
 *   comparison and counted in the summary instead of being unaccounted for.
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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
  nativeKits,
  NEUTRAL,
  shellKits,
} from "./kits.mjs";
import { REPO_ROOT } from "./packages.mjs";

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
 * receives the same props already merged, through `createDesktopRow`. A
 * framework with no entry has no such route, and its kits name every contract
 * part themselves.
 */
const CORE_GETTER_PARTS = {
  react: { row: ["getRowProps", "createDesktopRow"] },
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
 * Parts the themed kits DO render an element for and have never named.
 *
 * Not a design decision — a gap, and the reason it is written down instead of
 * fixed in passing is that each one is six edits and a rendered assertion per
 * kit. Listed so the check has no blind spot: this file is where the debt is,
 * the summary prints its size on every run, and an entry that gets fixed has
 * to be removed or the check fails on the stale claim.
 */
const UNNAMED_IN_KITS = {
  "table structure": [
    "footer",
    "summary",
    "summary-row",
    "summary-cell",
    "resize-handle",
  ],
  "row extras": [
    "actions-cell",
    "actions-header",
    "detail-cell",
    "detail-row",
    "expand-cell",
    "expand-header",
  ],
  "mobile cards": ["card-actions", "card-label", "card-row"],
  "toolbar controls": ["search", "search-field", "search-icon"],
  "filter chips": ["chip", "chip-remove", "chips"],
  "empty and error states": ["empty", "error"],
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
const KIT_PART_PATTERNS = [
  // `data-adapttable-part="x"` as a JSX or template attribute, and
  // `{ "data-adapttable-part": "x" }` handed through a prop object.
  /["']?data-adapttable-part["']?\s*[=:]\s*["'](?<part>[a-z0-9-]+)["']/g,
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
  /dataset\.adapttablePart\s*=\s*["'](?<part>[a-z0-9-]+)["']/g,
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

/** Every name the patterns find in the files. */
function namesIn(files, patterns) {
  const found = new Set();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) found.add(match.groups.part);
    }
  }
  return found;
}

/** Every file of a kit's `src` its framework's guards read. */
const kitFiles = (kit, root) =>
  frameworkFiles(join(kitDir(kit, root), "src"), kit.framework);

/**
 * The part names one adapter emits, read from its framework's sources and
 * templates.
 */
function partsOf(kit, root) {
  return namesIn(kitFiles(kit, root), KIT_PART_PATTERNS);
}

/**
 * The part names the chrome in these files owns.
 *
 * Chrome names a part in four ways, and only the first looks like the others:
 * the attribute it renders itself, the `part` prop it hands a kit's slot to put
 * on the kit's own element, a `*_PARTS` table the kits render through, and a
 * `setAttribute` / `dataset.adapttablePart` on a ref where the element belongs
 * to the kit but the naming does not. All four land in every kit by
 * construction, which is exactly why none of them shows up in an adapter's
 * source.
 */
function chromeNamesIn(files) {
  const found = namesIn(files, CHROME_PART_PATTERNS);
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(PARTS_TABLE)) {
      for (const name of match[1].matchAll(/["']([a-z0-9-]+)["']/g)) {
        found.add(name[1]);
      }
    }
  }
  return found;
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
      new Set([
        ...core,
        ...chromeNamesIn(
          frameworkFiles(join(bindingDir(framework, root), "src"), framework)
        ),
      ]),
    ])
  );
}

/** Whether a kit's files call one of its binding's prop-getters by name. */
function callsCoreGetter(kit, getter, root) {
  const call = new RegExp(`\\b${getter}\\b`);
  return kitFiles(kit, root).some((file) =>
    call.test(readFileSync(file, "utf8"))
  );
}

/**
 * How one kit accounts for one contract part: its own literal, a binding
 * prop-getter it spreads, an EXPECTED_GAPS entry — or nothing, which fails.
 */
function contractAccount(kit, part, parts, context) {
  if (parts.has(part)) return null;
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
  const gap = new Set();
  for (const kit of context.nativeKits) {
    const owned = chrome.get(kit.framework);
    for (const part of byKit.get(kit.name)) {
      if (!everyPart.has(part) && !owned.has(part)) gap.add(part);
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
  for (const part of [...everyPart].sort()) {
    if (getterNames.has(part)) continue;
    const missing = shell.filter(
      (kit) =>
        !byKit.get(kit.name).has(part) &&
        !chrome.get(kit.framework).has(part) &&
        context.expectedGaps[kit.name]?.[part] === undefined
    );
    if (missing.length === 0) continue;
    // A part only ONE themed kit renders is usually that kit's own — unless a
    // native kit renders it too, which makes it shared chrome the others
    // simply never named. `cards` sat in exactly that state: antd and
    // unstyled emitted it, five kits rendered the list without naming it, and
    // treating "one kit" as "kit-specific" hid it.
    if (!nativeParts.has(part) && missing.length === shell.length - 1) {
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

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

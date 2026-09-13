/**
 * Which guides travel upfront, and which the backend has to ask for.
 *
 * One mechanism, not two. `compact` and `full` are the same selector under
 * different budgets, so there is no second code path where a profile quietly
 * behaves differently — and an expert who wants a specific budget, their own
 * tokenizer or a particular ordering is turning the same dials rather than
 * finding a third mode.
 *
 * What it will not do:
 *
 * - **Cut a schema in half to fit a number.** A guide is a coherent executable
 *   unit: it travels whole or it is deferred and named. Half an input schema
 *   is a call the model will get wrong and be refused for.
 * - **Truncate silently.** Everything not selected is reported by key, with
 *   the reason, so a developer can see why the model was never told about
 *   something rather than guessing from its behaviour.
 * - **Read rows to guess relevance.** Deciding which guide matters by looking
 *   at the data would be a data read nobody asked for, on every turn.
 *
 * Sizes are estimates unless the host supplies a tokenizer, and they are
 * labelled as estimates. Bytes are UTF-8 and exact, because a transport limit
 * is about bytes and there is nothing to estimate.
 */
import type { ContextCapability, ContextColumn } from "./contextSnapshot";
import type { CapabilityGuide } from "./types";

/**
 * How much context to build.
 *
 * `compact` carries the common operations in full and defers the rest;
 * `full` carries everything that fits inside the hard limit.
 *
 * @public
 */
export type AgentContextProfile = "compact" | "full";

/** How the caller wants the context selected. @public */
export interface AgentContextOptions {
  /** Defaults to `compact`. */
  readonly profile?: AgentContextProfile;
  /**
   * Soft budget in estimated tokens.
   *
   * Defaults to 1,000 for `compact`; `full` has none unless one is given. A
   * budget is a target, never a licence to ship an unusable fragment.
   */
  readonly tokenBudget?: number;
  /** Keys to consider before the rest, after the common operations. */
  readonly priority?: readonly string[];
  /**
   * Keys this backend has already asked about under this same contract.
   *
   * Considered before anything else, including the common operations: a
   * backend that spent a discovery round on a guide has said what the
   * conversation is about more precisely than any general list can. Still
   * inside the budget — this changes what is considered first, never what is
   * allowed to exceed the budget.
   */
  readonly asked?: readonly string[];
  /**
   * Keys whose guides must travel upfront.
   *
   * A request, not a permission: a key that is excluded or unwired stays that
   * way, and asking for one is an error rather than a silent omission.
   */
  readonly include?: readonly string[];
  /** The host's own tokenizer. Without it, sizes are estimated. */
  readonly estimateTokens?: (text: string) => number;
}

/** Why something is not in the upfront context. @public */
export type DeferralReason = "budget" | "hard-limit";

/**
 * What was held back.
 *
 * A guide is instructions for calling a capability that is still offered; a
 * column is a description of a column the table still permits. Neither
 * deferral removes anything — both say "ask for this", and the key is what to
 * ask with.
 *
 * @public
 */
export type DeferralKind = "guide" | "column";

/** What the selector did, and why. @public */
export interface AgentContextSelection {
  readonly profile: AgentContextProfile;
  /** This selection's own identity, covering the settings as well. */
  readonly version: string;
  /** Keys whose guides travel upfront, in the order they were chosen. */
  readonly selected: readonly string[];
  /** Keys the backend must ask for, with the reason each was left out. */
  readonly deferred: readonly {
    readonly key: string;
    readonly reason: DeferralReason;
    /** Defaults to `guide` for a capability whose instructions were held back. */
    readonly kind?: DeferralKind;
  }[];
  /**
   * Column ids described nowhere in this contract.
   *
   * The table still permits every one of them — what was deferred is the
   * description, not the permission — and `columns.describe` returns the
   * detail on request. Published as ids so a model knows they exist rather
   * than concluding the table has fewer columns than it has.
   */
  readonly deferredColumns?: readonly string[];
  /** Exact UTF-8 size of the serialized contract. */
  readonly contractBytes: number;
  /** Exact UTF-8 size of the serialized view state, counted separately. */
  readonly viewBytes: number;
  /** Estimated tokens for the contract. */
  readonly estimatedTokens: number;
  /** Whether {@link estimatedTokens} came from a real tokenizer. */
  readonly estimated: boolean;
  /** Anything the selector could not carry, said plainly. */
  readonly notes?: readonly string[];
}

/**
 * The operations nearly every request needs, in the order a reader meets them.
 *
 * Deliberately a list rather than a heuristic: "what does this prompt need" is
 * a question only the data could answer, and reading the data to answer it is
 * exactly what must not happen on every turn.
 */
const COMMON_FIRST: readonly string[] = [
  "view.setFilters",
  "view.setSort",
  "view.setSearch",
  "view.setPage",
  "rows.read",
];

/** Compact's soft budget when the caller names none. */
export const DEFAULT_COMPACT_TOKENS = 1_000;

/** Nothing leaves this process larger than this, whatever the profile says. */
export const MAX_CONTEXT_BYTES = 128_000;

/** Roughly four characters to a token. An estimate, and labelled as one. */
function estimate(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Exact, because a transport limit is about bytes. */
export function utf8Bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value) ?? "").byteLength;
}

/**
 * The order guides are considered in.
 *
 * Common operations first so a small budget still buys a usable table, then
 * whatever the host prioritized, then everything else in registry order —
 * which is deterministic, so the same table produces the same context twice.
 * Requested includes are deduplicated against all of it.
 */
export function selectionOrder(
  keys: readonly string[],
  priority: readonly string[] = [],
  asked: readonly string[] = []
): readonly string[] {
  const available = new Set(keys);
  const ordered: string[] = [];
  const take = (key: string): void => {
    if (!available.has(key) || ordered.includes(key)) return;
    ordered.push(key);
  };
  for (const key of asked) take(key);
  for (const key of COMMON_FIRST) take(key);
  for (const key of priority) take(key);
  for (const key of keys) take(key);
  return ordered;
}

/** A key asked for that this table cannot offer at all. */
export class ContextIncludeError extends Error {
  readonly code = "include-unavailable";
  constructor(keys: readonly string[]) {
    const named = keys.map((key) => JSON.stringify(key)).join(", ");
    super(`cannot include ${named}: not available on this table`);
    this.name = "ContextIncludeError";
  }
}

/**
 * Choose which guides travel, and say what did not.
 *
 * @param capabilities - Every permitted capability, in registry order.
 * @param guideFor - The guide for one key, read only when it is considered.
 * @param options - Profile, budget and expert overrides.
 * @returns The capabilities with guides attached, and what was left out.
 */
export function selectGuides(
  capabilities: readonly ContextCapability[],
  guideFor: (key: string) => CapabilityGuide,
  options: AgentContextOptions = {},
  budgetLabel?: number
): {
  readonly capabilities: readonly ContextCapability[];
  readonly selected: readonly string[];
  readonly deferred: readonly { key: string; reason: DeferralReason }[];
  readonly notes: readonly string[];
} {
  const profile = options.profile ?? "compact";
  const budget =
    options.tokenBudget ??
    (profile === "compact" ? DEFAULT_COMPACT_TOKENS : undefined);
  const measure = options.estimateTokens ?? estimate;
  const keys = capabilities.map((entry) => entry.key);

  // An impossible include is an error, not a silent omission: a developer who
  // named a key deserves to know it is excluded rather than discover it from
  // the model's behaviour three turns later.
  const impossible = (options.include ?? []).filter(
    (key) => !keys.includes(key)
  );
  if (impossible.length > 0) throw new ContextIncludeError(impossible);

  // The common operations keep their guidance whatever the budget says. A
  // context that fits a number but leaves a model unable to filter, sort or
  // page is not a smaller context — it is an assistant that cannot answer, and
  // the budget was meant to shape the reply rather than remove it. Everything
  // else defers by name and is one `describe` away.
  const required = new Set([
    ...(options.include ?? []),
    ...COMMON_FIRST.filter((key) => keys.includes(key)),
    // A guide this backend already spent a discovery round on. Carrying it is
    // strictly cheaper than the round it would otherwise spend asking again,
    // and the backend naming it is a better statement of what this
    // conversation needs than any general list. Bounded by what the cache
    // holds per contract, and by the hard byte limit below.
    ...(options.asked ?? []).filter((key) => keys.includes(key)),
  ]);
  const order = selectionOrder(keys, options.priority, options.asked);
  // Requested includes are considered first, without being listed twice.
  const considered = [
    ...order.filter((key) => required.has(key)),
    ...order.filter((key) => !required.has(key)),
  ];

  const byKey = new Map(capabilities.map((entry) => [entry.key, entry]));
  const withGuides = new Map<string, ContextCapability>();
  const selected: string[] = [];
  const deferred: { key: string; reason: DeferralReason }[] = [];
  const notes: string[] = [];
  let spent = 0;
  let bytes = utf8Bytes(capabilities);

  for (const key of considered) {
    const capability = byKey.get(key);
    if (!capability) continue;
    const guide = guideFor(key);
    // Input guidance is what lets a model call something correctly. An output
    // schema is bulk it can read from the result it is handed.
    const attached: ContextCapability = {
      ...capability,
      guide: guide.guide,
      input: guide.input,
    };
    const cost = measure(
      JSON.stringify({ guide: guide.guide, input: guide.input })
    );
    const grown = bytes + utf8Bytes(attached) - utf8Bytes(capability);

    if (grown > MAX_CONTEXT_BYTES) {
      deferred.push({ key, reason: "hard-limit" });
      continue;
    }
    if (budget !== undefined && spent + cost > budget && !required.has(key)) {
      // Whole or not at all. The key is named so the backend can ask.
      deferred.push({ key, reason: "budget" });
      continue;
    }
    withGuides.set(key, attached);
    selected.push(key);
    spent += cost;
    bytes = grown;
  }

  if (
    budget !== undefined &&
    deferred.some((entry) => entry.reason === "budget")
  ) {
    notes.push(
      `${String(deferred.length)} guide(s) were deferred to stay within the ${String(budgetLabel ?? budget)}-token budget; ask for them with describe`
    );
  }
  if (selected.length === 0 && capabilities.length > 0) {
    notes.push(
      "no guide fitted the budget — narrow the allowed capabilities or columns, or raise tokenBudget"
    );
  }

  return {
    capabilities: capabilities.map(
      (entry) => withGuides.get(entry.key) ?? entry
    ),
    selected,
    deferred,
    notes,
  };
}

/** This selection's identity: the contract plus how it was selected. */
export function selectionVersion(
  contractVersion: string,
  profile: AgentContextProfile,
  selected: readonly string[],
  options: AgentContextOptions
): string {
  return JSON.stringify({
    contractVersion,
    profile,
    selected,
    tokenBudget: options.tokenBudget,
    priority: options.priority,
    include: options.include,
  });
}

/**
 * Raised when a budget cannot be met however much is deferred.
 *
 * Only for a budget the caller chose. The default compact budget degrades with
 * a note instead: a table is not broken because it is wide, and refusing to
 * build a context for one would take the assistant away entirely.
 *
 * @public
 */
export class ContextBudgetError extends Error {
  /** The budget that could not be met, in estimated tokens. */
  readonly budget: number;
  /** What the contract costs with everything deferrable already deferred. */
  readonly floor: number;

  constructor(budget: number, floor: number) {
    super(
      `a ${String(budget)}-token budget cannot be met: this table's contract ` +
        `costs ${String(floor)} tokens with every guide and column description ` +
        `already deferred. Raise tokenBudget above ${String(floor)}, or narrow ` +
        `the table with include/exclude before building the context.`
    );
    this.name = "ContextBudgetError";
    this.budget = budget;
    this.floor = floor;
  }
}

/**
 * How much a column is worth keeping described upfront.
 *
 * Lower sorts earlier and is deferred last. A column on screen is the one a
 * reader is most likely to mean; one the agent may write is the one a mistake
 * costs most; the rest are ordered as the table declared them, so the same
 * table always defers the same columns.
 */
function columnRank(column: ContextColumn): number {
  if (column.visible !== false) return 0;
  if (column.writable) return 1;
  return 2;
}

/**
 * Fit the described columns into what is left of the budget.
 *
 * Descriptions are dropped from the least useful end until the contract fits,
 * and every dropped id is returned. Nothing is truncated in place: a column is
 * described in full or named as deferred, because a half-described column is
 * how a model learns a wrong type.
 *
 * @param columns - Every permitted column, in the table's own order.
 * @param fits - Whether a given set of columns brings the contract inside
 *   the budget. Called with progressively smaller sets.
 * @returns The columns to describe, and the ids of those left out.
 *
 * @public
 */
export function fitColumns(
  columns: readonly ContextColumn[],
  fits: (kept: readonly ContextColumn[]) => boolean
): { kept: readonly ContextColumn[]; deferred: readonly string[] } {
  if (fits(columns)) return { kept: columns, deferred: [] };
  // Defer from the back of the ranking forward, one at a time, so the result
  // is the largest prefix that fits rather than an arbitrary subset.
  const order = [...columns].sort((a, b) => columnRank(a) - columnRank(b));
  for (let keep = order.length - 1; keep >= 0; keep -= 1) {
    const kept = order.slice(0, keep);
    if (fits(kept)) {
      const ids = new Set(kept.map((column) => column.id));
      return {
        // Back into the table's own order: a model reading the contract should
        // see the columns as the table declares them, not as they were ranked.
        kept: columns.filter((column) => ids.has(column.id)),
        deferred: columns
          .filter((column) => !ids.has(column.id))
          .map((column) => column.id),
      };
    }
  }
  return { kept: [], deferred: columns.map((column) => column.id) };
}

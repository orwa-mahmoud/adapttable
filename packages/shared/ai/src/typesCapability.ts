/**
 * What a capability is: its plan, staging, kind, definition, context, catalog
 * entry and guide.
 */
import type { ActionAiOptions } from "@adapttable/core";

import type { CapabilityPresentation } from "./assistantContracts";
import type { CommitPolicy } from "./keys";
import {
  type ApprovalResult,
  type ApprovalSubject,
  type WriteProposal,
} from "./typesExecute";
import { type JsonSchema } from "./typesManifest";
import { type AgentApply, type AgentObservation } from "./typesTable";

/**
 * Side-effect-free description of what a governed write would do.
 *
 * The session resolves a plan first, shows it to approval, revalidates the
 * table, and only then runs the capability's `execute`.
 *
 * @public
 */
export interface CapabilityPlan {
  /** Per-row before/after the approver sees. */
  readonly proposals: readonly WriteProposal[];
  /** Opaque handback — the session returns it on {@link AgentCapabilityContext.plan}. */
  readonly payload?: unknown;
  /**
   * Whether a reader may decide each proposal on its own.
   *
   * True only when the proposals stand alone AND `payload` is an array
   * aligned with them index for index, because that is what lets the session
   * drop a refused row from the payload before the handler sees it. A row
   * move is the counter-example: two proposals describe one indivisible
   * change, so it stays all-or-nothing. Defaults to false — a plan that has
   * not thought about it is never split.
   */
  readonly perItem?: boolean;
}

/**
 * Whether a capability can honour `commit: "stage"`.
 *
 * `"unsupported"` is the default for custom writes: a stage-mode table
 * rejects the call before the handler runs rather than committing it.
 *
 * @public
 */
export type CapabilityStaging = "supported" | "unsupported";

/**
 * Whether a capability's handler applies exactly the plan it is given.
 *
 * Partial approval narrows `plan.proposals` and `plan.payload` to the rows a
 * reader agreed to — but `execute` still receives the ORIGINAL arguments,
 * because they are what the model asked for and rewriting them would be a
 * lie about the request. A handler that works from those arguments rather
 * than from the narrowed plan would therefore apply rows nobody approved.
 *
 * The session cannot inspect arbitrary host code to find out which kind of
 * handler it has, so a capability says so. `"unsupported"` is the default:
 * an undeclared capability is offered to the reader whole, and a row-by-row
 * answer for it is refused rather than quietly widened to "approve all".
 *
 * @public
 */
export type CapabilityPartial = "supported" | "unsupported";

/**
 * What a capability belongs with, for one-round discovery.
 *
 * Declared on the definition, so a custom capability names its own related
 * guidance without a second registry knowing it exists.
 *
 * @public
 */
export interface CapabilityFamily {
  /** Family name a request may ask for by itself. */
  readonly family?: string;
  /**
   * Keys this one is not usable without.
   *
   * Not "related reading": a dependency is guidance the model needs to form a
   * correct call. Addressing rules for a write, grouping rules for an
   * aggregate.
   */
  readonly dependsOn?: readonly string[];
}

/**
 * What running a capability does to the table.
 *
 * A tool surface reads this to decide how much ceremony a call needs — a
 * read-only annotation, a confirmation, a warning — so the answer lives with
 * the capability rather than in a list beside it that can disagree.
 *
 * @public
 */
export type AgentCapabilityKind = "read" | "view" | "write" | "destructive";

/**
 * Governed capability extension registered on one table session.
 *
 * @public
 */
export interface AgentCapabilityDefinition {
  /** Stable capability key. Use a namespace prefix for custom keys. */
  readonly key: string;
  /** One-line English summary for catalog(). */
  readonly summary: string;
  /** Describe guide without schemaVersion — the session adds it. */
  readonly guide: Omit<CapabilityGuide, "schemaVersion" | "key"> & {
    readonly guide: string;
    readonly input: JsonSchema;
    readonly output: JsonSchema;
  };
  /** Effect class used for approval defaults on custom writes. */
  readonly kind?: AgentCapabilityKind;
  /**
   * What this capability belongs with, for one-round discovery.
   *
   * A custom capability declares its own related guidance here rather than a
   * second registry doing it elsewhere. `dependsOn` is not "related reading":
   * it is guidance the model cannot form a correct call without.
   */
  readonly discovery?: CapabilityFamily;
  /**
   * Optional labels and suggestions for a reader-facing assistant.
   *
   * Purely additive: the key, the guide and the schemas are unchanged by it,
   * and a host that ships none behaves exactly as before.
   */
  readonly presentation?: CapabilityPresentation;
  /**
   * Whether `commit: "stage"` is honoured. Defaults to `"unsupported"` for
   * `write` and `destructive` kinds — the session rejects a staged call with
   * `commit-incompatible` before `execute` runs.
   */
  readonly staging?: CapabilityStaging;
  /**
   * Whether `execute` applies `plan.payload` rather than its own arguments,
   * and may therefore be offered for row-by-row approval. Defaults to
   * `"unsupported"`. See {@link CapabilityPartial}.
   */
  readonly partial?: CapabilityPartial;
  /**
   * Whether running this twice leaves the table where running it once did.
   *
   * The distinction is assignment against accumulation: setting the page,
   * the sort or a cell value lands on the same state however many times it
   * runs, while adding rows or starting an export produces something new
   * every time. Session replay makes a *repeated key* a no-op regardless;
   * this is about the operation itself, which is what a host deciding
   * whether a retry is safe needs to know. Defaults to false for `write` and
   * `destructive` kinds and true for the rest.
   */
  readonly idempotent?: boolean;
  /**
   * Agent-invocation overrides for this capability, inheriting field by
   * field from the table's shared assistant configuration. The same shape an
   * ordinary row or bulk action carries. See `ActionAiOptions`.
   */
  readonly ai?: ActionAiOptions;
  /** Whether this capability is wired for the current observation. */
  isEnabled(observation: AgentObservation): boolean;
  /**
   * Resolve the proposal for a `write` or `destructive` capability without
   * touching host data. Omit and the session proposes the validated
   * arguments themselves.
   */
  plan?(
    context: AgentCapabilityContext,
    args: unknown
  ): Promise<CapabilityPlan> | CapabilityPlan;
  /**
   * Apply the capability. For a governed write this runs only after the
   * session has enforced write policy, commit mode and approval, and has
   * revalidated the revision.
   *
   * **`args` is what the model asked for, not what the reader agreed to.**
   * The session never rewrites it — the request is a record of the request.
   * When a reader approves part of a bulk write, the narrowing appears in
   * `context.plan`: both its `proposals` and its `payload` describe exactly
   * the approved rows, in plan order. A handler that reads `args` instead
   * would apply rows that were refused, which is why declaring
   * {@link AgentCapabilityDefinition.partial} `"supported"` is the promise
   * that this one reads `plan.payload`. Undeclared capabilities are never
   * offered for a row-by-row decision, so their `args` and `plan` always
   * agree.
   */
  execute(context: AgentCapabilityContext, args: unknown): unknown;
}

/**
 * How far a capability has got, while it is still going.
 *
 * For work a reader would otherwise watch an unexplained spinner through: a
 * thousand rows written one call at a time says nothing until it is over. It
 * is never a result — the capability's receipt still reports what happened —
 * and reporting it costs nothing beyond the call itself.
 *
 * @public
 */
export interface CapabilityProgress {
  /** How many units are finished. */
  readonly done: number;
  /** How many there are, when the capability knows. */
  readonly total?: number;
  /**
   * What is being worked through, in the host's own words.
   *
   * Shown as given: this package has no translation for a host's nouns, and
   * inventing one would be worse than leaving it out. Omit it and the
   * conversation says how far along the work is without naming it.
   */
  readonly label?: string;
}

/**
 * Execution context passed to built-in and custom capability handlers.
 *
 * @public
 */
export interface AgentCapabilityContext {
  readonly observation: AgentObservation;
  readonly apply: AgentApply;
  /** Wait for this call's earlier controlled view requests before reading or applying again. */
  readonly whenApplied?: () => Promise<void>;
  readonly observe: () => AgentObservation;
  readonly onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /**
   * The approved plan, on the `execute` call of a governed write. Absent
   * during `plan` itself and for read/view capabilities.
   *
   * Its `proposals` and array `payload` are already narrowed to what the
   * reader approved, so a handler that reads them applies the right rows
   * without knowing an approval happened.
   */
  readonly plan?: CapabilityPlan;
  /**
   * Positions in the ORIGINAL plan the reader approved, when they decided a
   * bulk write row by row. Absent when the whole write was approved.
   *
   * Informational. `plan` is already narrowed, and the session only offers a
   * row-by-row decision to a capability that declared
   * `partial: "supported"` — which is a promise that `execute` applies
   * `plan.payload`. This is here for a handler that wants to report which
   * positions ran, not as the thing standing between a refused row and the
   * host.
   */
  readonly approvedIndexes?: readonly number[];
  /** Commit mode the session resolved for this call. */
  readonly commit?: CommitPolicy;
  /**
   * The caller's cancellation, when one was passed to `execute`. Pass it to
   * anything that accepts a signal — a fetch, a nested request — so work that
   * has started can stop.
   */
  readonly signal?: AbortSignal;
  /**
   * Throws `cancelled` when the request has been aborted.
   *
   * The session calls this at every seam it owns: before the handler runs,
   * after planning, after approval, and before each row of a bulk write. Call
   * it yourself between the steps of a multi-step handler, immediately BEFORE
   * each side effect — a callback the host has already been given cannot be
   * taken back, and this makes no claim to undo one.
   */
  readonly throwIfCancelled: () => void;
  /**
   * Say how far this call has got.
   *
   * For a handler whose work is long enough that a reader would otherwise be
   * watching nothing. Call it as often as the work advances; the surface
   * coalesces. It reports and nothing else: it never stands in for the
   * capability's result, a call that reports progress and then fails has
   * failed, and the receipt is still read from what the handler returns.
   *
   * Absent when the session was built with nowhere to send it, so a handler
   * calls it optionally and works the same either way.
   */
  readonly reportProgress?: (progress: CapabilityProgress) => void;
}

/**
 * Catalog row — key plus a short English summary.
 *
 * @public
 */
export interface CatalogEntry {
  /** The summary in one sentence, sized for a surface with a hard cap. */
  readonly summaryShort?: string;
  /**
   * What this capability does to the table.
   *
   * The definition's own answer, published so a surface deciding how much
   * ceremony a call needs reads it rather than keeping a second list that can
   * disagree.
   */
  readonly kind?: AgentCapabilityKind;
  /**
   * Whether running it twice lands where running it once did.
   *
   * Published for the same reason as `kind`: a tool surface that advertises
   * retry safety should read the capability's own answer rather than keep a
   * list beside it.
   */
  readonly idempotent?: boolean;
  /** Capability key. */
  readonly key: string;
  /** One-line English summary. */
  readonly summary: string;
}

/**
 * Lazy capability contract.
 *
 * @public
 */
export interface CapabilityGuide {
  /**
   * The guide in one sentence, at most 150 characters.
   *
   * Derived from {@link CapabilityGuide.guide}, never authored beside it: a
   * surface with a hard description cap gets a short form that cannot describe
   * what the capability used to do.
   */
  readonly short?: string;
  /** Capability this guide describes. */
  readonly key: string;
  /** Schema family the guide belongs to. */
  readonly schemaVersion: string;
  /** English instructions for a model or host. */
  readonly guide: string;
  /** JSON Schema for `execute` arguments. */
  readonly input: JsonSchema;
  /** JSON Schema for a successful result. */
  readonly output: JsonSchema;
}

import type { ActionAiOptions } from "@adapttable/core";

import { guideOf, summaryOf } from "../guides";
import {
  AGENT_SCHEMA_VERSION,
  CAPABILITY_KEYS,
  type CapabilityKey,
} from "../keys";
import type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentObservation,
  CapabilityGuide,
  CapabilityPlan,
} from "../types";
import { isBuiltInEnabled } from "./enabled";

type BuiltInDispatch = (
  key: CapabilityKey,
  context: AgentCapabilityContext,
  args: unknown
) => Promise<unknown>;

type BuiltInPlanner = (
  key: CapabilityKey,
  context: AgentCapabilityContext,
  args: unknown
) => Promise<CapabilityPlan>;

/** Built-in plan and apply halves, supplied by the session. */
export interface BuiltInHandlers {
  readonly plan: BuiltInPlanner;
  readonly execute: BuiltInDispatch;
}

/** Resolved registry for one session. */
export interface CapabilityRegistry {
  has(key: string): boolean;
  get(key: string): AgentCapabilityDefinition | undefined;
  catalogOrder(): readonly string[];
  enabledKeys(observation: AgentObservation): readonly string[];
  describe(key: string): CapabilityGuide;
  /**
   * Whether the agent may use this key at all.
   *
   * Wiring and exclusion in one answer, resolved once and asked everywhere a
   * key could leak — the catalog, a guide, a tool adapter, and execution
   * itself, including after an awaited boundary. A chip hidden in a panel is
   * not enforcement; this is.
   */
  permits(key: string, observation: AgentObservation): boolean;
  /** Keys the host excluded, for reporting why something is unavailable. */
  excluded(): ReadonlySet<string>;
}

class SessionCapabilityRegistry implements CapabilityRegistry {
  private readonly definitions: Map<string, AgentCapabilityDefinition>;
  private readonly excludedKeys: ReadonlySet<string>;

  constructor(
    definitions: Map<string, AgentCapabilityDefinition>,
    excluded: ReadonlySet<string>
  ) {
    this.definitions = definitions;
    this.excludedKeys = excluded;
  }

  permits(key: string, observation: AgentObservation): boolean {
    if (this.excludedKeys.has(key)) return false;
    const def = this.definitions.get(key);
    return def?.isEnabled(observation) ?? false;
  }

  excluded(): ReadonlySet<string> {
    return this.excludedKeys;
  }

  has(key: string): boolean {
    return this.definitions.has(key);
  }

  get(key: string): AgentCapabilityDefinition | undefined {
    return this.definitions.get(key);
  }

  catalogOrder(): readonly string[] {
    return [...this.definitions.keys()];
  }

  enabledKeys(observation: AgentObservation): readonly string[] {
    const keys: string[] = [];
    for (const key of this.catalogOrder()) {
      if (this.permits(key, observation)) keys.push(key);
    }
    return keys;
  }

  describe(key: string): CapabilityGuide {
    const def = this.definitions.get(key);
    if (!def) throw new Error(`unknown capability "${key}"`);
    return {
      schemaVersion: AGENT_SCHEMA_VERSION,
      key: def.key,
      guide: def.guide.guide,
      // Derived from the guide it already has, never written a second time:
      // two hand-written descriptions of one capability drift, and the short
      // one is the copy a browser tool cap would show.
      short: shortForm(def.guide.guide),
      input: def.guide.input,
      output: def.guide.output,
    };
  }
}

/**
 * Register built-ins and custom capabilities for one session.
 *
 * `exclude` is the host's own denial list. It never enables anything — a key
 * the table does not wire stays unavailable whatever the list says — and it
 * applies to custom definitions as well as built-ins, because "the agent may
 * not do this" is not a question about who authored the capability.
 */
export function createCapabilityRegistry(
  custom: readonly AgentCapabilityDefinition[],
  builtIn: BuiltInHandlers,
  exclude: readonly string[] = [],
  approvals: Readonly<Record<string, ActionAiOptions>> = {}
): CapabilityRegistry {
  const definitions = new Map<string, AgentCapabilityDefinition>();
  for (const key of CAPABILITY_KEYS) {
    const guide = guideOf(key);
    const kind = capabilityKind(key);
    const governed = kind === "write" || kind === "destructive";
    definitions.set(key, {
      key,
      summary: summaryOf(key),
      guide: {
        guide: guide.guide,
        input: guide.input,
        output: guide.output,
      },
      kind,
      // edit.cells is the only built-in with a staging path (stageCells).
      staging: key === "edit.cells" ? "supported" : "unsupported",
      // These three apply plan.payload row by row, so a reader may decide
      // them one at a time. A row move reads its own two keys and is one
      // indivisible change; every other built-in writes nothing.
      partial:
        key === "edit.cells" || key === "rows.add" || key === "rows.delete"
          ? "supported"
          : "unsupported",
      idempotent: isIdempotent(key),
      // The table's own word on this one capability, carried exactly as a row
      // action's is. `resolveApproval` lets it replace the shared policy in
      // either direction — that is the point of authoring one — and holds the
      // one line that does not move: an action marked `required` drops
      // `alwaysAllow`, so a reader's "don't ask again" cannot answer for it.
      ...(approvals[key] ? { ai: approvals[key] } : {}),
      isEnabled: (observation) => isBuiltInEnabled(key, observation),
      plan: governed
        ? (context, args) => builtIn.plan(key, context, args)
        : undefined,
      execute: (context, args) => builtIn.execute(key, context, args),
    });
  }
  for (const def of custom) {
    if (definitions.has(def.key)) {
      throw new Error(`duplicate capability "${def.key}"`);
    }
    definitions.set(def.key, def);
  }
  return new SessionCapabilityRegistry(definitions, new Set(exclude));
}

/** Longest description a tool surface with a hard cap will still show. */
const SHORT_LIMIT = 150;

/**
 * The first sentence, or the first {@link SHORT_LIMIT} characters of it.
 *
 * Derived rather than authored. A capability whose guide changes cannot end up
 * with a short form describing what it used to do.
 */
export function shortForm(guide: string): string {
  const sentence = /^.*?[.!?](?=\s|$)/.exec(guide.trim())?.[0] ?? guide.trim();
  if (sentence.length <= SHORT_LIMIT) return sentence;
  const clipped = sentence.slice(0, SHORT_LIMIT - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped}…`;
}

/**
 * Whether running a built-in twice lands where running it once did.
 *
 * Assignment against accumulation, and nothing else: every setter names an
 * absolute state, so repeating it changes nothing, and that holds for a cell
 * value and a deleted row key as much as for a page number. The two that
 * accumulate are the two that produce something new each time — `rows.add`
 * appends another row, and `export.run` emits another file.
 */
function isIdempotent(key: CapabilityKey): boolean {
  return key !== "rows.add" && key !== "export.run";
}

function capabilityKind(key: CapabilityKey): AgentCapabilityDefinition["kind"] {
  if (key === "rows.delete") return "destructive";
  if (key === "edit.cells" || key === "rows.add" || key === "rows.reorder") {
    return "write";
  }
  if (key === "rows.read" || key === "columns.describe") return "read";
  return "view";
}

/** Build a reversible OpenAI function-name map and detect dot/underscore collisions. @public */
export function openAiToolNameMap(
  keys: readonly string[]
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const key of keys) {
    const encoded = key.replaceAll(".", "_");
    const existing = map.get(encoded);
    if (existing !== undefined && existing !== key) {
      throw new Error(
        `OpenAI tool name collision: "${existing}" and "${key}" both encode to "${encoded}"`
      );
    }
    map.set(encoded, key);
  }
  return map;
}

import { type ActionAiOptions, stableKey } from "@adapttable/core";

import { TABLE_COMMANDS } from "../commands";
import {
  type CommandCall,
  runCommand,
  type SessionGuard,
  type TableCommand,
} from "../commands/command";
import { AGENT_SCHEMA_VERSION } from "../keys";
import type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentObservation,
  CapabilityGuide,
} from "../types";

export { openAiToolNameMap } from "./toolNames";

/**
 * One registered command: the definition the session runs, and the built-in
 * command behind it when there is one. A host's own capability registers as
 * a definition with no built-in, and runs through the same loop.
 */
export interface RegisteredCommand {
  readonly definition: AgentCapabilityDefinition;
  readonly builtIn?: TableCommand;
}

/** Resolved registry for one session. */
export interface CapabilityRegistry {
  has(key: string): boolean;
  get(key: string): AgentCapabilityDefinition | undefined;
  /** The built-in command behind a key, or `undefined` for a host's own. */
  builtIn(key: string): TableCommand | undefined;
  catalogOrder(): readonly string[];
  enabledKeys(observation: AgentObservation): readonly string[];
  /** The definitions behind {@link CapabilityRegistry.enabledKeys}, in the same order. */
  enabled(observation: AgentObservation): readonly AgentCapabilityDefinition[];
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
  private readonly commands: Map<string, RegisteredCommand>;
  private readonly excludedKeys: ReadonlySet<string>;

  constructor(
    commands: Map<string, RegisteredCommand>,
    excluded: ReadonlySet<string>
  ) {
    this.commands = commands;
    this.excludedKeys = excluded;
  }

  permits(key: string, observation: AgentObservation): boolean {
    if (this.excludedKeys.has(key)) return false;
    const def = this.commands.get(key)?.definition;
    return def?.isEnabled(observation) ?? false;
  }

  excluded(): ReadonlySet<string> {
    return this.excludedKeys;
  }

  has(key: string): boolean {
    return this.commands.has(key);
  }

  get(key: string): AgentCapabilityDefinition | undefined {
    return this.commands.get(key)?.definition;
  }

  builtIn(key: string): TableCommand | undefined {
    return this.commands.get(key)?.builtIn;
  }

  catalogOrder(): readonly string[] {
    return [...this.commands.keys()];
  }

  enabledKeys(observation: AgentObservation): readonly string[] {
    return this.enabled(observation).map((definition) => definition.key);
  }

  enabled(observation: AgentObservation): readonly AgentCapabilityDefinition[] {
    const definitions: AgentCapabilityDefinition[] = [];
    for (const [key, { definition }] of this.commands) {
      if (this.permits(key, observation)) definitions.push(definition);
    }
    return definitions;
  }

  describe(key: string): CapabilityGuide {
    const def = this.commands.get(key)?.definition;
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

const referenceIds = new WeakMap<object, number>();
let nextReferenceId = 0;

function referenceId(reference: object | undefined): number | undefined {
  if (!reference) return undefined;
  const existing = referenceIds.get(reference);
  if (existing !== undefined) return existing;
  nextReferenceId += 1;
  referenceIds.set(reference, nextReferenceId);
  return nextReferenceId;
}

function callbackId(
  definition: AgentCapabilityDefinition,
  key: "isEnabled" | "plan" | "execute"
): number | undefined {
  // Inspect identity only; never detach and invoke a receiver-bound method.
  const callback: unknown = Reflect.get(definition, key);
  return typeof callback === "function" ? referenceId(callback) : undefined;
}

/**
 * A captured custom definition's contract and callbacks, without depending on
 * the identity of an inline array or a copy of the same definition.
 *
 * Unlike table actions, custom execution is captured by the registry rather
 * than looked up when it runs. Replacing a callback therefore changes this
 * contract too. Shared by registry refresh and old-session admission.
 *
 * @internal
 */
export function capabilityDefinitionStamp(
  definition: AgentCapabilityDefinition
): string {
  const prototype: unknown = Object.getPrototypeOf(definition);
  // Prototype methods share identity across instances, but their private
  // receiver state does not. Plain definition copies remain interchangeable.
  const receiver =
    prototype === Object.prototype || prototype === null
      ? undefined
      : definition;
  return stableKey([
    referenceId(receiver),
    definition.key,
    definition.summary,
    definition.guide,
    definition.kind,
    definition.discovery,
    definition.presentation,
    definition.staging,
    definition.partial,
    definition.idempotent,
    definition.ai,
    callbackId(definition, "isEnabled"),
    callbackId(definition, "plan"),
    callbackId(definition, "execute"),
  ]);
}

/**
 * The definition the session runs for a built-in command.
 *
 * `approval` is the table's own word on this one command, carried exactly as
 * a row action's is. `resolveApproval` lets it replace the shared policy in
 * either direction — that is the point of authoring one — and holds the one
 * line that does not move: an action marked `required` drops `alwaysAllow`,
 * so a reader's "don't ask again" cannot answer for it.
 */
function builtInDefinition(
  command: TableCommand,
  guard: SessionGuard,
  approval: ActionAiOptions | undefined
): AgentCapabilityDefinition {
  const call = (
    context: AgentCapabilityContext,
    args: unknown
  ): CommandCall => ({
    context,
    body: args as Record<string, unknown>,
    guard,
  });
  const { preview } = command;
  return {
    key: command.key,
    summary: command.summary,
    guide: {
      guide: command.guide,
      input: command.input,
      output: command.output,
    },
    kind: command.kind,
    staging: command.staging,
    partial: command.partial,
    idempotent: command.idempotent,
    ...(approval ? { ai: approval } : {}),
    isEnabled: command.isEnabled,
    plan: preview ? (context, args) => preview(call(context, args)) : undefined,
    execute: (context, args) => runCommand(command, call(context, args)),
  };
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
  guard: SessionGuard,
  exclude: readonly string[] = [],
  approvals: Readonly<Record<string, ActionAiOptions>> = {}
): CapabilityRegistry {
  const commands = new Map<string, RegisteredCommand>();
  for (const builtIn of TABLE_COMMANDS) {
    commands.set(builtIn.key, {
      definition: builtInDefinition(builtIn, guard, approvals[builtIn.key]),
      builtIn,
    });
  }
  for (const definition of custom) {
    if (commands.has(definition.key)) {
      throw new Error(`duplicate capability "${definition.key}"`);
    }
    commands.set(definition.key, { definition });
  }
  return new SessionCapabilityRegistry(commands, new Set(exclude));
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

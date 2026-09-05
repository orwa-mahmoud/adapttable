import {
  AGENT_SCHEMA_VERSION,
  CAPABILITY_KEYS,
  type CapabilityKey,
} from "../keys";
import { guideOf, summaryOf } from "../guides";
import type {
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentObservation,
  CapabilityGuide,
} from "../types";
import { isBuiltInEnabled } from "./enabled";

type BuiltInDispatch = (
  key: CapabilityKey,
  context: AgentCapabilityContext,
  args: unknown
) => Promise<unknown>;

/** Resolved registry for one session. */
export interface CapabilityRegistry {
  has(key: string): boolean;
  get(key: string): AgentCapabilityDefinition | undefined;
  catalogOrder(): readonly string[];
  enabledKeys(observation: AgentObservation): readonly string[];
  describe(key: string): CapabilityGuide;
}

class SessionCapabilityRegistry implements CapabilityRegistry {
  private readonly definitions: Map<string, AgentCapabilityDefinition>;

  constructor(definitions: Map<string, AgentCapabilityDefinition>) {
    this.definitions = definitions;
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
      const def = this.definitions.get(key);
      if (def?.isEnabled(observation)) keys.push(key);
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
      input: def.guide.input,
      output: def.guide.output,
    };
  }
}

/** Register built-ins and custom capabilities for one session. */
export function createCapabilityRegistry(
  custom: readonly AgentCapabilityDefinition[],
  dispatchBuiltIn: BuiltInDispatch
): CapabilityRegistry {
  const definitions = new Map<string, AgentCapabilityDefinition>();
  for (const key of CAPABILITY_KEYS) {
    const guide = guideOf(key);
    definitions.set(key, {
      key,
      summary: summaryOf(key),
      guide: {
        guide: guide.guide,
        input: guide.input,
        output: guide.output,
      },
      kind: capabilityKind(key),
      isEnabled: (observation) => isBuiltInEnabled(key, observation),
      execute: (context, args) => dispatchBuiltIn(key, context, args),
    });
  }
  for (const def of custom) {
    if (definitions.has(def.key)) {
      throw new Error(`duplicate capability "${def.key}"`);
    }
    definitions.set(def.key, def);
  }
  return new SessionCapabilityRegistry(definitions);
}

function capabilityKind(key: CapabilityKey): AgentCapabilityDefinition["kind"] {
  if (key === "rows.delete") return "destructive";
  if (key === "edit.cells" || key === "rows.add" || key === "rows.reorder") {
    return "write";
  }
  if (key === "rows.read" || key === "columns.describe") return "read";
  return "view";
}

/** Build a reversible OpenAI function-name map and detect dot/underscore collisions. */
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

/**
 * Validate: whether a call may start, and whether it may go on after each
 * awaited boundary.
 */
import type { CapabilityRegistry } from "../capabilities/registry";
import { ApplyError, type SessionGuard } from "../commands/command";
import type { LiveApplyCoordinator } from "../controlledApply";
import type { AgentCapabilityDefinition, AgentObservation } from "../types";
import { validateSchema } from "../validate";
import type { CreateAgentSessionOptions } from "./options";
import type { ReplayStore } from "./replay";

/** What every stage of the loop reads: the session and what it holds. */
export interface LoopState {
  readonly options: CreateAgentSessionOptions;
  readonly registry: CapabilityRegistry;
  readonly guard: SessionGuard;
  readonly replay: ReplayStore;
  readonly coordinator: LiveApplyCoordinator | undefined;
}

/** The refusal a call that cannot start reports. */
export interface Refusal {
  readonly code: string;
  readonly message: string;
}

/** A call admitted against one observation. */
export interface Admitted {
  readonly definition: AgentCapabilityDefinition;
  readonly observation: AgentObservation;
}

/**
 * Re-check the table after an awaited boundary. A revision move, a
 * capability that stopped being wired, or a withdrawn write permission all
 * deny the call rather than letting it proceed on the entry snapshot.
 */
export function revalidate(
  state: LoopState,
  key: string,
  entry: AgentObservation,
  governed: boolean
): AgentObservation {
  const latest = state.options.observe();
  if (latest.viewRevision !== entry.viewRevision) {
    throw new ApplyError(
      "revision-mismatch",
      `expected revision ${entry.viewRevision}, table is at ${latest.viewRevision}`
    );
  }
  if (!state.guard.isEnabled(key, latest)) {
    throw new ApplyError(
      "not-wired",
      `capability "${key}" is not wired on this table`
    );
  }
  if (governed && latest.writePolicy !== "allow") {
    throw new ApplyError(
      "write-denied",
      `writes are not permitted on this table`
    );
  }
  return latest;
}

/** Resolve the capability, or the reason the call cannot start. */
export function preflight(
  state: LoopState,
  key: string,
  args: unknown,
  expectedRevision: number
): Admitted | Refusal {
  const definition = state.registry.get(key);
  if (!definition) {
    return {
      code: "unknown-capability",
      message: `unknown capability "${key}"`,
    };
  }
  const observation = state.options.observe();
  if (!state.registry.enabledKeys(observation).includes(key)) {
    return {
      code: "not-wired",
      message: `capability "${key}" is not wired on this table`,
    };
  }
  if (expectedRevision !== observation.viewRevision) {
    return {
      code: "revision-mismatch",
      message: `expected revision ${expectedRevision}, table is at ${observation.viewRevision}`,
    };
  }
  const invalid = validateSchema(definition.guide.input, args ?? {});
  if (invalid) return { code: "invalid-arguments", message: invalid };
  return { definition, observation };
}

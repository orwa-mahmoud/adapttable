/**
 * The default system prompt — the two halves, joined.
 *
 * A convenience and nothing more. `agentInstructions` and `renderAgentContext`
 * are the real pieces; this puts them in one string for a backend that wants
 * one call, and a backend with its own prompt uses neither.
 *
 * It composes rather than restates: there is no sentence here that is not in
 * one of the two halves, so a rule cannot be changed in one place and left in
 * the other.
 */
import type { AgentContext } from "./context";
import {
  agentInstructions,
  type AgentInstructionsInput,
  renderAgentContext,
} from "./contextPrompt";

/**
 * Inputs the default system prompt needs.
 *
 * @public
 */
export interface AgentSystemPromptInput extends AgentInstructionsInput {
  /** The permitted context, from `buildAgentContext`. */
  readonly context: AgentContext;
}

/**
 * General rules, then this table.
 *
 * @param input - The context, plus optional locale and host rules.
 * @returns One system string.
 *
 * @public
 */
export function agentSystemPrompt(input: AgentSystemPromptInput): string {
  return [
    agentInstructions({
      ...(input.locale ? { locale: input.locale } : {}),
      ...(input.instructions ? { instructions: input.instructions } : {}),
    }),
    "",
    renderAgentContext(input.context),
  ].join("\n");
}

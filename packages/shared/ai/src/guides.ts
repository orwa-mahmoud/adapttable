import { tableCommand } from "./commands";
import type { TableCommand } from "./commands/command";
import { AGENT_SCHEMA_VERSION, type CapabilityKey } from "./keys";
import type { CapabilityGuide } from "./types";

function commandOf(key: CapabilityKey): TableCommand {
  const command = tableCommand(key);
  if (!command) throw new Error(`unknown capability "${key}"`);
  return command;
}

/**
 * One-line English summary for a capability key.
 *
 * @public
 */
export function summaryOf(key: CapabilityKey): string {
  return commandOf(key).summary;
}

/**
 * Full describe() guide for a capability key, including input/output schemas.
 *
 * @public
 */
export function guideOf(key: CapabilityKey): CapabilityGuide {
  const command = commandOf(key);
  return {
    schemaVersion: AGENT_SCHEMA_VERSION,
    key: command.key,
    guide: command.guide,
    input: command.input,
    output: command.output,
  };
}

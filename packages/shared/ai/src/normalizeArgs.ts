/**
 * Accept the argument names models actually emit before schema validation.
 *
 * Each command reads its own near misses (`commands/*`); what is left here is
 * the one repair that follows from a schema's shape rather than a command's
 * vocabulary, so a host's own capability gets it too.
 */
import { tableCommand } from "./commands";
import type { JsonSchema } from "./types";

/**
 * The single batch property a capability takes, when it takes exactly one.
 *
 * `edit.cells` requires only `edits`, `rows.add` only `rows`. That shape is
 * what makes the repair below readable off the schema instead of off a list
 * of capability names — a host's own batch capability gets it too.
 */
function batchProperty(
  input: JsonSchema | undefined
): { readonly name: string; readonly items: JsonSchema } | undefined {
  const [name, ...rest] = input?.required ?? [];
  if (name === undefined || rest.length > 0) return undefined;
  const property = input?.properties?.[name];
  if (property?.type !== "array") return undefined;
  return { name, items: property.items ?? {} };
}

/**
 * Accept one item where a capability takes a batch of them.
 *
 * A reader asks for one cell to change, so the model sends one cell:
 * `{rowKey, column, value}` rather than `{edits: [{rowKey, column, value}]}`.
 * Both repairs here are the only reading that document has — a lone value
 * where an array is required is that array's one element, and a body built
 * entirely out of the item's own property names is one item. Anything else is
 * left for validation to name.
 */
function normalizeBatchArgs(
  record: Record<string, unknown>,
  input: JsonSchema | undefined
): Record<string, unknown> {
  const batch = batchProperty(input);
  if (!batch) return record;
  const present = record[batch.name];
  if (present !== undefined) {
    if (!Array.isArray(present)) record[batch.name] = [present];
    return record;
  }
  const itemProperties = Object.keys(batch.items.properties ?? {});
  const given = Object.keys(record);
  if (
    given.length > 0 &&
    itemProperties.length > 0 &&
    given.every((name) => itemProperties.includes(name))
  ) {
    return { [batch.name]: [record] };
  }
  return record;
}

/**
 * Rewrite a capability argument bag into the schema the table published.
 *
 * @param key - The capability being called.
 * @param args - What the backend sent as its arguments.
 * @param input - That capability's own input schema, when the caller has it.
 *
 * Unknown keys and non-objects are left alone so validation still names them.
 */
export function normalizeCapabilityArgs(
  key: string,
  args: unknown,
  input?: JsonSchema
): unknown {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return args ?? {};
  }
  const record = { ...(args as Record<string, unknown>) };
  const named = tableCommand(key)?.normalize?.(record) ?? record;
  return normalizeBatchArgs(named, input);
}

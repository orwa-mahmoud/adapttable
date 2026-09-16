/**
 * Input schemas built from what this table actually publishes.
 *
 * A capability's authored schema describes the shape; only the live table
 * knows the values. `view.setFilters` takes an object — but *which* keys, and
 * which values each accepts, is the filter catalog's answer and changes per
 * table, per reader, per render.
 *
 * Carrying that in prose and leaving the schema open asks a model to read a
 * sentence and then construct a free-form object correctly. A closed set
 * belongs in `enum`, which is the mechanism a tool-calling model is built to
 * respect: a value that was never on offer stops being something to refuse
 * politely and becomes something the caller cannot express.
 *
 * Nothing here narrows what the session will accept. The session resolves and
 * refuses exactly as before; this only stops a caller having to guess.
 */
import type {
  AgentAggregationColumn,
  AgentColumn,
  AgentFilter,
  JsonSchema,
} from "./types";

const DRAFT = "https://json-schema.org/draft/2020-12/schema";

/**
 * What one filter's own value key accepts.
 *
 * A multi-select takes one value or a list of them, so the closed set travels
 * on the item schema — the shape a caller sending either can satisfy.
 */
function valueSchema(filter: AgentFilter): JsonSchema {
  const options = filter.options;
  if (!options || options.length === 0) return {};
  const values = options.map((option) => option.value);
  return {
    type: ["string", "array"],
    items: { type: "string", enum: values },
  };
}

/**
 * The `filters` argument for the live catalog.
 *
 * Every extra-bag key the catalog publishes becomes a property; a filter with
 * a published option list gets those values as an `enum`, and an operator key
 * gets that filter's operators. A catalog with no options for a filter leaves
 * that property open, because an open property is the truth there.
 */
export function filterBagSchema(
  catalog: readonly AgentFilter[] | undefined
): JsonSchema | undefined {
  if (catalog === undefined || catalog.length === 0) return undefined;
  const properties: Record<string, JsonSchema> = {};
  for (const filter of catalog) {
    for (const key of filter.valueKeys) {
      if (key === filter.key) {
        properties[key] = valueSchema(filter);
        continue;
      }
      if (key === `${filter.key}Op`) {
        properties[key] = { type: "string", enum: filter.operators };
        continue;
      }
      properties[key] = {};
    }
  }
  return {
    type: "object",
    // Open on purpose: a host's own filter shape may carry keys the catalog
    // does not enumerate, and refusing those here would deny a call the
    // session would have accepted.
    additionalProperties: true,
    properties,
  };
}

/** The column ids this table will accept for one kind of use. */
export function columnIds(
  columns: readonly AgentColumn[],
  usable: (column: AgentColumn) => boolean
): readonly string[] {
  return columns.filter(usable).map((column) => column.id);
}

/**
 * Replace one property of an authored schema, keeping everything else.
 *
 * Absent ids leave the schema alone: a table that published no columns has
 * said nothing about which are usable, and an empty `enum` would say the
 * opposite — that none are.
 */
export function withEnum(
  schema: JsonSchema | undefined,
  property: string,
  values: readonly (string | number)[],
  nullable = false
): JsonSchema | undefined {
  if (!schema || values.length === 0) return schema;
  const existing = schema.properties?.[property] ?? {};
  return {
    ...schema,
    properties: {
      ...schema.properties,
      [property]: {
        ...existing,
        enum: nullable ? [...values, null] : values,
      },
    },
  };
}

/**
 * The `set` argument for the columns this table will actually aggregate.
 *
 * Each property is one column; its `enum` is the operation ids that column
 * takes. A free-form string is how a caller writes "average" when the table
 * takes `avg`.
 */
export function aggregationSetSchema(
  columns: readonly AgentAggregationColumn[] | undefined
): JsonSchema | undefined {
  if (columns === undefined || columns.length === 0) return undefined;
  const properties: Record<string, JsonSchema> = {};
  for (const column of columns) {
    const ids = column.operations.map((operation) => operation.id);
    if (ids.length === 0) continue;
    properties[column.id] = { type: "string", enum: ids };
  }
  if (Object.keys(properties).length === 0) return undefined;
  return {
    type: "object",
    additionalProperties: false,
    properties,
  };
}

/** The `set` and `remove` properties, specialised for this table. */
export function withAggregationBag(
  schema: JsonSchema | undefined,
  columns: readonly AgentAggregationColumn[] | undefined
): JsonSchema | undefined {
  const bag = aggregationSetSchema(columns);
  if (!schema || !bag) return schema;
  const ids = columns?.map((column) => column.id) ?? [];
  const remove =
    ids.length > 0
      ? {
          ...schema.properties?.remove,
          type: "array" as const,
          items: { type: "string", enum: ids },
        }
      : schema.properties?.remove;
  return {
    $schema: schema.$schema ?? DRAFT,
    ...schema,
    properties: {
      ...schema.properties,
      set: bag,
      ...(remove ? { remove } : {}),
    },
  };
}

/** The `filters` property, specialised for this table. */
export function withFilterBag(
  schema: JsonSchema | undefined,
  catalog: readonly AgentFilter[] | undefined
): JsonSchema | undefined {
  const bag = filterBagSchema(catalog);
  if (!schema || !bag) return schema;
  return {
    $schema: schema.$schema ?? DRAFT,
    ...schema,
    properties: { ...schema.properties, filters: bag },
  };
}

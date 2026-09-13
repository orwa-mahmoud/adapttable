import type { JsonSchema } from "./types";

function typeList(schema: JsonSchema): readonly string[] {
  const declared = schema.type;
  if (!declared) return [];
  return typeof declared === "string" ? [declared] : [...declared];
}

function checkNumber(schema: JsonSchema, value: number, path: string) {
  if (schema.minimum !== undefined && value < schema.minimum) {
    return `${path} must be >= ${schema.minimum}`;
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    return `${path} must be <= ${schema.maximum}`;
  }
  return undefined;
}

function checkArray(schema: JsonSchema, value: unknown[], path: string) {
  if (!schema.items) return undefined;
  for (let i = 0; i < value.length; i++) {
    const nested = validateSchema(schema.items, value[i], `${path}[${i}]`);
    if (nested) return nested;
  }
  return undefined;
}

function missingRequired(
  schema: JsonSchema,
  value: Record<string, unknown>,
  path: string
) {
  for (const key of schema.required ?? []) {
    if (key in value) continue;
    // Name the values it takes when the schema names them. "side is required"
    // sends a backend back to a guide it may not have; "one of top, bottom"
    // lets it answer from the refusal itself.
    // Only the scalars: an enum may hold objects, and `[object Object]` in a
    // refusal is worse than saying nothing about the values at all.
    const choices = (schema.properties?.[key]?.enum ?? []).filter(
      (entry): entry is string | number | boolean =>
        typeof entry === "string" ||
        typeof entry === "number" ||
        typeof entry === "boolean"
    );
    return choices.length > 0
      ? `${path}.${key} is required — one of ${choices.map(String).join(", ")}`
      : `${path}.${key} is required`;
  }
  return undefined;
}

function extraProperty(
  schema: JsonSchema,
  value: Record<string, unknown>,
  path: string
) {
  if (schema.additionalProperties !== false) return undefined;
  const allowed = new Set(Object.keys(schema.properties ?? {}));
  for (const key of Object.keys(value)) {
    // Name what it does take. A backend given only "not allowed" has to guess
    // again or spend a round on `describe`, and under a compact context — where
    // this capability's guide was deferred by design — guessing is exactly what
    // it did to get here.
    if (!allowed.has(key)) {
      const names = [...allowed];
      return names.length > 0
        ? `${path}.${key} is not allowed; this takes ${names.join(", ")}`
        : `${path}.${key} is not allowed; this takes no arguments`;
    }
  }
  return undefined;
}

function checkObject(
  schema: JsonSchema,
  value: Record<string, unknown>,
  path: string
) {
  const required = missingRequired(schema, value, path);
  if (required) return required;
  if (schema.properties) {
    for (const [key, child] of Object.entries(schema.properties)) {
      if (key in value) {
        const nested = validateSchema(child, value[key], `${path}.${key}`);
        if (nested) return nested;
      }
    }
  }
  return extraProperty(schema, value, path);
}

/**
 * Validate `value` against a small JSON Schema subset.
 *
 * The describe() schemas stay inside this subset so execute() does not
 * need a third-party validator.
 *
 * @public
 */
export function validateSchema(
  schema: JsonSchema,
  value: unknown,
  path = "$"
): string | undefined {
  if (schema.const !== undefined && value !== schema.const) {
    return `${path} must be ${JSON.stringify(schema.const)}`;
  }
  if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
    return `${path} must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}`;
  }
  const types = typeList(schema);
  if (types.length && !types.some((type) => matchesType(type, value))) {
    return `${path} must be ${types.join(" | ")}`;
  }
  if (typeof value === "number") return checkNumber(schema, value, path);
  if (typeof value === "string" && schema.minLength !== undefined) {
    if (value.length < schema.minLength) {
      return `${path} must be at least ${schema.minLength} characters`;
    }
  }
  if (Array.isArray(value)) return checkArray(schema, value, path);
  if (value && typeof value === "object") {
    return checkObject(schema, value as Record<string, unknown>, path);
  }
  return undefined;
}

function matchesType(type: string, value: unknown): boolean {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  if (type === "integer") {
    return typeof value === "number" && Number.isInteger(value);
  }
  return typeof value === type;
}

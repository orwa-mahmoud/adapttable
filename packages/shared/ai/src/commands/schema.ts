/** Schema pieces more than one command publishes. */
import type { JsonSchema } from "../types";

const DRAFT = "https://json-schema.org/draft/2020-12/schema";

/** A closed object schema. */
export function objectSchema(
  properties: Record<string, JsonSchema>,
  required: readonly string[] = []
): JsonSchema {
  return {
    $schema: DRAFT,
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const REVISION: JsonSchema = { type: "integer", minimum: 1 };

/** A view change that names nothing but its new revision. */
export const OK_OUTPUT = objectSchema({
  ok: { type: "boolean", const: true },
  revision: REVISION,
});

/** A view change that also names what landed. */
export function okWith(properties: Record<string, JsonSchema>): JsonSchema {
  return objectSchema({
    ok: { type: "boolean", const: true },
    revision: REVISION,
    ...properties,
  });
}

/** A list of strings. */
export const STRING_LIST: JsonSchema = {
  type: "array",
  items: { type: "string" },
};

/** What every governed write returns. */
export const WRITE_RESULT = objectSchema({
  proposals: {
    type: "array",
    items: objectSchema({
      rowKey: { type: "string" },
      column: { type: "string" },
      before: {},
      after: {},
    }),
  },
  applied: { type: "boolean" },
  approval: {
    type: "string",
    enum: [
      "pending",
      "approved",
      "partial",
      "rejected",
      "cancelled",
      "not-required",
    ],
  },
  approvalReason: { type: "string" },
  results: {
    type: "array",
    items: objectSchema({
      rowKey: { type: "string" },
      column: { type: "string" },
      ok: { type: "boolean" },
      error: objectSchema({
        code: { type: "string" },
        message: { type: "string" },
      }),
    }),
  },
});

/** The scopes a row position is read in. */
export const SCOPE: JsonSchema = {
  type: "string",
  enum: ["visible", "page", "full"],
};

/** A non-empty string. */
export const ID: JsonSchema = { type: "string", minLength: 1 };

/** A list of non-empty strings. */
export const ID_LIST: JsonSchema = { type: "array", items: ID };

/** A row addressed by stable key, or by 1-based position in a scope. */
export const ROW_REF_PROPERTIES: Record<string, JsonSchema> = {
  rowKey: ID,
  position: { type: "integer", minimum: 1 },
  scope: SCOPE,
};

/** A row reference that carries the revision its position was read at. */
export const ROW_KEY_OR_POSITION = objectSchema({
  ...ROW_REF_PROPERTIES,
  expectedRevision: REVISION,
});

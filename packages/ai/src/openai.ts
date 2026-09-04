import { errorMessage } from "./errorMessage";
import { CAPABILITY_KEYS, type CapabilityKey } from "./keys";
import type { AgentSession, ExecuteResult, JsonSchema } from "./types";

export {
  type ApprovalPolicy,
  CAPABILITY_KEYS,
  type CapabilityKey,
  type CommitPolicy,
  type RowAddressScope,
  type WritePolicy,
} from "./keys";
export type * from "./types";

/**
 * Function payload inside an OpenAI tool definition.
 *
 * @public
 */
export interface OpenAIFunctionDefinition {
  /** Capability key, or a portable trio name. */
  readonly name: string;
  /** English tool description. */
  readonly description: string;
  /** JSON Schema for the tool arguments. */
  readonly parameters: JsonSchema;
  /** When true, the model must honour `additionalProperties: false`. */
  readonly strict?: boolean;
}

/**
 * Chat Completions function-tool shape. No `openai` package dependency.
 *
 * @public
 */
export interface OpenAIFunctionTool {
  /** Always `"function"`. */
  readonly type: "function";
  /** Named function the model may call. */
  readonly function: OpenAIFunctionDefinition;
}

/**
 * Options for {@link toOpenAITools}.
 *
 * @public
 */
export interface OpenAIToolsOptions {
  /** Default true. Sets `additionalProperties: false` when unset on the schema. */
  readonly strict?: boolean;
  /** Return only catalog / describe / execute. */
  readonly deferred?: boolean;
}

/**
 * Function payload inside an OpenAI tool call.
 *
 * @public
 */
export interface OpenAIToolCallFunction {
  /** Capability key, or a portable trio name. */
  readonly name: string;
  /** JSON string from the model, or an already-parsed value. */
  readonly arguments: unknown;
}

/**
 * OpenAI tool-call payload. `function.arguments` is a JSON string from the
 * model or an already-parsed value.
 *
 * @public
 */
export interface OpenAIToolCall {
  /** Provider-assigned call id, when present. */
  readonly id?: string;
  /** Function the model invoked. */
  readonly function: OpenAIToolCallFunction;
}

const PORTABLE_TRIO: readonly {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
}[] = [
  {
    name: "catalog",
    description:
      "List enabled capability keys and one-line summaries in catalog order.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "describe",
    description:
      "Return the guide and input/output JSON Schema for one capability key.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: { key: { type: "string", minLength: 1 } },
      required: ["key"],
    },
  },
  {
    name: "execute",
    description:
      "Run one capability. Host supplies expectedRevision and idempotencyKey.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        key: { type: "string", minLength: 1 },
        args: { type: "object", additionalProperties: true },
      },
      required: ["key", "args"],
    },
  },
];

const FROM_OPENAI_TOOL_NAME = new Map<string, CapabilityKey>(
  CAPABILITY_KEYS.map((key) => [key.replaceAll(".", "_"), key])
);

/**
 * OpenAI function names may only use `[a-zA-Z0-9_-]`. Catalog keys keep
 * their dots; eager tools replace each `.` with `_`.
 *
 * @public
 */
export function toOpenAIToolName(key: string): string {
  return key.replaceAll(".", "_");
}

/**
 * Map an OpenAI function name back to a catalog key. Dotted names and
 * the portable trio pass through unchanged.
 *
 * @public
 */
export function fromOpenAIToolName(name: string): string {
  return FROM_OPENAI_TOOL_NAME.get(name) ?? name;
}

function withStrictParameters(schema: JsonSchema, strict: boolean): JsonSchema {
  if (!strict || schema.additionalProperties !== undefined) return schema;
  return { ...schema, additionalProperties: false };
}

function asTool(
  name: string,
  description: string,
  parameters: JsonSchema,
  strict: boolean
): OpenAIFunctionTool {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: withStrictParameters(parameters, strict),
      ...(strict ? { strict: true } : {}),
    },
  };
}

/**
 * Map the session onto OpenAI function tools.
 *
 * `strict` (default true) sets `additionalProperties: false` when the
 * described schema does not already declare it. `deferred` returns only
 * the portable catalog / describe / execute trio — `describe` is how the
 * runtime learns the rest.
 *
 * @public
 */
export function toOpenAITools(
  session: AgentSession,
  options?: OpenAIToolsOptions
): readonly OpenAIFunctionTool[] {
  const strict = options?.strict !== false;
  if (options?.deferred) {
    return PORTABLE_TRIO.map((tool) =>
      asTool(tool.name, tool.description, tool.parameters, strict)
    );
  }
  return session.catalog().map((entry) => {
    const guide = session.describe(entry.key);
    return asTool(
      toOpenAIToolName(entry.key),
      guide.guide,
      guide.input,
      strict
    );
  });
}

function parseArguments(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value.trim() === "") return {};
  return JSON.parse(value) as unknown;
}

function fail(
  session: AgentSession,
  idempotencyKey: string,
  code: string,
  message: string
): ExecuteResult {
  return {
    ok: false,
    revision: session.manifest().viewRevision,
    idempotencyKey,
    error: { code, message },
  };
}

function ok(
  session: AgentSession,
  idempotencyKey: string,
  result: unknown
): ExecuteResult {
  return {
    ok: true,
    revision: session.manifest().viewRevision,
    idempotencyKey,
    result,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readKey(args: unknown): string | undefined {
  const key = isRecord(args) ? args.key : undefined;
  return typeof key === "string" ? key : undefined;
}

function runDescribe(
  session: AgentSession,
  args: unknown,
  idempotencyKey: string
): ExecuteResult {
  const key = readKey(args);
  if (!key) {
    return fail(
      session,
      idempotencyKey,
      "invalid-arguments",
      "describe requires { key }"
    );
  }
  try {
    return ok(session, idempotencyKey, session.describe(key));
  } catch (error) {
    return fail(
      session,
      idempotencyKey,
      "describe-failed",
      errorMessage(error)
    );
  }
}

function runPortableExecute(
  session: AgentSession,
  args: unknown,
  expectedRevision: number,
  idempotencyKey: string
): Promise<ExecuteResult> {
  const key = readKey(args);
  if (!key) {
    return Promise.resolve(
      fail(
        session,
        idempotencyKey,
        "invalid-arguments",
        "execute requires { key }"
      )
    );
  }
  const body = isRecord(args) ? args : {};
  return session.execute(key, body.args, expectedRevision, idempotencyKey);
}

/**
 * Map an OpenAI tool call onto the session. Capability names go to
 * `session.execute`. The deferred trio (`catalog` / `describe` / `execute`)
 * calls those session methods. No second argument validator.
 *
 * @public
 */
export async function executeOpenAITool(
  session: AgentSession,
  call: OpenAIToolCall,
  expectedRevision: number,
  idempotencyKey: string
): Promise<ExecuteResult> {
  let args: unknown;
  try {
    args = parseArguments(call.function.arguments);
  } catch (error) {
    return fail(
      session,
      idempotencyKey,
      "invalid-arguments",
      errorMessage(error)
    );
  }

  const name = fromOpenAIToolName(call.function.name);
  if (name === "catalog") {
    return ok(session, idempotencyKey, session.catalog());
  }
  if (name === "describe") {
    return runDescribe(session, args, idempotencyKey);
  }
  if (name === "execute") {
    return runPortableExecute(session, args, expectedRevision, idempotencyKey);
  }

  return session.execute(name, args, expectedRevision, idempotencyKey);
}

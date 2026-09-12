/**
 * The table as AI SDK client tools — `@adapttable/ai/ai-sdk`.
 *
 * A team on the AI SDK already has a `streamText` route and a page reading its
 * UI message stream. This is what lets the table join that, with the route and
 * the provider they already chose: the enabled contract is declared in the
 * route's `tools` map **without an `execute`**, which is how the SDK says "the
 * client runs this one", and the parts that come back land in
 * `session.execute` here.
 *
 * No `ai` dependency is added. The part types below are this package's own,
 * pinned to the AI SDK 7 UI message stream.
 *
 * ## The mapping, part by part
 *
 * Nothing is inferred from both sides having tool calls.
 *
 * **Inbound — what a stream part does**
 *
 * | AI SDK part | Ours |
 * | --- | --- |
 * | `start` | begins a turn; its `messageId` labels the reply |
 * | `text-delta` (`delta`) | appended, reported through `onPartialText` |
 * | `tool-input-available` | `session.execute`, when `toolName` is ours |
 * | `tool-output-available` | the backend's own tool; recorded, never answered |
 * | `tool-approval-request` | an {@link ApprovalSubject} for the transaction |
 * | `data-*` | handed to the host; this adapter reads none of it |
 * | `error` | the turn fails with that message |
 * | `finish` | the turn settles |
 *
 * **Outbound — what the next request carries**
 *
 * | AI SDK | Ours |
 * | --- | --- |
 * | `tools[name]` (no `execute`) | `adapttable_<tableId>_<key>` |
 * | `inputSchema` | `session.describe(key).input` |
 * | tool output part | `{ toolCallId, output }`, as `addToolOutput` sends |
 * | approval response | `{ approvalId, approved, reason? }` |
 * | `data-adapttable-view` | the sanitized view, so "reverse that sort" has one |
 *
 * Three things are deliberate:
 *
 * - **A tool name is a name, not a path.** The SDK's tool keys are object
 *   keys and travel through provider schemas that are strict about what a
 *   function name may contain, so ours are underscore-separated rather than
 *   dotted. {@link aiSdkCapability} is the way back.
 * - **The replay identity is the stream's `toolCallId`.** A resumed or
 *   re-sent turn that repeats a call gets the first result back rather than
 *   writing twice.
 * - **An unknown stream version is refused.** A parser that guesses at a
 *   shape it does not know is how a silent misreading of somebody's data
 *   starts. Drift is expected; guessing is not.
 *
 * @packageDocumentation
 */
import type {
  AssistantTransport,
  AssistantTransportReply,
  AssistantUnresolved,
} from "./assistantContracts";
import {
  type AgentContextInputs,
  type AgentContextOptions,
  buildAgentContext,
} from "./context";
import type { AgentContextView } from "./contextSnapshot";
import type {
  AgentSession,
  ApprovalPresentation,
  ApprovalResult,
  ApprovalSubject,
  ExecuteResult,
  WriteProposal,
} from "./types";

/** The stream shape this adapter understands. @public */
export const AI_SDK_STREAM_VERSION = 2;

/** One client-tool definition for a route's `tools` map. @public */
export interface AiSdkTool {
  readonly description: string;
  /** JSON Schema for the call's arguments. */
  readonly inputSchema: unknown;
  /**
   * Never present.
   *
   * A client tool is one the route declares and does not run. Carrying the
   * field as `undefined` says so where a reader of the route will see it.
   */
  readonly execute?: undefined;
}

/**
 * One part of a UI message stream.
 *
 * Flat, for the reason the AG-UI adapter's event type is flat: hosts pass
 * these straight through from their transport, and a union of twenty
 * interfaces would make that a mapping exercise before the adapter sees the
 * part.
 *
 * @public
 */
export interface AiSdkPart {
  readonly type: string;
  readonly id?: string;
  readonly messageId?: string;
  readonly delta?: unknown;
  readonly toolCallId?: string;
  readonly toolName?: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly approvalId?: string;
  readonly errorText?: string;
  readonly [field: string]: unknown;
}

/** A tool result travelling back on the next request. @public */
export interface AiSdkToolOutput {
  readonly toolCallId: string;
  readonly output: unknown;
}

/** What the reader decided about one approval request. @public */
export interface AiSdkApprovalResponse {
  readonly approvalId: string;
  readonly approved: boolean;
  /** Why they refused, when they said. */
  readonly reason?: string;
}

/** What one request to the route carries. @public */
export interface AiSdkRequest {
  /** The reader's message. */
  readonly message: string;
  /** The conversation so far, oldest first. */
  readonly messages: readonly {
    readonly role: "user" | "assistant";
    readonly content: string;
  }[];
  /** Results for calls this client ran since the last request. */
  readonly toolOutputs?: readonly AiSdkToolOutput[];
  /** Answers to approvals the last stream asked for. */
  readonly approvals?: readonly AiSdkApprovalResponse[];
  /** The sanitized view, as a data part the route can forward. */
  readonly data?: { readonly "data-adapttable-view": AgentContextView };
}

/** The one seam a host fills. @public */
export interface AiSdkConnection {
  /**
   * Send one request and stream the parts back.
   *
   * Must honour `signal`. A turn that ended asking for a tool result or an
   * approval continues with a second call carrying it, never by reopening
   * this stream.
   */
  run(
    request: AiSdkRequest,
    signal?: AbortSignal
  ): AsyncIterable<AiSdkPart> | Promise<AsyncIterable<AiSdkPart>>;
  /** Release whatever the connection holds. */
  close?(): void;
}

/** How the adapter is configured. @public */
export interface AiSdkOptions {
  /** Where requests go. */
  readonly connection: AiSdkConnection;
  /**
   * Confirm a write the route stopped to ask about.
   *
   * The same seam `session.execute` uses, taking the same
   * {@link ApprovalSubject} the approval transaction consumes. Without it an
   * approval request stops the turn with `unresolved` rather than approving
   * itself.
   */
  readonly onApprove?: (
    subject: ApprovalSubject,
    signal?: AbortSignal
  ) => Promise<ApprovalResult>;
  /** Where a confirmation is reviewed, when the table has not said. */
  readonly presentation?: ApprovalPresentation;
  /** Context profile and budget for the view part. */
  readonly context?: AgentContextOptions;
  /** Live view and filter data, read once per request. */
  readonly contextInputs?: () => AgentContextInputs;
  /** Every part the adapter reads, for a host that wants the raw stream. */
  readonly onPart?: (part: AiSdkPart) => void;
  /** How many continuations one turn may take before it is a loop. */
  readonly maxRequests?: number;
}

/** A stream that did not behave like the AI SDK's. @public */
export class AiSdkProtocolError extends Error {
  /** Stable machine code. */
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AiSdkProtocolError";
    this.code = code;
  }
}

/**
 * Refuse a stream that names a version this adapter does not speak.
 *
 * Drift between an SDK and an adapter is expected. Guessing at it is not: a
 * stream that declares a version we do not know is refused with a code a host
 * can act on, rather than parsed as though it were the one we do.
 *
 * @param version - What the stream said, when it said anything.
 * @throws {@link AiSdkProtocolError} for any other version.
 *
 * @public
 */
export function assertAiSdkVersion(version: unknown): void {
  if (version === undefined || version === AI_SDK_STREAM_VERSION) return;
  throw new AiSdkProtocolError(
    "unknown-stream-version",
    `this adapter speaks AI SDK UI message stream v${String(AI_SDK_STREAM_VERSION)}, not v${String(version)}`
  );
}

/** Continuations one turn may take before the adapter calls it a loop. */
const DEFAULT_MAX_REQUESTS = 8;

/** Characters a provider will accept in a function name. */
const SAFE = /[^a-zA-Z0-9_-]/g;

/**
 * The tool name this table publishes for a capability.
 *
 * Underscores rather than dots: these are object keys in a route's `tools`
 * map and travel through provider schemas that constrain a function name.
 *
 * @param tableId - The table's identity.
 * @param key - The capability key.
 * @returns A name safe to declare and to receive.
 *
 * @public
 */
export function aiSdkToolName(tableId: string, key: string): string {
  return `adapttable_${tableId.replace(SAFE, "_")}_${key.replace(SAFE, "_")}`;
}

/**
 * The capability one of our tool names refers to, or nothing.
 *
 * Resolved against the live catalog rather than by reversing the encoding:
 * a dot and an underscore both encode to an underscore, so the round trip is
 * not a function and guessing it would call the wrong capability.
 *
 * @param session - The live session.
 * @param name - The name the stream used.
 * @returns The capability key, when this table owns that name.
 *
 * @public
 */
export function aiSdkCapability(
  session: AgentSession,
  name: string
): string | undefined {
  const tableId = session.manifest().tableId;
  return session
    .catalog()
    .find((entry) => aiSdkToolName(tableId, entry.key) === name)?.key;
}

/**
 * The enabled contract as client tools for a route's `tools` map.
 *
 * Spread the result in. Every entry omits `execute`, which is how the AI SDK
 * knows the client runs it.
 *
 * @param session - The live session. Only permitted keys reach the map.
 * @returns Tool definitions, keyed by the name the stream will use.
 *
 * @public
 */
export function aiSdkTools(
  session: AgentSession
): Readonly<Record<string, AiSdkTool>> {
  const tableId = session.manifest().tableId;
  const tools: Record<string, AiSdkTool> = {};
  for (const entry of session.catalog()) {
    tools[aiSdkToolName(tableId, entry.key)] = {
      description: entry.summaryShort ?? entry.summary,
      inputSchema: session.describe(entry.key).input,
    };
  }
  return tools;
}

/** The replay identity for one AI SDK tool call. */
function callKey(tableId: string, toolCallId: string): string {
  return `ai-sdk:${JSON.stringify({ tableId, toolCallId })}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The rows an approval request enumerated, kept only where addressable. */
function proposalsOf(input: unknown): readonly WriteProposal[] | undefined {
  if (!isRecord(input)) return undefined;
  const proposals = input.proposals;
  if (!Array.isArray(proposals)) return undefined;
  const rows = proposals.flatMap((entry): WriteProposal[] => {
    if (!isRecord(entry) || typeof entry.rowKey !== "string") return [];
    return [
      {
        rowKey: entry.rowKey,
        ...(typeof entry.column === "string" ? { column: entry.column } : {}),
        ...("before" in entry ? { before: entry.before } : {}),
        ...("after" in entry ? { after: entry.after } : {}),
      },
    ];
  });
  return rows.length > 0 ? rows : undefined;
}

/**
 * What the reader is being asked to confirm.
 *
 * The session's own two shapes, decided from the request rather than from a
 * flag, so an approver never guesses from a runtime type what it was handed.
 */
function approvalSubject(
  part: AiSdkPart,
  session: AgentSession,
  presentation: ApprovalPresentation
): ApprovalSubject {
  const input = isRecord(part.input) ? part.input : {};
  const proposals = proposalsOf(input);
  if (proposals) {
    return {
      kind: "rows",
      proposals,
      perItem: input.perItem === true,
      presentation,
    };
  }
  const capability =
    typeof part.toolName === "string"
      ? aiSdkCapability(session, part.toolName)
      : undefined;
  if (capability === undefined) {
    throw new AiSdkProtocolError(
      "malformed-approval",
      "an approval request needs proposals or one of this table's tool names"
    );
  }
  return {
    kind: "operation",
    capability,
    arguments: input,
    presentation,
  };
}

function unresolvedTurn(
  code: string,
  message: string,
  pending: readonly string[]
): AssistantUnresolved {
  return { code, message, pending: [...pending] };
}

/** What a refused call leaves the turn with. */
function deniedTurn(
  denied: readonly { capability: string; reason?: string }[]
): AssistantUnresolved {
  const reason = denied.find((entry) => entry.reason)?.reason;
  return {
    code: "output-denied",
    message: reason ?? "the change was refused and nothing was applied",
    pending: denied.map((entry) => entry.capability),
  };
}

/** Per-turn state the request loop accumulates. */
interface TurnState {
  readonly results: ExecuteResult[];
  readonly keys: string[];
  readonly outputs: AiSdkToolOutput[];
  readonly approvals: AiSdkApprovalResponse[];
  /** Calls the route reported as refused, and why. */
  readonly denied: { capability: string; reason?: string }[];
  text: string;
}

/** What one stream produced. */
interface StreamOutcome {
  readonly finished: boolean;
  /** Whether anything came back that the next request has to carry. */
  readonly continues: boolean;
}

/**
 * The AI SDK route as an {@link AssistantTransport}.
 *
 * This adapter is the only thing that couples a conversation to the AI SDK. A
 * host writing its own transport implements the neutral interface from
 * `@adapttable/ai` and never pulls this — or the `ai` package — into its
 * graph.
 *
 * @param options - The run seam and the approval sink.
 * @returns A transport the assistant controller can take as-is.
 *
 * @public
 */
export function aiSdkTransport(options: AiSdkOptions): AssistantTransport {
  const maxRequests = Math.max(1, options.maxRequests ?? DEFAULT_MAX_REQUESTS);
  const presentation: ApprovalPresentation = options.presentation ?? "widget";

  const viewOf = (session: AgentSession): AgentContextView =>
    buildAgentContext(session, options.context, options.contextInputs?.()).view;

  const execute = async (
    session: AgentSession,
    turn: TurnState,
    part: AiSdkPart,
    key: string,
    signal?: AbortSignal
  ): Promise<void> => {
    const toolCallId = part.toolCallId;
    if (typeof toolCallId !== "string") {
      throw new AiSdkProtocolError(
        "malformed-part",
        "tool-input-available needs a toolCallId"
      );
    }
    const manifest = session.manifest();
    // Read now: a call is judged against the table as it is, not as the
    // request described it.
    const result = await session.execute(
      key,
      part.input ?? {},
      manifest.viewRevision,
      callKey(manifest.tableId, toolCallId),
      signal
    );
    turn.results.push(result);
    turn.keys.push(key);
    // Exactly what `addToolOutput` sends, so a route reads it the way it
    // reads any other client tool's result.
    turn.outputs.push({
      toolCallId,
      output: result.ok
        ? { ok: true, revision: result.revision, result: result.result }
        : { ok: false, revision: result.revision, error: result.error },
    });
  };

  const settle = async (
    session: AgentSession,
    turn: TurnState,
    part: AiSdkPart,
    signal?: AbortSignal
  ): Promise<AssistantUnresolved | undefined> => {
    const approvalId = part.approvalId;
    if (typeof approvalId !== "string") {
      throw new AiSdkProtocolError(
        "malformed-part",
        "tool-approval-request needs an approvalId"
      );
    }
    if (!options.onApprove) {
      return unresolvedTurn(
        "approval-unavailable",
        "the route asked for confirmation and nothing here can ask the reader",
        typeof part.toolName === "string"
          ? [aiSdkCapability(session, part.toolName) ?? part.toolName]
          : []
      );
    }
    const decided = await options.onApprove(
      approvalSubject(part, session, presentation),
      signal
    );
    const approved =
      decided === true ||
      (typeof decided === "object" && decided.approved.length > 0);
    const reason = typeof decided === "object" ? decided.reason : undefined;
    turn.approvals.push({
      approvalId,
      approved,
      ...(reason === undefined ? {} : { reason }),
    });
    return undefined;
  };

  /** Read one stream, running our calls as their inputs complete. */
  const consume = async (
    session: AgentSession,
    turn: TurnState,
    parts: AsyncIterable<AiSdkPart>,
    onPartialText?: (text: string) => void,
    signal?: AbortSignal
  ): Promise<StreamOutcome | AssistantUnresolved> => {
    let finished = false;
    let continues = false;

    for await (const part of parts) {
      if (signal?.aborted) {
        throw new AiSdkProtocolError("cancelled", "the turn was cancelled");
      }
      options.onPart?.(part);
      switch (part.type) {
        case "start": {
          // Checked here because this is where a stream says what it is. A
          // parser that guesses at a shape it does not know is how a silent
          // misreading of somebody's data starts.
          assertAiSdkVersion(part.version);
          break;
        }
        case "start-step":
        case "finish-step":
        case "text-start":
        case "text-end":
        case "tool-input-start":
        case "tool-input-delta":
          break;
        case "text-delta": {
          if (typeof part.delta !== "string") {
            throw new AiSdkProtocolError(
              "malformed-part",
              "text-delta needs a string delta"
            );
          }
          turn.text += part.delta;
          onPartialText?.(turn.text);
          break;
        }
        case "tool-input-available": {
          const name = part.toolName;
          if (typeof name !== "string") {
            throw new AiSdkProtocolError(
              "malformed-part",
              "tool-input-available needs a toolName"
            );
          }
          const key = aiSdkCapability(session, name);
          // Somebody else's client tool. Answering it would claim a result
          // for work this table never did.
          if (key === undefined) break;
          await execute(session, turn, part, key, signal);
          continues = true;
          break;
        }
        case "tool-output-available":
        case "tool-output-error":
          // The route's own tool, run on the route. Recorded through
          // `onPart`; the table claims nothing about it.
          break;
        case "tool-approval-request": {
          const stopped = await settle(session, turn, part, signal);
          if (stopped) return stopped;
          continues = true;
          break;
        }
        case "output-denied": {
          // The reader refused and the route is saying so. Nothing ran, which
          // is what `unresolved` is for — and the reason travels with it, so
          // the panel can say why rather than only that.
          const name = part.toolName;
          const reason =
            typeof part.errorText === "string" ? part.errorText : undefined;
          turn.denied.push({
            capability:
              (typeof name === "string"
                ? aiSdkCapability(session, name)
                : undefined) ?? (typeof name === "string" ? name : "unknown"),
            ...(reason === undefined ? {} : { reason }),
          });
          break;
        }
        case "error": {
          throw new AiSdkProtocolError(
            "stream-error",
            typeof part.errorText === "string"
              ? part.errorText
              : "the route failed without saying why"
          );
        }
        case "finish": {
          finished = true;
          break;
        }
        default: {
          // `data-*` and anything a newer SDK adds: forwarded through
          // `onPart` and otherwise left alone. An unknown part is not a
          // malformed one — but a part that is not even shaped like one is.
          if (typeof part.type !== "string" || part.type === "") {
            throw new AiSdkProtocolError(
              "unknown-stream-version",
              "a stream part arrived with no type; this adapter speaks the AI SDK UI message stream"
            );
          }
          break;
        }
      }
    }

    if (!finished) {
      throw new AiSdkProtocolError(
        "stream-incomplete",
        "the stream ended without a finish part"
      );
    }
    return { finished, continues };
  };

  return {
    disconnect: () => {
      options.connection.close?.();
    },
    send: async ({
      session,
      text,
      conversation,
      signal,
      onPartialText,
    }): Promise<AssistantTransportReply> => {
      const turn: TurnState = {
        results: [],
        keys: [],
        outputs: [],
        approvals: [],
        denied: [],
        text: "",
      };
      let unresolved: AssistantUnresolved | undefined;

      for (let attempt = 0; attempt < maxRequests; attempt += 1) {
        const request: AiSdkRequest = {
          message: text,
          messages: conversation.map((entry) => ({
            role: entry.role,
            content: entry.text,
          })),
          ...(turn.outputs.length > 0
            ? { toolOutputs: [...turn.outputs] }
            : {}),
          ...(turn.approvals.length > 0
            ? { approvals: [...turn.approvals] }
            : {}),
          data: { "data-adapttable-view": viewOf(session) },
        };
        // Carried once: a second request repeats only what is new.
        turn.outputs.length = 0;
        turn.approvals.length = 0;

        const parts = await options.connection.run(request, signal);
        const outcome = await consume(
          session,
          turn,
          parts,
          onPartialText,
          signal
        );
        if ("code" in outcome) {
          unresolved = outcome;
          break;
        }
        if (!outcome.continues) {
          return {
            text: turn.text,
            results: turn.results,
            keys: turn.keys,
            ...(turn.denied.length > 0
              ? { unresolved: deniedTurn(turn.denied) }
              : {}),
          };
        }
      }

      return {
        text: turn.text,
        results: turn.results,
        keys: turn.keys,
        unresolved:
          unresolved ??
          unresolvedTurn(
            "continuation-limit",
            `the turn asked to continue more than ${String(maxRequests)} times`,
            []
          ),
      };
    },
  };
}

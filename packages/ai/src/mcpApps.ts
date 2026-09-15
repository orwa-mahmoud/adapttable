/**
 * The table as an MCP App — `@adapttable/ai/mcp-apps`.
 *
 * An MCP App is a view an MCP host embeds beside the conversation: the host
 * serves an HTML resource, renders it in an iframe, tells it about tool calls
 * as they happen, and accepts `tools/call` requests back from it. This module
 * is both halves of that, minus the view itself — the descriptor a server
 * publishes, and the bridge the view speaks through.
 *
 * Three rules shape it:
 *
 * - **The view is a client, not a second authority.** Every reader action it
 *   offers goes out as `tools/call` and lands in `session.execute` on the
 *   server side. It cannot write to the table by any other route, and a write
 *   the policy says needs approval still needs it.
 * - **The channel is declared, and nothing else is reachable.** The CSP is
 *   built from `connectDomains` and `resourceDomains`; a view that has not
 *   been given a domain cannot reach it. No credential and no row data leaves
 *   the declared channel.
 * - **The host's origin is required, never assumed.** A handshake posted to
 *   `"*"` announces the table's contract to whatever happens to be listening.
 *   A view that was not told its host's origin refuses to start rather than
 *   broadcasting.
 *
 * Elicitation is an addition, not a replacement. When the host advertises it,
 * an approval or a question can be put through the host's own chrome; when it
 * does not, the session's `approval: "pending"` result stands and the table's
 * own approval chrome inside the iframe is what the reader answers.
 *
 * @packageDocumentation
 */
import type { AssistantAnswer, AssistantQuestion } from "./assistantContracts";
import type { McpTool, McpToolResult } from "./mcp";
import type { AgentSession, ApprovalResult, ApprovalSubject } from "./types";

/** The media type an MCP host recognises as an app view. @public */
export const MCP_APP_MIME = "text/html;profile=mcp-app";

/** How long a request to the host may wait before it is abandoned. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** The view resource for one table. @public */
export function mcpAppUri(tableId: string): string {
  return `ui://adapttable/table/${tableId}`;
}

/** Where a view may reach, and who may frame it. @public */
export interface McpAppSecurity {
  /** Origins the view may open connections to. Empty means none. */
  readonly connectDomains?: readonly string[];
  /** Origins the view may load images, fonts and styles from. */
  readonly resourceDomains?: readonly string[];
  /** Origins allowed to frame the view. Defaults to the host's own. */
  readonly frameAncestors?: readonly string[];
}

/**
 * The Content-Security-Policy a view is served under.
 *
 * Built from what the host declared and nothing else: `'self'` plus the named
 * domains. A view that needs an endpoint the host did not declare fails
 * visibly at the browser rather than reaching it quietly.
 *
 * @param security - The declared domains.
 * @returns A policy string for a header or a `<meta http-equiv>`.
 *
 * @public
 */
export function mcpAppCsp(security: McpAppSecurity = {}): string {
  const connect = ["'self'", ...(security.connectDomains ?? [])].join(" ");
  const resource = ["'self'", ...(security.resourceDomains ?? [])].join(" ");
  const ancestors = ["'self'", ...(security.frameAncestors ?? [])].join(" ");
  return [
    "default-src 'none'",
    `connect-src ${connect}`,
    `img-src ${resource} data:`,
    `font-src ${resource}`,
    `style-src ${resource} 'unsafe-inline'`,
    "script-src 'self'",
    `frame-ancestors ${ancestors}`,
    "form-action 'none'",
    "base-uri 'none'",
  ].join("; ");
}

/** How the view resource is published. @public */
export interface McpAppResourceOptions {
  /** The view's HTML, when the server ships the bundle itself. */
  readonly html?: string;
  /** Where the view is served from, when the host loads it by URL. */
  readonly src?: string;
  /** What the view may reach. */
  readonly security?: McpAppSecurity;
  /** The size the view would like, when the host can honour one. */
  readonly preferredSize?: {
    readonly width?: number;
    readonly height?: number;
  };
  /** What the view is, for a host that lists it. */
  readonly description?: string;
}

/** The view as a `resources/list` entry. @public */
export interface McpAppResource {
  /** `ui://adapttable/table/{tableId}`. */
  readonly uri: string;
  readonly name: string;
  readonly description: string;
  readonly mimeType: typeof MCP_APP_MIME;
  /** The view's HTML, when it was supplied. */
  readonly text?: string;
  /** Where to load it from, when it is served rather than inlined. */
  readonly uriTemplate?: string;
  readonly _meta: Readonly<Record<string, unknown>>;
}

/**
 * Publish the table's view as an MCP App resource.
 *
 * @param session - The live session, for the table's identity.
 * @param options - The bundle or its address, and the declared channel.
 * @returns The resource descriptor, with its CSP in `_meta`.
 * @throws When neither `html` nor `src` was supplied — a resource that names
 *   no view is a listing entry a host cannot render.
 *
 * @public
 */
export function mcpAppResource(
  session: AgentSession,
  options: McpAppResourceOptions
): McpAppResource {
  if (!options.html && !options.src) {
    throw new Error("an MCP App resource needs either html or src");
  }
  const manifest = session.manifest();
  return {
    uri: mcpAppUri(manifest.tableId),
    name: `${manifest.tableId} table`,
    description:
      options.description ??
      `The ${manifest.tableId} table, as a view this host can embed.`,
    mimeType: MCP_APP_MIME,
    ...(options.html ? { text: options.html } : {}),
    ...(options.src ? { uriTemplate: options.src } : {}),
    _meta: {
      "ui/csp": mcpAppCsp(options.security),
      ...(options.preferredSize
        ? { "ui/preferredSize": options.preferredSize }
        : {}),
    },
  };
}

/**
 * The `_meta.ui` a tool carries so its result renders in the view.
 *
 * @param session - The live session, for the table's identity.
 * @param options - The size the view would like, when there is one.
 * @returns A `_meta` fragment to merge onto a tool.
 *
 * @public
 */
export function mcpAppToolMeta(
  session: AgentSession,
  options: Pick<McpAppResourceOptions, "preferredSize"> = {}
): Readonly<Record<string, unknown>> {
  return {
    ui: {
      resourceUri: mcpAppUri(session.manifest().tableId),
      ...(options.preferredSize
        ? { preferredSize: options.preferredSize }
        : {}),
    },
  };
}

/**
 * The same tools, each pointed at the view.
 *
 * @param tools - What `toMcpTools` produced.
 * @param session - The live session, for the table's identity.
 * @param options - The size the view would like.
 * @returns The tools, with `_meta.ui` merged onto each.
 *
 * @public
 */
export function withMcpAppMeta(
  tools: readonly McpTool[],
  session: AgentSession,
  options: Pick<McpAppResourceOptions, "preferredSize"> = {}
): readonly McpTool[] {
  const meta = mcpAppToolMeta(session, options);
  return tools.map((tool) => ({
    ...tool,
    _meta: { ...tool._meta, ...meta },
  }));
}

/** What the host said it can do. @public */
export interface McpAppHostCapabilities {
  /** The host can put a structured question to the person for us. */
  readonly elicitation?: boolean;
  /** The host accepts `tools/call` from the view. */
  readonly tools?: boolean;
}

/** A tool call the host is about to make. @public */
export interface McpAppToolInput {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly input: unknown;
}

/** What a tool call produced. @public */
export interface McpAppToolOutcome {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly result: unknown;
}

/** One choice offered with an elicitation. @public */
export interface McpAppElicitOption {
  readonly id: string;
  readonly label: string;
}

/** A question for the person, put through the host's own chrome. @public */
export interface McpAppElicitRequest {
  readonly message: string;
  readonly options?: readonly McpAppElicitOption[];
  /** Whether a typed answer is accepted. */
  readonly allowFreeText?: boolean;
}

/** What the person said. @public */
export interface McpAppElicitResult {
  readonly action: "accept" | "decline" | "cancel";
  /** The chosen option id or the typed text, when they answered. */
  readonly content?: { readonly optionId?: string; readonly text?: string };
}

/** Where messages go and come from. Defaults to the embedding window. */
export interface McpAppChannel {
  readonly post: (message: unknown, targetOrigin: string) => void;
  readonly subscribe: (
    listener: (message: unknown, origin: string) => void
  ) => () => void;
}

/** How the view's side of the bridge is built. @public */
export interface McpAppBridgeOptions {
  /**
   * The host's origin.
   *
   * Required. Posting a handshake to `"*"` announces the table's contract to
   * whatever else is listening, and accepting a reply from any origin lets
   * anything drive the view.
   */
  readonly hostOrigin: string;
  /** Injected for tests. Defaults to `window.parent` and `window`. */
  readonly channel?: McpAppChannel;
  /** The host is about to run a tool. */
  readonly onToolInput?: (input: McpAppToolInput) => void;
  /** A tool the host ran has finished. */
  readonly onToolResult?: (outcome: McpAppToolOutcome) => void;
  /** A message that did not belong to any request in flight. */
  readonly onWarning?: (warning: { code: string; message: string }) => void;
  /** How long a request may wait. Defaults to thirty seconds. */
  readonly timeoutMs?: number;
}

/** The view's side of the conversation with its host. @public */
export interface McpAppBridge {
  /** Handshake. Resolves with what the host said it can do. */
  readonly initialize: () => Promise<McpAppHostCapabilities>;
  /** What the host advertised, once `initialize` has resolved. */
  readonly capabilities: () => McpAppHostCapabilities | undefined;
  /** Ask the host to run one tool. */
  readonly callTool: (name: string, args: unknown) => Promise<McpToolResult>;
  /**
   * Put a question to the person through the host.
   *
   * Resolves to `undefined` when the host never advertised elicitation, which
   * is the caller's signal to leave the decision where it already is rather
   * than invent an answer.
   */
  readonly elicit: (
    request: McpAppElicitRequest
  ) => Promise<McpAppElicitResult | undefined>;
  /** Stop listening and fail everything still in flight. */
  readonly dispose: () => void;
}

interface JsonRpcMessage {
  readonly jsonrpc?: unknown;
  readonly id?: unknown;
  readonly method?: unknown;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly code?: unknown; readonly message?: unknown };
}

function asMessage(value: unknown): JsonRpcMessage | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const message = value as JsonRpcMessage;
  return message.jsonrpc === "2.0" ? message : undefined;
}

function windowChannel(): McpAppChannel | undefined {
  const scope = globalThis as {
    parent?: { postMessage?: (message: unknown, origin: string) => void };
    addEventListener?: (
      type: string,
      listener: (event: { data?: unknown; origin?: string }) => void
    ) => void;
    removeEventListener?: (
      type: string,
      listener: (event: { data?: unknown; origin?: string }) => void
    ) => void;
  };
  const post = scope.parent?.postMessage;
  if (!post || !scope.addEventListener || !scope.removeEventListener) {
    return undefined;
  }
  return {
    post: (message, targetOrigin) => {
      post.call(scope.parent, message, targetOrigin);
    },
    subscribe: (listener) => {
      const handler = (event: { data?: unknown; origin?: string }): void => {
        listener(event.data, event.origin ?? "");
      };
      scope.addEventListener?.("message", handler);
      return () => scope.removeEventListener?.("message", handler);
    },
  };
}

/**
 * Build the view's side of the MCP App conversation.
 *
 * @param options - The host's origin, and the sinks for what it tells us.
 * @returns The bridge, or one that refuses everything when there is no window.
 * @throws When `hostOrigin` is missing or is the wildcard.
 *
 * @public
 */
export function createMcpAppBridge(options: McpAppBridgeOptions): McpAppBridge {
  if (!options.hostOrigin || options.hostOrigin === "*") {
    throw new Error(
      "an MCP App bridge needs the host's exact origin; \"*\" would broadcast the table's contract"
    );
  }
  const channel = options.channel ?? windowChannel();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (cause: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let advertised: McpAppHostCapabilities | undefined;
  let nextId = 0;
  let disposed = false;

  const settleAll = (cause: Error): void => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(cause);
    }
    pending.clear();
  };

  if (!channel) {
    // No window to talk through: the module still imports on a server, and a
    // caller gets a refusal rather than a bridge that silently never answers.
    return {
      initialize: () =>
        Promise.reject(new Error("no MCP App host channel is available")),
      capabilities: () => undefined,
      callTool: () =>
        Promise.reject(new Error("no MCP App host channel is available")),
      elicit: () => Promise.resolve(undefined),
      dispose: () => undefined,
    };
  }

  /** A notification the host sent, which nothing is waiting for. */
  const receiveNotification = (method: string, params: unknown): void => {
    if (method === "ui/notifications/tool-input") {
      const input = params as McpAppToolInput | undefined;
      if (input) options.onToolInput?.(input);
      return;
    }
    if (method === "ui/notifications/tool-result") {
      const outcome = params as McpAppToolOutcome | undefined;
      if (outcome) options.onToolResult?.(outcome);
      return;
    }
    options.onWarning?.({
      code: "unknown-method",
      message: `the host sent "${method}", which this view does not handle`,
    });
  };

  /** An answer to one request this view made. */
  const receiveResponse = (message: JsonRpcMessage, id: number): void => {
    const entry = pending.get(id);
    if (!entry) {
      options.onWarning?.({
        code: "unmatched-response",
        message: "a response arrived for a request that is not in flight",
      });
      return;
    }
    pending.delete(id);
    clearTimeout(entry.timer);
    if (!message.error) {
      entry.resolve(message.result);
      return;
    }
    entry.reject(
      new Error(
        typeof message.error.message === "string"
          ? message.error.message
          : "the host refused the request"
      )
    );
  };

  const unsubscribe = channel.subscribe((data, origin) => {
    // Anything from anywhere else is not the host, whatever it claims.
    if (origin !== options.hostOrigin) return;
    const message = asMessage(data);
    if (!message) return;
    if (typeof message.method === "string") {
      receiveNotification(message.method, message.params);
      return;
    }
    if (typeof message.id === "number") receiveResponse(message, message.id);
  });

  const request = (method: string, params: unknown): Promise<unknown> => {
    if (disposed) {
      return Promise.reject(new Error("this MCP App bridge is disposed"));
    }
    nextId += 1;
    const id = nextId;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`the host did not answer "${method}"`));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      channel.post({ jsonrpc: "2.0", id, method, params }, options.hostOrigin);
    });
  };

  return {
    initialize: async () => {
      const result = (await request("ui/initialize", {
        protocol: "mcp-app",
        capabilities: { tools: true },
      })) as { capabilities?: McpAppHostCapabilities } | undefined;
      advertised = result?.capabilities ?? {};
      return advertised;
    },
    capabilities: () => advertised,
    callTool: async (name, args) => {
      const result = await request("tools/call", {
        name,
        arguments: args ?? {},
      });
      return result as McpToolResult;
    },
    elicit: async (elicitation) => {
      // Not advertised is not the same as refused: the caller keeps whatever
      // decision path it already had, rather than being handed a "no".
      if (!advertised?.elicitation) return undefined;
      const result = await request("elicitation/create", {
        message: elicitation.message,
        ...(elicitation.options ? { options: elicitation.options } : {}),
        allowFreeText: elicitation.allowFreeText ?? false,
      });
      return result as McpAppElicitResult;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      settleAll(new Error("this MCP App bridge is disposed"));
    },
  };
}

/**
 * Put one approval to the person through the host, when it can ask.
 *
 * @param bridge - An initialized bridge.
 * @param subject - What the session wants confirmed.
 * @returns The decision, or `undefined` when the host cannot ask — in which
 *   case the session's `approval: "pending"` result stands and the table's own
 *   approval chrome inside the view is what the reader answers.
 *
 * @public
 */
export async function approveThroughHost(
  bridge: McpAppBridge,
  subject: ApprovalSubject
): Promise<ApprovalResult | undefined> {
  const answered = await bridge.elicit({
    message: approvalMessage(subject),
    options: [
      { id: "approve", label: "Approve" },
      { id: "reject", label: "Reject" },
    ],
  });
  if (!answered) return undefined;
  // Decline and cancel are both "this did not happen". Treating a dismissed
  // dialog as consent is the one reading that cannot be recovered from.
  return (
    answered.action === "accept" && answered.content?.optionId === "approve"
  );
}

/**
 * Put one question to the person through the host, when it can ask.
 *
 * @param bridge - An initialized bridge.
 * @param question - What the backend wants to know.
 * @returns The answer, or `undefined` when the host cannot ask or the person
 *   declined — in which case the turn reports the question as unanswered
 *   rather than proceeding on a value nobody gave.
 *
 * @public
 */
export async function askThroughHost(
  bridge: McpAppBridge,
  question: AssistantQuestion
): Promise<AssistantAnswer | undefined> {
  const answered = await bridge.elicit({
    message: question.question,
    ...(question.options ? { options: question.options } : {}),
    allowFreeText: question.allowFreeText,
  });
  if (answered?.action !== "accept") return undefined;
  const optionId = answered.content?.optionId;
  const text = answered.content?.text;
  if (optionId === undefined && text === undefined) return undefined;
  return {
    ...(optionId === undefined ? {} : { optionId }),
    ...(text === undefined ? {} : { text }),
  };
}

/** What the person is being asked, in one sentence. */
function approvalMessage(subject: ApprovalSubject): string {
  if (subject.kind === "operation") {
    return `Run ${subject.title ?? subject.capability} on this table?`;
  }
  const count = subject.proposals.length;
  return count === 1
    ? "Apply this change to the table?"
    : `Apply ${String(count)} changes to the table?`;
}

// A transport is handed a session and answers from its catalog, so the entry
// names the session, the context it sends, the approval it raises and the
// conversation shapes it speaks. A host writing its own connection needs
// every one of them to type its side.
export type {
  AssistantAnswer,
  AssistantExchange,
  AssistantQuestion,
  AssistantQuestionOption,
  AssistantResumeHandle,
  AssistantResumeInput,
  AssistantSendInput,
  AssistantSuggestion,
  AssistantTransport,
  AssistantTransportReply,
  AssistantTurnInput,
  AssistantUnresolved,
  CapabilityPresentation,
} from "./assistantContracts";
export type {
  AssistantReceiptSubject,
  AssistantReceiptTerm,
} from "./assistantReceipts";
export type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
export type {
  McpContent,
  McpTool,
  McpToolAnnotations,
  McpToolResult,
} from "./mcp";
export type {
  AgentAggregateOperation,
  AgentAggregationColumn,
  AgentAggregations,
  AgentAggregationsPatch,
  AgentApply,
  AgentCapabilityContext,
  AgentCapabilityDefinition,
  AgentCapabilityKind,
  AgentCellEdit,
  AgentColumn,
  AgentColumnAuthoring,
  AgentFilter,
  AgentFilterOption,
  AgentLimits,
  AgentManifest,
  AgentObservation,
  AgentPagination,
  AgentPolicy,
  AgentRowAddressing,
  AgentSession,
  ApprovalOutcome,
  ApprovalResult,
  ApprovalSubject,
  CapabilityFamily,
  CapabilityGuide,
  CapabilityPartial,
  CapabilityPlan,
  CapabilityProgress,
  CapabilityStaging,
  CatalogEntry,
  ExecuteError,
  ExecuteResult,
  JsonSchema,
  ResolvedRow,
  RowKeyRef,
  RowPositionRef,
  RowProvenanceEnvelope,
  RowReadQuery,
  RowRef,
  RowWindow,
  RowWindowRow,
  WriteExecuteResult,
  WriteProposal,
  WriteRowResult,
} from "./types";

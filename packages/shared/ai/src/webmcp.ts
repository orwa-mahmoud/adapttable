/**
 * The table as browser tools — `@adapttable/ai/webmcp`.
 *
 * WebMCP lets an agent running in the browser call tools the page itself
 * offers. What this registers is the permitted contract: the same capabilities,
 * the same schemas and the same executor every other integration uses. There is
 * no second dispatcher and no second policy — a tool call here ends up in
 * `session.execute`, which applies the exclusion predicate, the revision check
 * and the approval rules exactly as an HTTP turn does.
 *
 * Three things are deliberate:
 *
 * - **Nothing at import.** `document.modelContext` is read when `register` is
 *   called, so this module loads on a server and in a browser without the API,
 *   and registers nothing in either.
 * - **Annotations are derived, not authored.** A capability's `kind` already
 *   says whether it reads or writes; a hand-kept list beside it would be a
 *   second answer that could disagree.
 * - **A browser confirmation is additional.** If the agent's host asks the
 *   person to confirm, good — but the table's own approval still runs. Nothing
 *   here can turn `approval: "writes"` into a write nobody saw.
 *
 * @packageDocumentation
 */
import type {
  AgentCapabilityKind,
  AgentSession,
  ExecuteResult,
  JsonSchema,
} from "./types";

/** What a WebMCP tool result looks like. @public */
export interface WebMcpContent {
  readonly type: "text";
  readonly text: string;
}

/** What a tool hands back. @public */
export interface WebMcpResult {
  readonly content: readonly WebMcpContent[];
  /** Set when the call failed, so a host can style it as an error. */
  readonly isError?: boolean;
}

/** Hints a host uses to decide how much ceremony a call needs. @public */
export interface WebMcpAnnotations {
  /** The call changes nothing. */
  readonly readOnlyHint?: boolean;
  /** The call has consequences a person would want to know about. */
  readonly consequentialHint?: boolean;
  /** The result carries content from outside the system. */
  readonly untrustedContentHint?: boolean;
}

/** One tool as WebMCP wants it. @public */
export interface WebMcpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: unknown;
  readonly annotations: WebMcpAnnotations;
  readonly execute: (
    params: unknown,
    context?: { readonly signal?: AbortSignal }
  ) => Promise<WebMcpResult>;
}

/** The browser surface this registers against. @public */
export interface ModelContextLike {
  readonly registerTool: (tool: WebMcpTool) => void | (() => void);
  readonly unregisterTool?: (name: string) => void;
}

/** How registration is configured. @public */
export interface WebMcpOptions {
  /**
   * Capability keys to offer, when the host wants fewer than all of them.
   *
   * A narrowing only. A key the session does not permit stays unavailable
   * whatever this says — the exclusion list is the authority, and this is a
   * preference about surface area.
   */
  readonly exposedTo?: readonly string[];
  /** Told once when the page's policy forbids registration. */
  readonly onWarning?: (warning: { code: string; message: string }) => void;
  /** Injected for tests. Defaults to `document.modelContext`. */
  readonly modelContext?: ModelContextLike;
}

/** A live registration. @public */
export interface WebMcpRegistration {
  /** Tool names currently registered. */
  readonly names: readonly string[];
  /** Whether anything was registered at all. */
  readonly active: boolean;
  /** Remove the tools and abort anything in flight. Idempotent. */
  readonly dispose: () => void;
}

/** The browser's tool surface, read at call time. */
function modelContextOf(options: WebMcpOptions): ModelContextLike | undefined {
  if (options.modelContext) return options.modelContext;
  const scope = globalThis as {
    document?: { modelContext?: ModelContextLike };
  };
  return scope.document?.modelContext;
}

/** Whether a key only ever reads. */
function isReadOnly(kind: AgentCapabilityKind | undefined): boolean {
  return kind === "read" || kind === "view" || kind === undefined;
}

/**
 * The tool's own schema, plus the revision a caller may plan against.
 *
 * Optional, and only here: the capability's schema is what every other
 * transport shows, and those carry the revision in their request instead. An
 * agent in the page has no request to carry it in, so the call is where it
 * says so — and an agent that says nothing behaves exactly as it did.
 */
function revisionAware(input: JsonSchema): JsonSchema {
  if (input.type !== "object") return input;
  return {
    ...input,
    properties: {
      ...input.properties,
      expectedRevision: {
        type: "integer",
        minimum: 1,
        description:
          "The view revision this call was planned against, from an earlier read. Omit it to act on the table as it is now; name it and a table the reader has since moved refuses the call rather than applying it to a view nobody planned it for.",
      },
    },
  };
}

/**
 * Split what the caller planned against from what the capability takes.
 *
 * `expectedRevision` is this adapter's field rather than the capability's, so
 * it never reaches a schema that would refuse it as an unknown property.
 */
function plannedAgainst(params: unknown): {
  readonly args: unknown;
  readonly revision: number | undefined;
} {
  if (typeof params !== "object" || params === null) {
    return { args: params ?? {}, revision: undefined };
  }
  const { expectedRevision, ...args } = params as Record<string, unknown>;
  const revision =
    typeof expectedRevision === "number" && Number.isInteger(expectedRevision)
      ? expectedRevision
      : undefined;
  return { args, revision };
}

/**
 * Hints from what the capability already declares.
 *
 * `untrustedContentHint` goes on every read because a row is somebody's data
 * and a browser agent reading one is reading input from outside the system —
 * the same claim the provenance envelope makes on the wire.
 */
function annotationsFor(
  kind: AgentCapabilityKind | undefined
): WebMcpAnnotations {
  const readOnly = isReadOnly(kind);
  return {
    readOnlyHint: readOnly,
    consequentialHint: !readOnly,
    ...(kind === "read" ? { untrustedContentHint: true } : {}),
  };
}

function textResult(value: unknown, isError = false): WebMcpResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value) }],
    ...(isError ? { isError: true } : {}),
  };
}

/** A replay identity the page issues, never the agent. */
function callKey(tableId: string, key: string, sequence: number): string {
  return `webmcp:${JSON.stringify({ tableId, key, sequence })}`;
}

/**
 * Register the table's permitted capabilities as browser tools.
 *
 * @param session - The live session. Every tool routes back through it.
 * @param options - Narrowing, a warning sink, and an injectable surface.
 * @returns The registration, or an inactive one when the browser cannot.
 *
 * @public
 */
export function registerWebMcpTools(
  session: AgentSession,
  options: WebMcpOptions = {}
): WebMcpRegistration {
  const context = modelContextOf(options);
  if (!context) {
    // Not an error: most browsers have no WebMCP, and a page that works
    // without it must not fail because of it.
    return { names: [], active: false, dispose: () => undefined };
  }

  const manifest = session.manifest();
  const offered = session
    .catalog()
    .filter(
      (entry) => !options.exposedTo || options.exposedTo.includes(entry.key)
    );

  const controller = new AbortController();
  const removers: (() => void)[] = [];
  const names: string[] = [];
  let sequence = 0;
  let disposed = false;

  for (const entry of offered) {
    const definition = session.describe(entry.key);
    const name = `adapttable.${manifest.tableId}.${entry.key}`;
    const tool: WebMcpTool = {
      name,
      description: entry.summaryShort ?? entry.summary,
      inputSchema: revisionAware(definition.input),
      annotations: annotationsFor(entry.kind),
      execute: async (params, callContext) => {
        if (disposed || controller.signal.aborted) {
          return textResult(
            { error: "this table is no longer registered" },
            true
          );
        }
        sequence += 1;
        const planned = plannedAgainst(params);
        // The revision the caller says it planned against, and the table as it
        // is when nothing was said. An in-page agent reads the table through
        // one call and changes it through another, and the reader can move it
        // in between; naming the revision is how a call that was planned for a
        // view the table has left is refused rather than applied to a
        // different one.
        const live = session.manifest().viewRevision;
        const signal = callContext?.signal ?? controller.signal;
        let result: ExecuteResult;
        try {
          result = await session.execute(
            entry.key,
            planned.args,
            planned.revision ?? live,
            callKey(manifest.tableId, entry.key, sequence),
            signal
          );
        } catch (cause) {
          return textResult(
            { error: cause instanceof Error ? cause.message : String(cause) },
            true
          );
        }
        // The refusal says where the table actually is, so a caller that named
        // a revision the reader has since left can re-plan from this answer
        // rather than reading the number out of a sentence.
        if (!result.ok) {
          return textResult(
            { error: result.error, revision: result.revision },
            true
          );
        }
        // A read is already wrapped by the session. Anything else is a
        // receipt, which is what the agent should report rather than a claim
        // of its own.
        return textResult(
          isRowWindowResult(result.result)
            ? result.result
            : { ok: true, revision: result.revision, result: result.result }
        );
      },
    };

    try {
      const remove = context.registerTool(tool);
      names.push(name);
      if (typeof remove === "function") removers.push(remove);
    } catch (cause) {
      // A page whose Permissions-Policy forbids this is configured that way on
      // purpose. Saying so once is useful; throwing into a render is not.
      options.onWarning?.({
        code: cause instanceof Error ? cause.name : "registration-failed",
        message:
          cause instanceof Error
            ? cause.message
            : "the page could not register model-context tools",
      });
      break;
    }
  }

  return {
    names,
    active: names.length > 0,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const remove of removers) remove();
      if (context.unregisterTool) {
        for (const name of names) context.unregisterTool(name);
      }
    },
  };
}

/** Whether this result is a row window the session already labelled. */
function isRowWindowResult(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { source?: unknown }).source === "table-rows"
  );
}

// `registerWebMcpTools` takes a session and answers from its catalog, so the
// entry names the session, what it publishes, and what a call returns.
export type {
  AssistantSuggestion,
  CapabilityPresentation,
} from "./assistantContracts";
export type {
  ApprovalPolicy,
  CommitPolicy,
  RowAddressScope,
  WritePolicy,
} from "./keys";
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
  AgentManifestAggregation,
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

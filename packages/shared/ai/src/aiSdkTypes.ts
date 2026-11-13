/**
 * AI SDK UI message stream shapes: tools, parts, requests and the transport's
 * options.
 */
import type { ApprovalPresentation } from "@adapttable/core";

import { type AgentContextInputs, type AgentContextOptions } from "./context";
import type { AgentContextView } from "./contextSnapshot";
import type { ApprovalResult, ApprovalSubject } from "./types";

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
  ):
    | AsyncIterable<AiSdkPart>
    | Iterable<AiSdkPart>
    | Promise<AsyncIterable<AiSdkPart> | Iterable<AiSdkPart>>;
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

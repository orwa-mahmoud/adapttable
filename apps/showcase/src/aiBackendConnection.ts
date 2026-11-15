/**
 * Where the AI page's conversation goes, written once for React, Vue and
 * Angular: this page's script, or the reader's own endpoint over AdaptTable
 * HTTP, AG-UI or the AI SDK. Nothing reaches the network until Connect is
 * pressed, and the token is the endpoint's own, held in memory only.
 */
import type { AgentSession, AssistantTransport } from "@adapttable/ai";
import {
  type AgUiConnection,
  type AgUiEvent,
  aguiTransport,
} from "@adapttable/ai/ag-ui";
import {
  type AiSdkConnection,
  type AiSdkPart,
  aiSdkTransport,
} from "@adapttable/ai/ai-sdk";
import { assistantHttpTransport, connectAgentHttp } from "@adapttable/ai/http";

/** The address the repository's example backend listens on. */
export const SHOWCASE_AI_ENDPOINT = "http://127.0.0.1:8787";

/** Which protocol a connected endpoint speaks. */
export type AiProtocol = "http" | "ag-ui" | "ai-sdk";

/** Which transport the conversation is using. */
export type AiPlayMode = "simulated" | AiProtocol;

/** The conversation's transport, and where it goes. */
export interface ShowcaseConnection {
  readonly mode: AiPlayMode;
  readonly endpoint?: string;
  readonly transport: AssistantTransport;
  /** Changes only when the transport is genuinely swapped. */
  readonly key: string;
}

/** A connected endpoint. */
export interface ShowcaseBackendConnection extends ShowcaseConnection {
  readonly mode: AiProtocol;
  readonly endpoint: string;
}

/** The scripted conversation, as a connection. */
export function scriptedConnection(
  transport: AssistantTransport
): ShowcaseConnection {
  return { mode: "simulated", transport, key: "demo" };
}

/** What each protocol is called in the connected line. */
export const PROTOCOL_LABEL: Readonly<Record<AiProtocol, string>> = {
  http: "HTTP",
  "ag-ui": "AG-UI",
  "ai-sdk": "AI SDK",
};

/**
 * The protocols, as the connection form offers them: the label, then what it
 * means after a dash. `backticked` spans are code.
 */
export const PROTOCOLS: readonly {
  readonly value: AiProtocol;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "http",
    label: "AdaptTable HTTP",
    help: "one request per turn, the shape `examples/ai-http-backend.ts` serves.",
  },
  {
    value: "ag-ui",
    label: "AG-UI",
    help: "the table's capabilities become the run's frontend tools, and its events stream back. Same executor, same approvals.",
  },
  {
    value: "ai-sdk",
    label: "AI SDK",
    help: "your `streamText` route declares the table's capabilities as client tools, and this page runs them.",
  },
];

/** The connection panel's words. */
export const CONNECTION_TEXT = {
  title: "Use your own model",
  dialogLabel: "Connect a backend",
  scripted: "Scripted demo · no model connected",
  scriptedHelp:
    "The examples run real table operations against this page. Nothing is sent anywhere until you connect something.",
  connected: (protocol: AiProtocol) =>
    `Connected · ${PROTOCOL_LABEL[protocol]}`,
  protocol: "What your endpoint speaks",
  endpoint: "Your endpoint",
  token: "Endpoint token (optional)",
  tokenPlaceholder: "Your endpoint's own token — never a provider key",
  note: "Your endpoint receives the table's capability list, its column names and the rows you ask about — never a cell the table marks unreadable. Model credentials stay on your backend.",
  runExample: "Run the local example",
  connect: "Connect",
  connecting: "Connecting…",
  cancel: "Cancel",
  disconnect: "Disconnect",
  noSession: "The table has not published a session yet.",
} as const;

/** The three steps to a connected endpoint; `backticked` spans are code. */
export const CONNECTION_STEPS: readonly {
  readonly title: string;
  readonly body: string;
}[] = [
  {
    title: "Run an endpoint of your own.",
    body: "The repository ships a working one — `examples/ai-http-backend.ts`. Copy `examples/ai-http-backend.env.example` to `examples/.env.ai-http`, put your provider key in it, then start it with `pnpm --filter @adapttable/examples ai-http`. It listens on `http://127.0.0.1:8787`.",
  },
  {
    title: "Your key never leaves that process.",
    body: "The page holds no provider credentials and never asks for one. Your endpoint talks to OpenAI, Anthropic, Gemini or DeepSeek; this table talks only to your endpoint.",
  },
  {
    title: "Point this at it and connect.",
    body: "One handshake runs now, so a wrong address is reported here rather than on your first question.",
  },
];

/** Post the run and read its Server-Sent Events back, one parsed frame each. */
async function* postForEvents<T>(
  endpoint: string,
  token: string,
  body: unknown,
  signal: AbortSignal | undefined,
  what: string
): AsyncGenerator<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    throw new Error(`the ${what} endpoint answered ${String(response.status)}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let split = buffer.indexOf("\n\n");
      while (split >= 0) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        const data = /^data: (.*)$/m.exec(frame)?.[1];
        // The AI SDK ends its stream with this sentinel rather than only by
        // closing the body.
        if (data && data !== "[DONE]") yield JSON.parse(data) as T;
        split = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** An AG-UI endpoint, over Server-Sent Events. */
function sseAgUiConnection(endpoint: string, token: string): AgUiConnection {
  return {
    run: (input, signal) =>
      postForEvents<AgUiEvent>(endpoint, token, input, signal, "AG-UI"),
  };
}

/** An AI SDK route, over its UI message stream. */
function sseAiSdkConnection(endpoint: string, token: string): AiSdkConnection {
  return {
    run: (request, signal) =>
      postForEvents<AiSdkPart>(endpoint, token, request, signal, "AI SDK"),
  };
}

/**
 * Connect the conversation to the reader's endpoint. HTTP and AG-UI run one
 * handshake now, so a wrong address is reported here rather than on the
 * first question.
 *
 * @param session - The table's live agent session.
 * @param endpoint - The endpoint's address.
 * @param token - The endpoint's own token, or empty.
 * @param protocol - What the endpoint speaks.
 * @param signal - Cancels the handshake.
 * @returns The connection.
 */
export async function connectShowcaseBackend(
  session: AgentSession,
  endpoint: string,
  token: string,
  protocol: AiProtocol = "http",
  signal?: AbortSignal
): Promise<ShowcaseBackendConnection> {
  const address = endpoint.trim();
  const url = new URL(address);
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Enter an HTTP or HTTPS endpoint.");
  const key = `${protocol}:${address}`;
  if (protocol === "ai-sdk") {
    return {
      mode: protocol,
      endpoint: address,
      transport: aiSdkTransport({
        connection: sseAiSdkConnection(address, token),
      }),
      key,
    };
  }
  if (protocol === "ag-ui") {
    // A different protocol, the same table: the contract goes out as the
    // run's frontend tools and every call comes back through the same
    // executor the HTTP path uses.
    const transport = aguiTransport({
      connection: sseAgUiConnection(address, token),
    });
    await transport.connect?.({ session });
    signal?.throwIfAborted();
    return { mode: protocol, endpoint: address, transport, key };
  }
  const options = {
    endpoint: address,
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  };
  await connectAgentHttp(session, options, signal);
  signal?.throwIfAborted();
  return {
    mode: protocol,
    endpoint: address,
    transport: assistantHttpTransport(options),
    key,
  };
}

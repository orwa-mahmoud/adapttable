/**
 * Where the conversation goes: this page's script, or your own backend.
 *
 * The demo is scripted and says so. Connecting is a deliberate act — nothing
 * here reaches the network until Connect is pressed, no credential is stored
 * anywhere, and the field asks for YOUR endpoint's token, never a provider
 * key. Model keys belong on the backend; this page never sees one.
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
import { useEffect, useId, useRef, useState } from "react";

import { docsUrl } from "./matrix/content";

/** Which transport the conversation is using. @internal */
export type AiPlayMode = "simulated" | "backend" | "ag-ui" | "ai-sdk";

/** Which protocol a connected endpoint speaks. @internal */
export type AiProtocol = "http" | "ag-ui" | "ai-sdk";

/** A connected endpoint, or nothing. @internal */
export interface AiConnection {
  readonly mode: AiPlayMode;
  readonly endpoint?: string;
  readonly transport: AssistantTransport;
  /** Changes only when the transport is genuinely swapped. */
  readonly key: string;
}

interface AiConnectionSettingsProps {
  readonly session: AgentSession | null;
  readonly connection: AiConnection;
  readonly demoTransport: AssistantTransport;
  readonly onChange: (connection: AiConnection) => void;
  readonly onClose: () => void;
}

/**
 * An AG-UI endpoint, over Server-Sent Events.
 *
 * The whole of what a host supplies: post the run input, read the events back.
 * No agent framework is imported — the run input and the events are this
 * package's own types, and a CopilotKit, Mastra or LangGraph endpoint is
 * reached through exactly this.
 */
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

/**
 * An AG-UI endpoint, over Server-Sent Events.
 *
 * The whole of what a host supplies: post the run input, read the events back.
 * No agent framework is imported — the run input and the events are this
 * package's own types.
 */
function sseAgUiConnection(endpoint: string, token: string): AgUiConnection {
  return {
    run: (input, signal) =>
      postForEvents<AgUiEvent>(endpoint, token, input, signal, "AG-UI"),
  };
}

/**
 * An AI SDK route, over its UI message stream.
 *
 * The same two lines of host code. The route declares the table's
 * capabilities as client tools and this reads the parts back; `ai` is not
 * imported here either.
 */
function sseAiSdkConnection(endpoint: string, token: string): AiSdkConnection {
  return {
    run: (request, signal) =>
      postForEvents<AiSdkPart>(endpoint, token, request, signal, "AI SDK"),
  };
}

/**
 * Connection settings, opened from the assistant's own status badge.
 *
 * @internal
 */
/** What each backend mode is called in the connected chip. */
const MODE_LABEL: Readonly<Record<string, string>> = {
  "ag-ui": "AG-UI",
  "ai-sdk": "AI SDK",
  http: "HTTP",
};

export function AiConnectionSettings({
  session,
  connection,
  demoTransport,
  onChange,
  onClose,
}: Readonly<AiConnectionSettingsProps>) {
  const endpointId = useId();
  const tokenId = useId();
  const [endpoint, setEndpoint] = useState(
    connection.endpoint ?? "http://127.0.0.1:8787"
  );
  const [token, setToken] = useState("");
  const [protocol, setProtocol] = useState<AiProtocol>("http");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const connect = async (): Promise<void> => {
    if (!session) {
      setError("The table has not published a session yet.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const options = {
        endpoint,
        ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      };
      if (protocol === "ai-sdk") {
        const transport = aiSdkTransport({
          connection: sseAiSdkConnection(endpoint, token),
        });
        onChange({
          mode: "ai-sdk",
          endpoint,
          transport,
          key: `ai-sdk:${endpoint}`,
        });
        onClose();
        return;
      }
      if (protocol === "ag-ui") {
        // A different protocol, the same table: the contract goes out as the
        // run's frontend tools and every call comes back through the same
        // executor the HTTP path uses.
        const transport = aguiTransport({
          connection: sseAgUiConnection(endpoint, token),
        });
        await transport.connect?.({ session });
        onChange({
          mode: "ag-ui",
          endpoint,
          transport,
          key: `ag-ui:${endpoint}`,
        });
        onClose();
        return;
      }
      // One handshake, so a wrong endpoint is reported here rather than on
      // the reader's first question.
      await connectAgentHttp(session, options);
      onChange({
        mode: "backend",
        endpoint,
        transport: assistantHttpTransport(options),
        key: `backend:${endpoint}`,
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const disconnect = (): void => {
    // The token was only ever held in this form's state; dropping back to the
    // scripted transport leaves nothing behind that could reach the network.
    setToken("");
    onChange({
      mode: "simulated",
      transport: demoTransport,
      key: "demo",
    });
    onClose();
  };

  return (
    <div className="ai-conn" aria-label="Assistant connection">
      <p className="ai-conn__now">
        {connection.mode === "simulated" ? (
          <>
            <strong>Scripted demo · no model connected</strong>
            <span>
              The examples run real table operations against this page. Nothing
              is sent anywhere until you connect something.
            </span>
          </>
        ) : (
          <>
            <strong>Connected · {MODE_LABEL[connection.mode] ?? "HTTP"}</strong>
            <span>{connection.endpoint}</span>
          </>
        )}
      </p>

      {connection.mode === "simulated" ? (
        <ol className="ai-conn__steps">
          <li>
            <strong>Run an endpoint of your own.</strong> The repository ships a
            working one — <code>examples/ai-http-backend.ts</code>. Copy{" "}
            <code>examples/ai-http-backend.env.example</code> to{" "}
            <code>examples/.env.ai-http</code>, put your provider key in it,
            then start it with{" "}
            <code>pnpm --filter @adapttable/examples ai-http</code>. It listens
            on <code>http://127.0.0.1:8787</code>.
          </li>
          <li>
            <strong>Your key never leaves that process.</strong> The page holds
            no provider credentials and never asks for one. Your endpoint talks
            to OpenAI, Anthropic, Gemini or DeepSeek; this table talks only to
            your endpoint.
          </li>
          <li>
            <strong>Point this at it and connect.</strong> One handshake runs
            now, so a wrong address is reported here rather than on your first
            question.
          </li>
        </ol>
      ) : null}

      {connection.mode === "simulated" ? null : (
        <button type="button" className="ai-conn__btn" onClick={disconnect}>
          Disconnect
        </button>
      )}
      {connection.mode === "simulated" ? (
        <form
          className="ai-conn__form"
          onSubmit={(event) => {
            event.preventDefault();
            void connect();
          }}
        >
          <fieldset className="ai-conn__protocol">
            <legend>What your endpoint speaks</legend>
            <label>
              <input
                type="radio"
                name="ai-protocol"
                value="http"
                checked={protocol === "http"}
                onChange={() => {
                  setProtocol("http");
                }}
              />
              <span>
                AdaptTable HTTP — one request per turn, the shape
                <code> examples/ai-http-backend.ts</code> serves.
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="ai-protocol"
                value="ag-ui"
                checked={protocol === "ag-ui"}
                onChange={() => {
                  setProtocol("ag-ui");
                }}
              />
              <span>
                AG-UI — the table&apos;s capabilities become the run&apos;s
                frontend tools, and its events stream back. Same executor, same
                approvals.
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="ai-protocol"
                value="ai-sdk"
                checked={protocol === "ai-sdk"}
                onChange={() => {
                  setProtocol("ai-sdk");
                }}
              />
              <span>
                AI SDK — your <code>streamText</code> route declares the
                table&apos;s capabilities as client tools, and this page runs
                them.
              </span>
            </label>
          </fieldset>
          <label htmlFor={endpointId}>Your endpoint</label>
          <input
            id={endpointId}
            type="url"
            value={endpoint}
            onChange={(event) => {
              setEndpoint(event.target.value);
            }}
          />
          <label htmlFor={tokenId}>Endpoint token (optional)</label>
          <input
            id={tokenId}
            type="password"
            autoComplete="off"
            value={token}
            placeholder="Your endpoint's own token — never a provider key"
            onChange={(event) => {
              setToken(event.target.value);
            }}
          />
          <p className="ai-conn__note">
            Your endpoint receives the table&apos;s capability list, its column
            names and the rows you ask about — never a cell the table marks
            unreadable. Model credentials stay on your backend.{" "}
            <a href={docsUrl("ai-http")}>Run the local example</a>.
          </p>
          {error ? (
            <p className="ai-conn__error" role="alert">
              {error}
            </p>
          ) : null}
          <span className="ai-conn__row">
            <button type="submit" className="ai-conn__btn" disabled={busy}>
              {busy ? "Connecting…" : "Connect"}
            </button>
            <button type="button" className="ai-conn__btn" onClick={onClose}>
              Cancel
            </button>
          </span>
        </form>
      ) : null}
    </div>
  );
}

/**
 * The connection settings as a modal.
 *
 * One dialog, reached from three places — the "Try it for real" button beside
 * the mode pill, the assistant's own settings control, and the reply a
 * scripted demo gives when it does not understand a question. A reader who
 * hits the limit of the demo should not have to go hunting for the way past
 * it.
 *
 * @internal
 */
export function AiConnectDialog({
  open,
  ...props
}: Readonly<AiConnectionSettingsProps & { open: boolean }>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ai-conn-dialog"
      aria-label="Connect a backend"
      // Escape dismisses it; the host owns the state, so the close has to
      // travel back rather than be swallowed by the element.
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
    >
      <header className="ai-conn-dialog__head">
        <h3>Use your own model</h3>
        <button
          type="button"
          className="ai-conn-dialog__close"
          aria-label="Close"
          onClick={props.onClose}
        >
          ✕
        </button>
      </header>
      <AiConnectionSettings {...props} />
    </dialog>
  );
}

/**
 * The table as an MCP App view.
 *
 * An MCP host embeds this page in an iframe beside the conversation. It is a
 * client of the host, not a second authority: every reader action goes out as
 * `tools/call`, and the server answering those calls is the same
 * `createAgentSession` everything else uses. Nothing here can write to a table
 * the policy would have refused.
 *
 * Deliberately outside `PageShell`. The showcase chrome — nav, footer, the
 * repo strip — belongs to a page somebody browsed to, and this one is drawn
 * inside somebody else's window.
 */
import type { McpToolResult } from "@adapttable/ai/mcp";
import {
  type McpAppBridge,
  type McpAppHostCapabilities,
  type McpAppToolInput,
  type McpAppToolOutcome,
  createMcpAppBridge,
} from "@adapttable/ai/mcp-apps";
import type { ColumnDef } from "@adapttable/react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { DemoFallback } from "./kitDemos";
import { kitClassNames, KitProvider, kitTable } from "./kitProviders";

interface OrderRow {
  id: string;
  customer: string;
  total: number;
  status: string;
}

const SEED: readonly OrderRow[] = [
  { id: "o1", customer: "Ada", total: 320, status: "Open" },
  { id: "o2", customer: "Grace", total: 180, status: "Paid" },
  { id: "o3", customer: "Alan", total: 940, status: "Open" },
  { id: "o4", customer: "Jean", total: 75, status: "Refunded" },
  { id: "o5", customer: "Don", total: 410, status: "Paid" },
];

const COLUMNS: ColumnDef<OrderRow>[] = [
  { key: "customer", header: "Customer", accessor: (row) => row.customer },
  { key: "total", header: "Total", accessor: (row) => row.total },
  { key: "status", header: "Status", accessor: (row) => row.status },
];

/** What the embedding host told us about itself, read from the frame's URL. */
function readFrameParams(): {
  hostOrigin: string | null;
  kit: string;
  dark: boolean;
} {
  if (typeof window === "undefined") {
    return { hostOrigin: null, kit: "mantine", dark: false };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    // Required, and never defaulted to "*": a handshake posted to a wildcard
    // announces this table's contract to whatever else is listening.
    hostOrigin: params.get("hostOrigin"),
    kit: params.get("kit") ?? "mantine",
    dark: params.get("theme") === "dark",
  };
}

/** One line about a call the host made, newest first. */
interface Activity {
  readonly id: string;
  readonly text: string;
}

/**
 * What a call actually did, read from the result rather than assumed.
 *
 * A write the policy holds comes back `approval: "pending"` and nothing has
 * been written. Reporting that as a success is the one mistake a view like
 * this can make that the reader would never catch.
 */
function outcomeOf(result: McpToolResult): string {
  if (result.isError) return "refused";
  const text = result.content[0]?.text ?? "";
  const approval = receiptApproval(text);
  if (approval === "pending") return "waiting for approval on the table";
  if (approval === "rejected") return "the reader said no";
  return text.slice(0, 80);
}

/** The approval a receipt reported, when the body was one. */
function receiptApproval(text: string): string | undefined {
  try {
    const body = JSON.parse(text) as { result?: { approval?: string } };
    return body.result?.approval;
  } catch {
    // A host may answer with prose rather than our receipt. That is not an
    // error to report; it is a body with no approval in it, shown as it came.
    return undefined;
  }
}

export function McpAppView() {
  const [{ hostOrigin, kit, dark }] = useState(readFrameParams);
  const [rows] = useState<OrderRow[]>(() => [...SEED]);
  const [capabilities, setCapabilities] = useState<
    McpAppHostCapabilities | undefined
  >();
  const [activity, setActivity] = useState<readonly Activity[]>([]);
  const [error, setError] = useState<string>("");
  const bridgeRef = useRef<McpAppBridge | null>(null);
  const Table = kitTable<OrderRow>(kit);

  const note = useCallback((text: string) => {
    setActivity((current) =>
      [{ id: `${String(current.length)}-${text}`, text }, ...current].slice(
        0,
        8
      )
    );
  }, []);

  useEffect(() => {
    if (!hostOrigin) {
      setError(
        "This view was opened without its host's origin, so it will not start a handshake."
      );
      return;
    }
    const bridge = createMcpAppBridge({
      hostOrigin,
      onToolInput: (input: McpAppToolInput) => {
        note(`${input.toolName} — running`);
      },
      onToolResult: (outcome: McpAppToolOutcome) => {
        note(`${outcome.toolName} — done`);
      },
      onWarning: (warning) => {
        note(`host: ${warning.message}`);
      },
    });
    bridgeRef.current = bridge;
    bridge
      .initialize()
      .then((advertised) => {
        setCapabilities(advertised);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      bridge.dispose();
      bridgeRef.current = null;
    };
  }, [hostOrigin, note]);

  /**
   * A reader action, as a tool call.
   *
   * Never a local mutation: the host runs it against the session, so the
   * exclusion list, the revision check and the approval policy all apply. A
   * write the policy holds comes back unapplied, which is the point.
   */
  const call = async (name: string, args: unknown) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    try {
      const result = await bridge.callTool(name, args);
      note(`${name} → ${outcomeOf(result)}`);
    } catch (cause) {
      note(`${name} → ${cause instanceof Error ? cause.message : "failed"}`);
    }
  };

  return (
    <div className="mx-demo" data-testid="mcp-app-view">
      {error ? (
        <p className="hint-row" role="alert">
          <span className="hint">{error}</span>
        </p>
      ) : (
        <p className="hint-row">
          <span className="hint" data-testid="mcp-app-status">
            {capabilities
              ? `Connected. The host ${capabilities.elicitation ? "can" : "cannot"} ask on our behalf.`
              : "Connecting to the host…"}
          </span>
        </p>
      )}
      <div className="hint-row">
        <button
          type="button"
          data-testid="mcp-app-sort"
          onClick={() =>
            void call("view.setSort", { key: "total", dir: "desc" })
          }
        >
          Sort by total
        </button>
        <button
          type="button"
          data-testid="mcp-app-next"
          onClick={() => void call("view.setPage", { page: 2 })}
        >
          Next page
        </button>
        <button
          type="button"
          data-testid="mcp-app-write"
          onClick={() =>
            void call("edit.cells", {
              edits: [
                {
                  column: "status",
                  value: "Paid",
                  position: 1,
                  scope: "visible",
                },
              ],
            })
          }
        >
          Mark first as paid
        </button>
      </div>
      <KitProvider kit={kit} dark={dark} dir="ltr">
        <Suspense fallback={<DemoFallback />}>
          <Table
            data={rows}
            columns={COLUMNS}
            rowKey={(row: OrderRow) => row.id}
            urlSync={false}
            classNames={kitClassNames(kit)}
          />
        </Suspense>
      </KitProvider>
      <ul className="hint-row" data-testid="mcp-app-activity">
        {activity.map((entry) => (
          <li key={entry.id}>{entry.text}</li>
        ))}
      </ul>
    </div>
  );
}

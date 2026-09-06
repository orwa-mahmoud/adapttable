/**
 * A table assistant with no shipped widget.
 *
 * `useTableAssistant` is the whole of the conversation: state, one send at a
 * time, receipts read from what actually happened. Everything below the hook
 * call is ordinary markup this app owns, which is the point — the widget in
 * `@adapttable/<kit>/assistant` is a convenience, never a requirement.
 */
import {
  type AssistantSuggestion,
  useTableAssistant,
} from "@adapttable/ai/assistant";
import { assistantHttpTransport } from "@adapttable/ai/http";
import { tableAgent } from "@adapttable/ai/react";
import { DataTable } from "@adapttable/mantine";
import { useMemo, useState } from "react";

import type { AgentSession } from "@adapttable/ai";

interface Order {
  id: string;
  customer: string;
  city: string;
  total: number;
}

const ORDERS: Order[] = [
  { id: "1", customer: "Ada", city: "London", total: 120 },
  { id: "2", customer: "Grace", city: "New York", total: 340 },
];

/**
 * Authored prompts, each naming what it needs.
 *
 * A chip for a capability this table does not offer is hidden rather than
 * shown and refused, and the prompt is written text — never something
 * manufactured from the capability key.
 */
const SUGGESTIONS: AssistantSuggestion[] = [
  {
    id: "group-by-city",
    title: "Group by city",
    prompt: "Group the orders by city.",
    requires: ["view.setGroupBy"],
  },
  {
    id: "pin-customer",
    title: "Pin the customer column",
    prompt: "Pin the customer column to the start.",
    requires: ["view.pinColumn"],
  },
  {
    id: "biggest",
    title: "Find the biggest order",
    prompt: "Which order has the highest total?",
    requires: ["rows.read"],
  },
];

function Panel({ session }: { session: AgentSession | undefined }) {
  // The endpoint is this app's own backend. A host with no backend passes its
  // own transport instead; nothing here requires HTTP.
  const transport = useMemo(
    () => assistantHttpTransport({ endpoint: "/api/table-agent" }),
    []
  );
  const assistant = useTableAssistant({
    session,
    transport,
    suggestions: SUGGESTIONS,
  });

  return (
    <aside>
      <p>{assistant.status}</p>

      <ol>
        {assistant.messages.map((message) => (
          <li key={message.id}>
            {/* Backend text is untrusted: rendered as text, never as HTML. */}
            <strong>{message.role}</strong> {message.text}
            {message.receipts ? (
              <ul>
                {message.receipts.map((receipt) => (
                  <li key={receipt.idempotencyKey}>
                    {receipt.capabilityKey ?? "action"} — {receipt.status}
                    {receipt.message ? `: ${receipt.message}` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>

      {assistant.messages.length === 0
        ? assistant.suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => void assistant.runSuggestion(suggestion.id)}
            >
              {suggestion.title}
            </button>
          ))
        : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void assistant.send();
        }}
      >
        <input
          value={assistant.draft}
          onChange={(event) => {
            assistant.setDraft(event.target.value);
          }}
          aria-label="Ask about this table"
        />
        <button type="submit" disabled={assistant.status === "sending"}>
          Send
        </button>
        {assistant.status === "sending" ? (
          <button type="button" onClick={assistant.stop}>
            Stop
          </button>
        ) : null}
      </form>

      {assistant.error ? <p role="alert">{assistant.error}</p> : null}
    </aside>
  );
}

export function OrdersWithAssistant() {
  // The bridge hands the live session out of the table, so the panel can be a
  // sibling rather than a child of the table's own tree.
  const [session, setSession] = useState<AgentSession | undefined>(undefined);
  const features = useMemo(
    () => [tableAgent({ tableId: "orders", bridge: { attach: setSession } })],
    []
  );

  return (
    <>
      <DataTable
        data={ORDERS}
        columns={[
          {
            key: "customer",
            header: "Customer",
            accessor: (row: Order) => row.customer,
          },
          { key: "city", header: "City", accessor: (row: Order) => row.city },
          {
            key: "total",
            header: "Total",
            accessor: (row: Order) => row.total,
          },
        ]}
        rowKey={(row: Order) => row.id}
        features={features}
      />
      <Panel session={session} />
    </>
  );
}

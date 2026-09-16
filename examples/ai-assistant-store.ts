/**
 * The conversation without a framework, and without a UI.
 *
 * There is no React here, no DOM, and no HTTP. The point is that the
 * controller at `@adapttable/ai/assistant` is the whole lifecycle: a binding
 * for another framework subscribes to exactly this and renders it, rather than
 * re-deriving one send at a time, late-reply rejection and draft recovery for
 * itself.
 *
 * Run it with:
 *
 *   node --experimental-strip-types examples/ai-assistant-store.ts
 */
import { createAgentSession } from "@adapttable/ai";
import {
  type AssistantTransport,
  createTableAssistant,
} from "@adapttable/ai/assistant";

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];

/** The table state this example owns. AdaptTable never owns the data. */
const view = { page: 1, revision: 1 };

const session = createAgentSession({
  observe: () => ({
    tableId: "people",
    viewRevision: view.revision,
    featureIds: [],
    columns: [
      {
        id: "name",
        label: "Name",
        type: "string",
        readable: true,
        writable: false,
        sortable: true,
      },
    ],
    source: {
      fullDataset: false,
      grouping: false,
      selectAcrossPages: false,
      exportScope: "page",
      totalCount: "loaded",
    },
    writePolicy: "allow",
    approval: "never",
    commit: "immediate",
    hasPagination: true,
    hasSearch: false,
    hasSort: false,
    hasFilters: false,
    hasExport: false,
    hasEdit: false,
    hasReorder: false,
    page: view.page,
    limit: 10,
    search: "",
    pageMax: 50,
    rowAddressScope: "visible",
  }),
  apply: {
    setPage: (page: number) => {
      view.page = page;
      view.revision += 1;
    },
    readRows: () => ({
      offset: 0,
      limit: rows.length,
      redacted: [],
      rows: rows.map((row) => ({ rowKey: row.id, cells: { name: row.name } })),
    }),
  },
});

/**
 * A transport with no model behind it.
 *
 * This is the seam: anything that turns a sentence into calls fits here — a
 * provider SDK, a backend over HTTP, or, as here, three lines of `if`. The
 * store does not know or care which.
 */
const scripted: AssistantTransport = {
  send: async ({ session: live, text }) => {
    if (!/page\s*(\d+)/i.test(text)) {
      return { text: `The table is on page ${String(view.page)}.` };
    }
    const page = Number(/page\s*(\d+)/i.exec(text)?.[1] ?? 1);
    const result = await live.execute(
      "view.setPage",
      { page },
      live.manifest().viewRevision,
      `example:${text}`
    );
    return {
      text: result.ok ? `Moved to page ${String(page)}.` : "That did not work.",
      results: [result],
      keys: ["view.setPage"],
    };
  },
};

const store = createTableAssistant({ session, transport: scripted });

// What a binding does: subscribe, and render the snapshot. Here "render" is a
// line of text, which is the only part another framework would replace.
const stop = store.subscribe(() => {
  const state = store.getState();
  const last = state.messages.at(-1);
  if (!last) return;
  console.log(`[${state.status}] ${last.role}: ${last.text}`);
});

store.connect();
await store.send("Go to page 3");
await store.send("Where am I?");

// Nothing is delivered and nothing is notified after this.
stop();
store.dispose();
console.log(`table is on page ${String(view.page)}`);

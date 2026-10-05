<script setup lang="ts">
import { receiptFromResult, subjectFor } from "@adapttable/ai";
import {
  type AgentApprovalPending,
  type AgentContextInputs,
  type AgentProgress,
  type AgentSession,
  type AlwaysAllowedState,
  type AssistantTransport,
  tableAgent,
  useSpeechInput,
  useTableAssistant,
} from "@adapttable/ai-vue";
import { DataTable } from "@adapttable/vue-unstyled";
import {
  agentApproval,
  tableAssistant,
} from "@adapttable/vue-unstyled/assistant";
import { computed, shallowRef } from "vue";

const rows = [
  { id: "ada", name: "Ada" },
  { id: "grace", name: "Grace" },
  { id: "alan", name: "Alan" },
  { id: "barbara", name: "Barbara" },
];
const columns = [{ key: "name", sortable: true }];
const rowKey = (row: { id: string }) => row.id;
const selected = shallowRef<string[]>([]);
const accept = shallowRef(true);
const voice = shallowRef(false);
const open = shallowRef(true);
const presentation = shallowRef<"widget" | "table" | "modal">("widget");
const session = shallowRef<AgentSession>();
const approval = shallowRef<AgentApprovalPending | null>(null);
const progress = shallowRef<AgentProgress | null>(null);
const allowed = shallowRef<AlwaysAllowedState>();
const context = shallowRef<() => AgentContextInputs>();
const agent = tableAgent(() => ({
  tableId: "vue-native-assistant",
  approval: { policy: "writes", presentation: presentation.value },
  writePolicy: "allow",
  commit: "immediate",
  capabilities: [
    {
      key: "demo.selectAll",
      summary: "Review selection of every person",
      kind: "write",
      partial: "supported",
      guide: {
        guide: "Select the approved people.",
        input: { type: "object" },
        output: { type: "object" },
      },
      isEnabled: () => true,
      plan: () => ({
        proposals: rows.map((row) => ({
          rowKey: row.id,
          rowLabel: row.name,
          before: selected.value.includes(row.id),
          after: true,
        })),
        payload: rows.map((row) => row.id),
        perItem: true,
      }),
      execute: ({ apply, plan }) => {
        const ids = Array.isArray(plan?.payload)
          ? plan.payload.filter((id): id is string => typeof id === "string")
          : [];
        apply.setSelection?.(ids);
        return { applied: true, ids };
      },
    },
    {
      key: "demo.select",
      summary: "Select a person after approval",
      kind: "write",
      guide: {
        guide: "Select the named person.",
        input: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        output: { type: "object" },
      },
      isEnabled: () => true,
      execute: ({ apply }, args) => {
        if (
          !args ||
          typeof args !== "object" ||
          !("id" in args) ||
          typeof args.id !== "string"
        )
          throw new Error("A person id is required.");
        apply.setSelection?.([args.id]);
        return { applied: true };
      },
    },
  ],
  bridge: {
    attach: (value) => {
      session.value = value;
    },
    approvals: (value) => {
      approval.value = value;
    },
    progress: (value) => {
      progress.value = value;
    },
    alwaysAllowed: (value) => {
      allowed.value = value;
    },
    viewInputs: (value) => {
      context.value = value;
    },
  },
}));
let turn = 0;
function selectionRequest(review: boolean, id: string) {
  return review
    ? { key: "demo.select", args: { id } }
    : { key: "view.setSelection", args: { ids: [id] } };
}
const transport: AssistantTransport = {
  send: async ({ text, askUser, signal }) => {
    if (text.trim().toLowerCase() === "ask") {
      const answer = await askUser?.({
        id: "person",
        question: "Which person?",
        allowFreeText: true,
        options: [
          { id: "ada", label: "Ada" },
          { id: "grace", label: "Grace" },
        ],
      });
      return { text: answer?.optionId ?? answer?.text ?? "No answer" };
    }
    const current = session.value;
    if (!current) return { text: "The table is not connected." };
    turn += 1;
    const id = text.toLowerCase().includes("grace") ? "grace" : "ada";
    if (text.toLowerCase().includes("approve all")) {
      const result = await current.execute(
        "demo.selectAll",
        {},
        current.manifest().viewRevision,
        `showcase-${turn}`,
        signal
      );
      return {
        text: result.ok
          ? "Selected the approved people."
          : "Selection was not approved.",
        results: [result],
        keys: ["demo.selectAll"],
      };
    }
    if (text.toLowerCase().includes("sort")) {
      const result = await current.execute(
        "view.setSort",
        { key: "name", dir: "desc" },
        current.manifest().viewRevision,
        `showcase-${turn}`,
        signal
      );
      if (text.toLowerCase().includes("and search")) {
        const search = await current.execute(
          "view.setSearch",
          { query: "Alan" },
          current.manifest().viewRevision,
          `showcase-${turn}-search`,
          signal
        );
        return {
          text: "The table returned the sort and search results.",
          results: [result, search],
          keys: ["view.setSort", "view.setSearch"],
          subjects: [
            subjectFor("view.setSort", { key: "name", dir: "desc" }, result),
            subjectFor("view.setSearch", { query: "Alan" }, search),
          ],
        };
      }
      if (text.toLowerCase().includes("and select")) {
        const selection = await current.execute(
          "view.setSelection",
          { ids: ["ada"] },
          current.manifest().viewRevision,
          `showcase-${turn}-select`,
          signal
        );
        return {
          text: "The table returned the sort and selection results.",
          results: [result, selection],
          keys: ["view.setSort", "view.setSelection"],
        };
      }
      return {
        text: result.ok
          ? "The table accepted the sort."
          : "The table did not confirm this sort.",
        results: [result],
        keys: ["view.setSort"],
      };
    }
    const { key, args } = selectionRequest(
      text.toLowerCase().includes("approve"),
      id
    );
    const result = await current.execute(
      key,
      args,
      current.manifest().viewRevision,
      `showcase-${turn}`,
      signal
    );
    return {
      text:
        receiptFromResult(result, key, "immediate").status === "executed"
          ? "The table accepted the selection."
          : "The table did not confirm this selection.",
      results: [result],
      keys: [key],
    };
  },
};
const assistant = useTableAssistant(() => ({
  session: session.value,
  transport,
  approval: approval.value,
  progress: progress.value,
  alwaysAllow: allowed.value,
  contextInputs: context.value,
  suggestions: [
    { id: "ada", title: "Select Ada", prompt: "Select Ada" },
    { id: "grace", title: "Select Grace", prompt: "Select Grace" },
    {
      id: "sort",
      title: "Sort names",
      description: "Sort the table by name",
      prompt: "Sort names",
    },
    { id: "all", title: "Review all people", prompt: "Approve all" },
    {
      id: "sort-search",
      title: "Sort and search for Alan",
      prompt: "Sort and search for Alan",
    },
  ],
  open: open.value,
  onOpenChange: (value) => {
    open.value = value;
  },
}));
const speech = useSpeechInput(() => ({
  voice: voice.value ? { languages: ["en-US", "fr-FR"] } : undefined,
  setDraft: assistant.setDraft,
}));
const view = computed(() => ({
  assistant: assistant.view.value,
  open: assistant.open.value,
  onOpenChange: assistant.setOpen,
  approval: approval.value,
  speech: speech.view.value,
  greeting: "Choose a person to select, or type ask.",
  note: "This local transport executes real table actions and reports their actual receipts.",
}));
const features = [agent, tableAssistant(), agentApproval()];
const selection = (ids: string[]) => {
  if (accept.value) selected.value = ids;
};
</script>
<template>
  <main>
    <h1>Vue native assistant</h1>
    <label
      ><input
        v-model="accept"
        type="checkbox"
        data-testid="accept-model"
      />Accept controlled selection</label
    >
    <label
      ><input
        v-model="voice"
        type="checkbox"
        data-testid="enable-speech"
      />Enable browser dictation</label
    >
    <label
      >Approval surface
      <select v-model="presentation" data-testid="approval-surface">
        <option value="widget">Conversation</option>
        <option value="table">Table</option>
        <option value="modal">Modal</option>
      </select></label
    >
    <p data-testid="selected-ids">{{ selected.join(",") || "none" }}</p>
    <DataTable
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :features="features"
      :assistant="view"
      selectable
      :selected-ids="selected"
      :url-sync="false"
      @update:selected-ids="selection"
    />
  </main>
</template>

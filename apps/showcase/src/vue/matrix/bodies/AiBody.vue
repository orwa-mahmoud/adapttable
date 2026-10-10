<script setup lang="ts">
/** A deterministic local agent over the real Vue table and the selected kit UI. */
import "../../../angular/aiBody.css";

import {
  type AgentContextInputs,
  type AgentSession,
  type AssistantSuggestion,
  type AssistantTransport,
  receiptFromResult,
} from "@adapttable/ai";
import { tableAgent, useTableAssistant } from "@adapttable/ai-vue";
import type { AgentApprovalPending, ColumnDef } from "@adapttable/vue";
import { computed, shallowRef } from "vue";

import { SHOWCASE_PRESENTATION, TABLE_PRESENTATION } from "../data";
import { useShowcaseKit } from "../showcaseKit";

interface AgentPerson {
  id: string;
  name: string;
  salary: number;
}

const INITIAL: readonly AgentPerson[] = [
  { id: "ada", name: "Ada Lovelace", salary: 120 },
  { id: "grace", name: "Grace Hopper", salary: 140 },
  { id: "katherine", name: "Katherine Johnson", salary: 130 },
];

const SUGGESTIONS: readonly AssistantSuggestion[] = [
  {
    id: "sort",
    title: "Sort salaries",
    prompt: "Sort salaries highest first",
    kind: "sort",
    requires: ["view.setSort"],
  },
  {
    id: "choose",
    title: "Choose a person",
    prompt: "Choose a person",
    kind: "filter",
    requires: ["view.setSearch"],
  },
  {
    id: "edit",
    title: "Propose salary",
    prompt: "Propose Grace's salary as 150",
    kind: "edit",
    requires: ["edit.cells"],
  },
];

const kit = useShowcaseKit();
const rows = shallowRef<readonly AgentPerson[]>(INITIAL);
const rowKey = (row: AgentPerson) => row.id;
const columns: readonly ColumnDef<AgentPerson>[] = [
  { key: "name", header: "Person", sortable: true },
  {
    key: "salary",
    header: "Salary",
    sortable: true,
    editable: true,
    editor: "number",
  },
];
const session = shallowRef<AgentSession>();
const pending = shallowRef<AgentApprovalPending | null>(null);
const open = shallowRef(false);
const approvalSurface = shallowRef<"widget" | "table" | "modal">("widget");
const log = shallowRef("No host writes yet");
let readView: (() => AgentContextInputs) | undefined;
let turn = 0;

/** Resolve one local request to the table action it names, if any. */
async function plan(
  request: string,
  ask: Parameters<AssistantTransport["send"]>[0]["askUser"],
  abort: AbortSignal | undefined,
  partial: Parameters<AssistantTransport["send"]>[0]["onPartialText"]
): Promise<{ key: string; args: unknown; success: string } | { text: string }> {
  if (request.includes("choose")) {
    const answer = await ask?.({
      id: `person-${String(++turn)}`,
      question: "Which person should I show?",
      options: INITIAL.map((row) => ({ id: row.id, label: row.name })),
      allowFreeText: true,
    });
    if (!answer || abort?.aborted) return { text: "No filter applied." };
    const person = INITIAL.find((row) => row.id === answer.optionId);
    const search = person?.name ?? answer.text?.trim();
    if (!search) return { text: "No filter applied." };
    return {
      key: "view.setSearch",
      args: { search },
      success: `Showing ${search}.`,
    };
  }
  if (request.includes("propose"))
    return {
      key: "edit.cells",
      args: { edits: [{ rowKey: "grace", column: "salary", value: 150 }] },
      success: "Grace's salary is now 150.",
    };
  if (request.includes("everyone") || request.includes("reset"))
    return {
      key: "view.setSearch",
      args: { search: "" },
      success: "Showing everyone.",
    };
  if (request.includes("sort"))
    return {
      key: "view.setSort",
      args: { key: "salary", dir: "desc" },
      success: "Highest salary first.",
    };
  if (request.includes("wait")) {
    partial?.("Waiting. Press Stop to cancel this local turn.");
    await new Promise<void>((resolve) => {
      if (!abort || abort.aborted) resolve();
      else abort.addEventListener("abort", () => resolve(), { once: true });
    });
    return { text: "Cancelled without changing the table." };
  }
  return {
    text: "Try: sort salaries, choose a person, propose Grace's salary as 150, or show everyone.",
  };
}

const transport: AssistantTransport = {
  send: async ({
    session: current,
    text,
    signal: abort,
    askUser,
    onPartialText,
  }) => {
    const step = await plan(text.toLowerCase(), askUser, abort, onPartialText);
    if ("text" in step) return step;
    if (abort?.aborted)
      return { text: "Cancelled without changing the table." };
    const result = await current.execute(
      step.key,
      step.args,
      current.manifest().viewRevision,
      `vue-demo-${String(++turn)}`,
      abort
    );
    const receipt = receiptFromResult(
      result,
      step.key,
      current.manifest().policy.commit
    );
    return {
      text:
        receipt.status === "executed"
          ? step.success
          : `No change applied: ${result.error?.message ?? "the request was refused"}.`,
      keys: [step.key],
      results: [result],
    };
  },
};

const assistant = useTableAssistant(() => ({
  session: session.value,
  transport,
  transportKey: "vue-local-script",
  suggestions: SUGGESTIONS,
  approval: pending.value,
  open: open.value,
  onOpenChange: (value: boolean) => {
    open.value = value;
  },
  contextInputs: () => readView?.() ?? {},
}));

const features = [
  kit.editing<AgentPerson>((row, column, value) => {
    if (column !== "salary") throw new Error("This demo only edits salary");
    const salary = Number(value);
    rows.value = rows.value.map((person) =>
      person.id === row.id ? { ...person, salary } : person
    );
    log.value = `${row.name} salary saved: ${String(salary)}`;
  }),
  kit.agentApproval(),
  tableAgent(() => ({
    tableId: "vue-ai-people",
    writePolicy: "allow",
    commit: "immediate",
    approval: { policy: "writes", presentation: approvalSurface.value },
    columns: {
      name: { type: "string", readable: true, sortable: true },
      salary: {
        type: "number",
        readable: true,
        writable: true,
        sortable: true,
      },
    },
    bridge: {
      attach: (value: AgentSession) => {
        session.value = value;
      },
      approvals: (value: AgentApprovalPending | null) => {
        pending.value = value;
      },
      viewInputs: (read: () => AgentContextInputs) => {
        readView = read;
      },
    },
  })),
];

function send(text: string): void {
  open.value = true;
  void assistant.send(text);
}

function changeSurface(value: string): void {
  if (value === "widget" || value === "table" || value === "modal")
    approvalSurface.value = value;
}

const showEveryone = computed(() =>
  kit.button({
    label: "Show everyone",
    part: "demo-show-everyone",
    disabled: assistant.busy.value || !session.value,
    onClick: () => send("Show everyone"),
  })
);
const surfaceChoice = computed(() =>
  kit.select({
    label: "Approval surface",
    part: "demo-approval-surface",
    value: approvalSurface.value,
    disabled: assistant.busy.value,
    options: [
      { value: "widget", label: "Assistant" },
      { value: "table", label: "Table" },
      { value: "modal", label: "Dialog" },
    ],
    onChange: changeSurface,
  })
);
const ShowEveryone = () => showEveryone.value;
const SurfaceChoice = () => surfaceChoice.value;
</script>

<template>
  <div class="mx-demo ai-demo" :dir="SHOWCASE_PRESENTATION.dir">
    <p class="hint">
      This local demo needs no model or API key. Sort salaries, choose a person,
      or propose Grace's salary as 150. Writes wait for your decision.
    </p>
    <div class="angular-ai-controls">
      <ShowEveryone />
      <div class="angular-ai-choice">
        <span>Approval surface</span>
        <SurfaceChoice />
      </div>
    </div>
    <component
      :is="kit.DataTable"
      v-bind="TABLE_PRESENTATION"
      table-label="AI people"
      :data="rows"
      :columns="columns"
      :row-key="rowKey"
      :url-sync="false"
      :defaults="{ limit: 10 }"
      :features="features"
    />
    <p class="hint" role="status" data-demo-log>{{ log }}</p>
    <component
      :is="kit.TableAssistant"
      :assistant="assistant.view.value"
      :approval="pending"
      :open="assistant.open.value"
      :on-open-change="assistant.setOpen"
      presentation="floating"
      :dir="SHOWCASE_PRESENTATION.dir"
      :labels="SHOWCASE_PRESENTATION.labels"
      note="Scripted locally. Table changes and host writes are real."
      greeting="What would you like to do with these people?"
    />
  </div>
</template>

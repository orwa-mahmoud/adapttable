import { receiptFromResult } from "@adapttable/ai";
import {
  type AgentApprovalPending,
  type AgentContextInputs,
  type AgentProgress,
  type AgentSession,
  type AlwaysAllowedState,
  type AssistantTransport,
  tableAgent,
  useTableAssistant,
} from "@adapttable/ai-vue";
import { getLabels } from "@adapttable/i18n";
import { computed, shallowRef } from "vue";

import { workspaceCopy } from "./copy";
import type { Order } from "./data";

/** A transparent local script exercises the actual agent, approval, and receipts. */
export function useOrderAssistant(
  input: () => { locale: "en" | "ar"; rows: readonly Order[] }
) {
  const session = shallowRef<AgentSession>();
  const approval = shallowRef<AgentApprovalPending | null>(null);
  const progress = shallowRef<AgentProgress | null>(null);
  const allowed = shallowRef<AlwaysAllowedState>();
  const context = shallowRef<() => AgentContextInputs>();
  const open = shallowRef(false);
  const text = computed(() => workspaceCopy[input().locale]);
  const agent = tableAgent(() => ({
    tableId: "vue-order-desk",
    writePolicy: "allow",
    commit: "immediate",
    approval: { policy: "writes", presentation: "widget" },
    capabilities: [
      {
        key: "orders.prepareReview",
        summary: text.value.assistantCapability,
        kind: "write",
        guide: {
          guide: text.value.assistantCapability,
          input: { type: "object", properties: {} },
          output: { type: "object" },
        },
        isEnabled: () => true,
        execute: ({ apply }) => {
          const ids = input()
            .rows.filter((row) => row.status === "Review")
            .map((row) => row.id);
          apply.setSelection?.(ids);
          return { selected: ids.length };
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
  const transport: AssistantTransport = {
    send: async ({ text: prompt, signal }) => {
      const current = session.value;
      if (!current) return { text: text.value.assistantUnavailable };
      const review = /review|pending|مراجعة/u.test(prompt.toLowerCase());
      const sort = /highest|sort|أعلى|الأعلى/u.test(prompt.toLowerCase());
      if (!review && !sort) return { text: text.value.assistantUnknown };
      const key = review ? "orders.prepareReview" : "view.setSort";
      const result = await current.execute(
        key,
        review ? {} : { key: "amount", dir: "desc" },
        current.manifest().viewRevision,
        `order-desk-${++turn}`,
        signal
      );
      const applied = review
        ? text.value.assistantReviewDone
        : text.value.assistantSortDone;
      return {
        text:
          receiptFromResult(result, key, "immediate").status === "executed"
            ? applied
            : text.value.assistantNotApplied,
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
      {
        id: "review",
        title: text.value.suggestionReview,
        prompt: text.value.suggestionReview,
      },
      {
        id: "sort",
        title: text.value.suggestionSort,
        prompt: text.value.suggestionSort,
      },
    ],
    open: open.value,
    onOpenChange: (value) => {
      open.value = value;
    },
  }));
  const view = computed(() => ({
    assistant: assistant.view.value,
    open: assistant.open.value,
    onOpenChange: assistant.setOpen,
    approval: approval.value,
    labels: {
      ...getLabels(input().locale),
      assistantTitle: text.value.assistantTitle,
    },
    dir: input().locale === "ar" ? ("rtl" as const) : ("ltr" as const),
    greeting: text.value.assistantGreeting,
    note: text.value.assistantNote,
    presentation: "panel" as const,
  }));
  return { agent, view };
}

<script setup lang="ts">
import {
  type AgentApprovalPending,
  type AgentSession,
  TABLE_AGENT_STATE,
  tableAgent,
  useSpeechInput,
  useTableAssistant,
} from "@adapttable/ai-vue";
import type { SummaryRowFn, TableSummaryModel } from "@adapttable/vue";
import { useFeatureState } from "@adapttable/vue/adapter";
import type * as assistantContract from "@adapttable/vue/assistant";
import type { TableAssistantSlots } from "@adapttable/vue/assistant";
import { DataTable } from "@adapttable/vue-unstyled";
import {
  agentApproval,
  TableAssistant,
  tableAssistant,
} from "@adapttable/vue-unstyled/assistant";
import { computed, shallowRef } from "vue";
const injected = useFeatureState(TABLE_AGENT_STATE);
const manifest = computed(() => injected.value?.manifest());
const session = shallowRef<AgentSession>();
const approval = shallowRef<AgentApprovalPending | null>(null);
const feature = tableAgent({
  tableId: "types",
  bridge: {
    attach: (value) => {
      session.value = value;
    },
    approvals: (value) => {
      approval.value = value;
    },
  },
});
const assistant = useTableAssistant(() => ({
  session: session.value,
  approval: approval.value,
  transport: { send: () => Promise.resolve({ text: "answer" }) },
}));
const speech = useSpeechInput({ voice: {}, setDraft: assistant.setDraft });
const presentation = computed(() => ({
  assistant: assistant.view.value,
  open: assistant.open.value,
  onOpenChange: assistant.setOpen,
  speech: speech.view.value,
  approval: approval.value,
}));
const features = [feature, tableAssistant(), agentApproval()];
const rows = [{ id: "1", name: "Ada" }];
const columns = [{ key: "name" }];
const rowKey = (row: { id: string }) => row.id;
defineProps<{ slots?: TableAssistantSlots }>();

interface ConsumerRow {
  id: string;
  name: string;
}
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
const rowTypeIsPreserved: Expect<
  Equal<
    ReturnType<
      assistantContract.FeatureMountContext<ConsumerRow>["runtime"]["rowAt"]
    >,
    ConsumerRow | undefined
  >
> = true;
const hostTypeIsPreserved: Expect<
  Equal<
    Parameters<NonNullable<assistantContract.StaticTableFeature["setup"]>>[0],
    assistantContract.StaticFeatureHost
  >
> = true;
const summaryTypeIsPreserved: Expect<
  Equal<
    assistantContract.TableSummaryModel<ConsumerRow>,
    TableSummaryModel<ConsumerRow>
  >
> = true;
const summaryMapperTypeIsPreserved: Expect<
  Equal<assistantContract.SummaryRowFn<ConsumerRow>, SummaryRowFn<ConsumerRow>>
> = true;
const summaryCellTypeIsPreserved: Expect<
  Equal<
    assistantContract.TableSummaryCellModel<ConsumerRow>,
    TableSummaryModel<ConsumerRow>["cells"][number]
  >
> = true;
const contextName = (
  context: assistantContract.FeatureMountContext<ConsumerRow>
): string | undefined => context.runtime.rowAt(0)?.name;
const typedFeature: assistantContract.StaticTableFeature = {
  id: "typed-assistant-consumer",
  setup: (host: assistantContract.StaticFeatureHost) =>
    host.onDispose(() => undefined),
  mount: <TRow,>(context: assistantContract.FeatureMountContext<TRow>) => {
    const row: TRow | undefined = context.runtime.rowAt(0);
    return () => row;
  },
};
defineExpose({
  manifest,
  rowTypeIsPreserved,
  hostTypeIsPreserved,
  summaryTypeIsPreserved,
  summaryMapperTypeIsPreserved,
  summaryCellTypeIsPreserved,
  contextName,
  typedFeature,
});
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :assistant="presentation"
  />
  <TableAssistant v-bind="presentation" />
</template>

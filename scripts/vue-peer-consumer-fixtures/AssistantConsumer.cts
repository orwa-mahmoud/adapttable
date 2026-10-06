import ai = require("@adapttable/ai-vue");
import binding1 = require("@adapttable/vue/adapter");
import binding2 = require("@adapttable/vue");
import kit = require("@adapttable/vue-unstyled/assistant");
import vue = require("vue");
import type { StaticTableFeature } from "@adapttable/vue";

const agent: StaticTableFeature = ai.tableAgent({ tableId: "consumer" });
const session = vue.shallowRef<ai.AgentSession>();
const assistant: ai.TableAssistantState = ai.useTableAssistant(() => ({
  session: session.value,
  transport: { send: () => Promise.resolve({ text: "answer" }) },
}));
const speech: ai.SpeechInputState = ai.useSpeechInput({
  setDraft: assistant.setDraft,
});
const props: binding1.TableAssistantProps = {
  assistant: assistant.view.value,
  speech: speech.view.value,
  open: false,
  onOpenChange: assistant.setOpen,
};
const features = [agent, kit.tableAssistant(), kit.agentApproval()];
const controls = [
  features,
  props,
  kit.TableAssistant,
  kit.AgentApproval,
  binding1.TableAssistantChrome,
  binding1.AgentApprovalChrome,
  ai.TABLE_AGENT_STATE,
];

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
    ReturnType<binding2.FeatureMountContext<ConsumerRow>["runtime"]["rowAt"]>,
    ConsumerRow | undefined
  >
> = true;
const hostTypeIsPreserved: Expect<
  Equal<
    Parameters<NonNullable<binding2.StaticTableFeature["setup"]>>[0],
    binding2.StaticFeatureHost
  >
> = true;
const contextName = (
  context: binding2.FeatureMountContext<ConsumerRow>
): string | undefined => context.runtime.rowAt(0)?.name;
const typedFeature: binding2.StaticTableFeature = {
  id: "typed-assistant-consumer",
  setup: (host: binding2.StaticFeatureHost) => host.onDispose(() => undefined),
  mount: <TRow,>(context: binding2.FeatureMountContext<TRow>) => {
    const row: TRow | undefined = context.runtime.rowAt(0);
    return () => row;
  },
};
export = {
  controls,
  rowTypeIsPreserved,
  hostTypeIsPreserved,
  contextName,
  typedFeature,
};

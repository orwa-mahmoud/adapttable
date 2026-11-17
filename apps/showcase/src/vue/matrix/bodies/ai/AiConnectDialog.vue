<script setup lang="ts">
/**
 * Where the conversation goes: this page's script, or the reader's own
 * endpoint. Nothing reaches the network until Connect is pressed, and the
 * token is the endpoint's own, held in this form only.
 */
import type { AgentSession, AssistantTransport } from "@adapttable/ai";
import { onMounted, onScopeDispose, shallowRef, useId, watch } from "vue";

import {
  type AiProtocol,
  CONNECTION_STEPS,
  CONNECTION_TEXT,
  connectShowcaseBackend,
  PROTOCOLS,
  scriptedConnection,
  SHOWCASE_AI_ENDPOINT,
  type ShowcaseConnection,
} from "../../../../aiBackendConnection";
import { docsUrl } from "../../../../matrix/content";
import { codeSpans } from "../../../../shared/codeSpans";

const props = defineProps<{
  open: boolean;
  session: AgentSession | undefined;
  connection: ShowcaseConnection;
  demoTransport: AssistantTransport;
}>();
const emit = defineEmits<{
  change: [connection: ShowcaseConnection];
  close: [];
}>();

const endpointId = useId();
const tokenId = useId();
const endpoint = shallowRef(props.connection.endpoint ?? SHOWCASE_AI_ENDPOINT);
const token = shallowRef("");
const protocol = shallowRef<AiProtocol>("http");
const busy = shallowRef(false);
const error = shallowRef("");
const dialog = shallowRef<HTMLDialogElement>();
let request: AbortController | undefined;

function cancelRequest(): void {
  request?.abort();
  request = undefined;
  busy.value = false;
}
watch(() => props.session, cancelRequest);
onScopeDispose(cancelRequest);

function sync(open: boolean): void {
  const element = dialog.value;
  if (!element) return;
  if (open && !element.open) element.showModal();
  if (!open && element.open) element.close();
}
onMounted(() => {
  sync(props.open);
});
watch(() => props.open, sync);

async function connect(): Promise<void> {
  const session = props.session;
  if (!session) {
    error.value = CONNECTION_TEXT.noSession;
    return;
  }
  cancelRequest();
  const current = new AbortController();
  request = current;
  busy.value = true;
  error.value = "";
  try {
    const connection = await connectShowcaseBackend(
      session,
      endpoint.value,
      token.value,
      protocol.value,
      current.signal
    );
    if (request !== current || props.session !== session) return;
    emit("change", connection);
    emit("close");
  } catch (cause) {
    if (request === current && !current.signal.aborted)
      error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    if (request === current) {
      request = undefined;
      busy.value = false;
    }
  }
}

function disconnect(): void {
  // The token was only ever held in this form; dropping back to the script
  // leaves nothing behind that could reach the network.
  token.value = "";
  emit("change", scriptedConnection(props.demoTransport));
  emit("close");
}

function field(event: Event): string {
  return event.target instanceof HTMLInputElement ? event.target.value : "";
}
</script>

<template>
  <dialog
    ref="dialog"
    class="ai-conn-dialog"
    :aria-label="CONNECTION_TEXT.dialogLabel"
    @cancel.prevent="emit('close')"
  >
    <header class="ai-conn-dialog__head">
      <h3>{{ CONNECTION_TEXT.title }}</h3>
      <button
        type="button"
        class="ai-conn-dialog__close"
        aria-label="Close"
        @click="emit('close')"
      >
        ✕
      </button>
    </header>
    <div class="ai-conn" aria-label="Assistant connection">
      <p class="ai-conn__now">
        <template v-if="connection.mode === 'simulated'">
          <strong>{{ CONNECTION_TEXT.scripted }}</strong>
          <span>{{ CONNECTION_TEXT.scriptedHelp }}</span>
        </template>
        <template v-else>
          <strong>{{ CONNECTION_TEXT.connected(connection.mode) }}</strong>
          <span>{{ connection.endpoint }}</span>
        </template>
      </p>

      <ol v-if="connection.mode === 'simulated'" class="ai-conn__steps">
        <li v-for="step in CONNECTION_STEPS" :key="step.title">
          <strong>{{ step.title }}</strong>
          {{ " " }}
          <template v-for="(part, at) in codeSpans(step.body)" :key="at">
            <code v-if="part.code">{{ part.text }}</code>
            <template v-else>{{ part.text }}</template>
          </template>
        </li>
      </ol>

      <button
        v-if="connection.mode !== 'simulated'"
        type="button"
        class="ai-conn__btn"
        @click="disconnect"
      >
        {{ CONNECTION_TEXT.disconnect }}
      </button>
      <form v-else class="ai-conn__form" @submit.prevent="connect">
        <fieldset class="ai-conn__protocol">
          <legend>{{ CONNECTION_TEXT.protocol }}</legend>
          <label v-for="option in PROTOCOLS" :key="option.value">
            <input
              type="radio"
              name="ai-protocol"
              :value="option.value"
              :checked="protocol === option.value"
              @change="protocol = option.value"
            />
            <span>
              {{ option.label }} —
              <template v-for="(part, at) in codeSpans(option.help)" :key="at">
                <code v-if="part.code">{{ part.text }}</code>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
          </label>
        </fieldset>
        <label :for="endpointId">{{ CONNECTION_TEXT.endpoint }}</label>
        <input
          :id="endpointId"
          type="url"
          :value="endpoint"
          @input="endpoint = field($event)"
        />
        <label :for="tokenId">{{ CONNECTION_TEXT.token }}</label>
        <input
          :id="tokenId"
          type="password"
          autocomplete="off"
          :value="token"
          :placeholder="CONNECTION_TEXT.tokenPlaceholder"
          @input="token = field($event)"
        />
        <p class="ai-conn__note">
          {{ CONNECTION_TEXT.note }}
          <a :href="docsUrl('ai-http', 'vue')">{{
            CONNECTION_TEXT.runExample
          }}</a
          >.
        </p>
        <p v-if="error" class="ai-conn__error" role="alert">{{ error }}</p>
        <span class="ai-conn__row">
          <button type="submit" class="ai-conn__btn" :disabled="busy">
            {{ busy ? CONNECTION_TEXT.connecting : CONNECTION_TEXT.connect }}
          </button>
          <button type="button" class="ai-conn__btn" @click="emit('close')">
            {{ CONNECTION_TEXT.cancel }}
          </button>
        </span>
      </form>
    </div>
  </dialog>
</template>

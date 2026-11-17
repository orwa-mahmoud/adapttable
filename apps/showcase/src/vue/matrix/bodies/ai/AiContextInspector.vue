<script setup lang="ts">
/**
 * What the agent is actually told about this table: the permitted contract
 * as it stands, what each turn carries, and one capability's schema. Always
 * LTR — a JSON schema read right-to-left demonstrates nothing.
 */
import type {
  AgentContextInputs,
  AgentManifest,
  AgentSession,
} from "@adapttable/ai";
import { computed, shallowRef } from "vue";

import { docsUrl } from "../../../../matrix/content";
import type { DemoContextProfile } from "../../../../shared/aiDemo";
import {
  inspectedContext,
  INSPECTOR_LINKS,
  INSPECTOR_TEXT,
  inspectorView,
} from "../../../../shared/aiInspector";

const props = defineProps<{
  session: AgentSession | undefined;
  manifest: AgentManifest | undefined;
  contextInputs: () => AgentContextInputs;
  profile: DemoContextProfile;
  webmcpNames: readonly string[];
}>();

// Rebuilt when the session, the manifest or the profile moves: a new
// manifest is published only when one actually differs.
const context = computed(() =>
  inspectedContext(
    props.session,
    props.manifest,
    props.profile,
    props.contextInputs
  )
);
const picked = shallowRef("");
const view = computed(() =>
  inspectorView(
    context.value,
    props.manifest,
    picked.value,
    props.webmcpNames,
    props.session !== undefined
  )
);

function pick(event: Event): void {
  if (event.target instanceof HTMLSelectElement)
    picked.value = event.target.value;
}

function copySchema(): void {
  void navigator.clipboard?.writeText(
    view.value.copyable ? view.value.schema : ""
  );
}
</script>

<template>
  <section class="ai-demo__dev" data-testid="ai-inspector" dir="ltr">
    <h3 class="ai-demo__dev-title">{{ INSPECTOR_TEXT.title }}</h3>
    <p class="ai-demo__revision">{{ view.revision }}</p>

    <dl class="ai-demo__facts" data-testid="ai-context-facts">
      <div>
        <dt>{{ INSPECTOR_TEXT.version }}</dt>
        <dd>
          <code data-testid="ai-contract-version">{{ view.version }}</code>
        </dd>
      </div>
      <div>
        <dt>{{ INSPECTOR_TEXT.sent }}</dt>
        <dd data-testid="ai-context-size">{{ view.sent }}</dd>
      </div>
      <div>
        <dt>{{ INSPECTOR_TEXT.upfront }}</dt>
        <dd data-testid="ai-context-upfront">{{ view.upfront }}</dd>
      </div>
      <div>
        <dt>{{ INSPECTOR_TEXT.deferred }}</dt>
        <dd data-testid="ai-context-deferred">{{ view.deferred }}</dd>
      </div>
    </dl>

    <ul
      v-if="view.notes.length > 0"
      class="ai-demo__notes"
      data-testid="ai-context-notes"
    >
      <li v-for="note in view.notes" :key="note">{{ note }}</li>
    </ul>

    <p class="ai-demo__note" data-testid="ai-sampling-note">
      {{ view.sampling }}
    </p>
    <p class="ai-demo__note" data-testid="ai-webmcp-tools">{{ view.webmcp }}</p>

    <label class="ai-demo__pick">
      <span>{{ INSPECTOR_TEXT.capability }}</span>
      <select data-testid="ai-catalog" :value="view.selected" @change="pick">
        <option v-if="view.capabilities.length === 0" value="">
          {{ INSPECTOR_TEXT.noCapabilities }}
        </option>
        <option
          v-for="entry in view.capabilities"
          :key="entry.key"
          :value="entry.key"
        >
          {{ entry.label }}
        </option>
      </select>
    </label>

    <div class="ai-demo__schema-wrap">
      <button
        type="button"
        class="ai-demo__copy"
        data-testid="ai-schema-copy"
        @click="copySchema"
      >
        {{ INSPECTOR_TEXT.copy }}
      </button>
      <pre
        class="ai-demo__schema"
        data-testid="ai-schema"
        dir="ltr"
        :aria-label="INSPECTOR_TEXT.schemaFor(view.selected)"
        >{{ view.schema }}</pre>
    </div>

    <p class="ai-demo__refs">
      <a
        v-for="link in INSPECTOR_LINKS"
        :key="link.page"
        :href="docsUrl(link.page, 'vue')"
        >{{ link.label }}</a
      >
    </p>
  </section>
</template>

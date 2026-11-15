<script setup lang="ts">
/**
 * The AI page's settings drawer: what the table wires, which actions need a
 * human, where they are asked, what saving means, what the agent is told and
 * may do. Scaffolding around the table, so it stays in the page's language
 * and out of the table's direction.
 */
import type { ApprovalPresentation } from "@adapttable/core";
import { onMounted, onScopeDispose, shallowRef, watch } from "vue";

import {
  APPROVAL_CHOICES,
  type ApprovalOverride,
  DEMO_EXCLUSIONS,
  DEMO_FEATURES,
  type DemoActionApproval,
  type DemoContextProfile,
  type DemoEditingMode,
  type DemoFeatureKey,
  type DemoToggles,
  EDITING_MODES,
  OPTIONS_TEXT,
  PRESENTATIONS,
  PROFILES,
  SAVING,
} from "../../../../shared/aiDemo";

const props = defineProps<{
  open: boolean;
  toggles: DemoToggles;
  actions: readonly DemoActionApproval[];
  presentation: ApprovalPresentation;
  commit: "stage" | "immediate";
  rtl: boolean;
  contextProfile: DemoContextProfile;
  excluded: readonly string[];
  webmcp: boolean;
  webmcpAvailable: boolean;
}>();
const emit = defineEmits<{
  close: [];
  editingMode: [mode: DemoEditingMode];
  toggle: [key: DemoFeatureKey];
  approval: [key: string, next: ApprovalOverride | "inherit"];
  presentation: [next: ApprovalPresentation];
  commit: [next: "stage" | "immediate"];
  rtl: [next: boolean];
  contextProfile: [next: DemoContextProfile];
  offer: [key: string];
  webmcp: [next: boolean];
  reset: [];
}>();

const dialog = shallowRef<HTMLDialogElement>();

/** Open or close the native dialog with the host's state. */
function sync(open: boolean): void {
  const element = dialog.value;
  if (!element) return;
  if (open && !element.open) {
    const view = element.ownerDocument.defaultView;
    const top = view?.scrollY;
    const left = view?.scrollX;
    element.showModal();
    // Stop a pending page scroll before the modal holds the background.
    view?.scrollTo({ top, left, behavior: "instant" });
  }
  if (!open && element.open) element.close();
}

/**
 * Dismissal from the dark around the panel: the backdrop belongs to the
 * dialog, so a click is read against the panel's own box.
 */
function dismiss(event: MouseEvent): void {
  const element = dialog.value;
  if (!element || event.target !== element) return;
  const box = element.getBoundingClientRect();
  const onPanel =
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom;
  if (!onPanel) emit("close");
}

onMounted(() => {
  dialog.value?.addEventListener("click", dismiss);
  sync(props.open);
});
onScopeDispose(() => dialog.value?.removeEventListener("click", dismiss));
watch(() => props.open, sync);

/** The answer a select carries, if it is one the drawer offers. */
function approvalFrom(event: Event): ApprovalOverride | "inherit" | undefined {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return undefined;
  return APPROVAL_CHOICES.find((choice) => choice.value === target.value)
    ?.value;
}

function answer(key: string, event: Event): void {
  const next = approvalFrom(event);
  if (next) emit("approval", key, next);
}
</script>

<template>
  <dialog
    ref="dialog"
    class="ai-opts"
    :aria-label="OPTIONS_TEXT.title"
    data-testid="ai-demo-options-drawer"
    @cancel.prevent="emit('close')"
  >
    <header class="ai-opts__head">
      <h3>{{ OPTIONS_TEXT.title }}</h3>
      <button
        type="button"
        class="ai-opts__close"
        :aria-label="OPTIONS_TEXT.close"
        @click="emit('close')"
      >
        ✕
      </button>
    </header>

    <div class="ai-opts__body">
      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.features }}</h4>
        <p class="ai-opts__help">{{ OPTIONS_TEXT.featuresHelp }}</p>
        <div class="ai-opts__row ai-opts__row--mode">
          <span>
            <span class="ai-opts__label">{{ OPTIONS_TEXT.editingMode }}</span>
            <span class="ai-opts__hint">{{
              OPTIONS_TEXT.editingModeHelp
            }}</span>
          </span>
          <div class="seg" role="group" :aria-label="OPTIONS_TEXT.editingMode">
            <button
              v-for="mode in EDITING_MODES"
              :key="mode.value"
              type="button"
              class="seg__btn"
              :class="{ 'is-on': toggles.editingMode === mode.value }"
              :aria-pressed="toggles.editingMode === mode.value"
              :data-testid="`ai-editing-${mode.value}`"
              @click="emit('editingMode', mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>
        <label
          v-for="feature in DEMO_FEATURES"
          :key="feature.key"
          class="ai-opts__row"
        >
          <input
            type="checkbox"
            :aria-label="feature.label"
            :checked="toggles[feature.key]"
            :data-testid="`ai-toggle-${feature.key}`"
            @change="emit('toggle', feature.key)"
          />
          <span>
            <span class="ai-opts__label">{{ feature.label }}</span>
            <span class="ai-opts__hint">{{ feature.help }}</span>
          </span>
        </label>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.approvals }}</h4>
        <p class="ai-opts__help">{{ OPTIONS_TEXT.approvalsHelp }}</p>
        <p v-if="actions.length === 0" class="ai-opts__hint">
          {{ OPTIONS_TEXT.noApprovals }}
        </p>
        <div v-for="action in actions" :key="action.key" class="ai-opts__row">
          <span>
            <span class="ai-opts__label">{{ action.label }}</span>
            <span class="ai-opts__hint">{{ action.description }}</span>
          </span>
          <span class="ai-opts__choices">
            <select
              :aria-label="OPTIONS_TEXT.approvalFor(action.label)"
              :data-testid="`ai-approval-${action.key}`"
              :value="action.inherited ? 'inherit' : action.policy"
              @change="answer(action.key, $event)"
            >
              <option
                v-for="choice in APPROVAL_CHOICES"
                :key="choice.value"
                :value="choice.value"
              >
                {{ choice.label }}
              </option>
            </select>
          </span>
        </div>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.location }}</h4>
        <p class="ai-opts__help">{{ OPTIONS_TEXT.locationHelp }}</p>
        <label
          v-for="option in PRESENTATIONS"
          :key="option.value"
          class="ai-opts__row"
        >
          <input
            type="radio"
            name="ai-approval-location"
            :aria-label="option.label"
            :value="option.value"
            :checked="presentation === option.value"
            :data-testid="`ai-presentation-${option.value}`"
            @change="emit('presentation', option.value)"
          />
          <span>
            <span class="ai-opts__label">{{ option.label }}</span>
            <span class="ai-opts__hint">{{ option.help }}</span>
          </span>
        </label>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.saving }}</h4>
        <label
          v-for="option in SAVING"
          :key="option.value"
          class="ai-opts__row"
        >
          <input
            type="radio"
            name="ai-saving"
            :aria-label="option.label"
            :value="option.value"
            :checked="commit === option.value"
            :disabled="
              option.value === 'stage' && toggles.editingMode !== 'batch'
            "
            :data-testid="`ai-commit-${option.value}`"
            @change="emit('commit', option.value)"
          />
          <span>
            <span class="ai-opts__label">{{ option.label }}</span>
            <span class="ai-opts__hint">{{ option.help }}</span>
          </span>
        </label>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.told }}</h4>
        <p class="ai-opts__help">{{ OPTIONS_TEXT.toldHelp }}</p>
        <label
          v-for="option in PROFILES"
          :key="option.value"
          class="ai-opts__row"
        >
          <input
            type="radio"
            name="ai-context-profile"
            :aria-label="option.label"
            :value="option.value"
            :checked="contextProfile === option.value"
            :data-testid="`ai-profile-${option.value}`"
            @change="emit('contextProfile', option.value)"
          />
          <span>
            <span class="ai-opts__label">{{ option.label }}</span>
            <span class="ai-opts__hint">{{ option.help }}</span>
          </span>
        </label>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.may }}</h4>
        <p class="ai-opts__help">{{ OPTIONS_TEXT.mayHelp }}</p>
        <label
          v-for="exclusion in DEMO_EXCLUSIONS"
          :key="exclusion.key"
          class="ai-opts__row"
        >
          <input
            type="checkbox"
            :aria-label="exclusion.label"
            :checked="!excluded.includes(exclusion.key)"
            :data-testid="`ai-offer-${exclusion.key}`"
            @change="emit('offer', exclusion.key)"
          />
          <span>
            <span class="ai-opts__label">{{ exclusion.label }}</span>
            <span class="ai-opts__hint">{{ exclusion.help }}</span>
          </span>
        </label>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.browser }}</h4>
        <label class="ai-opts__row">
          <input
            type="checkbox"
            :aria-label="OPTIONS_TEXT.webmcp"
            :checked="webmcp && webmcpAvailable"
            :disabled="!webmcpAvailable"
            data-testid="ai-toggle-webmcp"
            @change="emit('webmcp', !webmcp)"
          />
          <span>
            <span class="ai-opts__label">{{ OPTIONS_TEXT.webmcp }}</span>
            <span class="ai-opts__hint">{{
              webmcpAvailable
                ? OPTIONS_TEXT.webmcpHelp
                : OPTIONS_TEXT.webmcpMissing
            }}</span>
          </span>
        </label>
      </section>

      <section class="ai-opts__section">
        <h4 class="ai-opts__heading">{{ OPTIONS_TEXT.direction }}</h4>
        <label class="ai-opts__row">
          <input
            type="checkbox"
            :aria-label="OPTIONS_TEXT.rtl"
            :checked="rtl"
            data-testid="ai-toggle-rtl"
            @change="emit('rtl', !rtl)"
          />
          <span>
            <span class="ai-opts__label">{{ OPTIONS_TEXT.rtl }}</span>
            <span class="ai-opts__hint">{{ OPTIONS_TEXT.rtlHelp }}</span>
          </span>
        </label>
      </section>
    </div>

    <footer class="ai-opts__foot">
      <button
        type="button"
        class="ai-opts__reset"
        data-testid="ai-reset"
        @click="emit('reset')"
      >
        {{ OPTIONS_TEXT.reset }}
      </button>
      <button
        type="button"
        class="ai-opts__done"
        data-testid="ai-demo-options-done"
        @click="emit('close')"
      >
        {{ OPTIONS_TEXT.done }}
      </button>
    </footer>
  </dialog>
</template>

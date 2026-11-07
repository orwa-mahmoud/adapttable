<script setup lang="ts">
import { onScopeDispose, shallowRef, watch } from "vue";

import { FRAMEWORK_STORAGE_KEY } from "../../../../../scripts/framework-navigation.mjs";
import {
  canReplaceDemo,
  navigateDemo,
  replaceDemoUrl,
} from "../../angular/demoTransitions.mjs";
import {
  adaptersOf,
  docsUrl,
  featuresOf,
  kitAccent,
  pathOf,
  type ShowcaseAdapter,
} from "../../matrix/content";
import { SHOWCASE_PRESENTATION } from "../matrix/data";
import MoreExamples from "../matrix/MoreExamples.vue";
import { vueHref } from "../matrix/routes";
import { useShowcaseKit } from "../matrix/showcaseKit";
import ShowcaseNav from "../matrix/ShowcaseNav.vue";
import DemoTable from "./DemoTable.vue";

const props = defineProps<{ adapter: ShowcaseAdapter; lab: boolean }>();
const kit = useShowcaseKit();
const adapters = adaptersOf("vue").filter((adapter) => adapter.built);
const query = new URLSearchParams(window.location.search);
const current = (key: string, initial: string) => query.get(key) ?? initial;
const groups = [
  {
    key: "mode",
    label: "Data",
    value: current("mode", "frontend"),
    options: [
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
    ],
  },
  {
    key: "locale",
    label: "Locale",
    value: SHOWCASE_PRESENTATION.locale,
    options: [
      { value: "en", label: "English" },
      { value: "ar", label: "العربية" },
    ],
  },
  {
    key: "density",
    label: "Density",
    value: current("density", "comfortable"),
    options: [
      { value: "comfortable", label: "Comfortable" },
      { value: "compact", label: "Compact" },
    ],
  },
  {
    key: "mobile",
    label: "Layout",
    value: current("mobile", "off"),
    options: [
      { value: "off", label: "Responsive" },
      { value: "on", label: "Cards" },
    ],
  },
];
const toggles = [
  { key: "grouping", label: "Grouping", initial: false },
  { key: "editing", label: "Editing", initial: true },
  { key: "selection", label: "Row selection", initial: true },
  { key: "motion", label: "Motion", initial: true },
  ...(props.lab
    ? [
        { key: "row-reorder", label: "Row reordering", initial: false },
        { key: "row-actions", label: "Row actions", initial: false },
        { key: "summary", label: "Summary row", initial: false },
      ]
    : []),
];
const dark = shallowRef(false);
const setupCopyStatus = shallowRef("");
const setupCommand = () =>
  `npx @adapttable/cli init --kit ${props.adapter.key}`;
async function copySetup(): Promise<void> {
  try {
    await navigator.clipboard.writeText(setupCommand());
    setupCopyStatus.value = "Copied";
  } catch {
    setupCopyStatus.value = "Copy unavailable. Select the command to copy.";
  }
}
try {
  const requestedTheme = query.get("theme");
  dark.value =
    requestedTheme === "dark" || requestedTheme === "light"
      ? requestedTheme === "dark"
      : localStorage.getItem("adapttable-demo-theme") === "dark";
  localStorage.setItem(FRAMEWORK_STORAGE_KEY, "vue");
} catch {
  /* Storage is optional. */
}
watch(
  dark,
  (value) => {
    document.documentElement.dataset.theme = value ? "dark" : "light";
    document.documentElement.classList.toggle("dark", value);
    document.documentElement.style.colorScheme = value ? "dark" : "light";
    kit.setDark?.(value);
    const url = new URL(window.location.href);
    const theme = value ? "dark" : "light";
    if (url.searchParams.get("theme") !== theme) {
      url.searchParams.set("theme", theme);
      replaceDemoUrl(url);
    }
    try {
      localStorage.setItem("adapttable-demo-theme", value ? "dark" : "light");
    } catch {
      /* Storage is optional. */
    }
  },
  { immediate: true }
);
const dialog = shallowRef<HTMLDialogElement | null>(null);
const trigger = shallowRef<HTMLButtonElement | null>(null);
const pending = shallowRef<Record<string, string>>({});
const optionValue = (key: string, initial: boolean) =>
  pending.value[key] ?? current(key, initial ? "on" : "off");
const open = () => {
  pending.value = {};
  dialog.value?.showModal();
};
function applyOptions(): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(pending.value))
    url.searchParams.set(key, value);
  if (Object.keys(pending.value).length) {
    if (!canReplaceDemo()) return;
    close();
    navigateDemo(url);
  } else close();
}
function stageOption(event: Event): void {
  const input = event.target;
  if (input instanceof HTMLInputElement)
    pending.value = {
      ...pending.value,
      [input.name]: input.checked ? "on" : "off",
    };
}
const close = () => {
  dialog.value?.close();
  trigger.value?.focus();
};
onScopeDispose(() => dialog.value?.close());
function setOption(key: string, value: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  if (key === "kit") url.searchParams.delete("kit-unavailable");
  if (key === "locale") url.searchParams.delete("dir");
  if (key === "mode") {
    for (const name of [...url.searchParams.keys()])
      if (name.startsWith("vue-live.") || name.startsWith("vue-lab."))
        url.searchParams.delete(name);
  }
  navigateDemo(url);
}
function change(event: Event): void {
  const input = event.target;
  if (!(
    input instanceof HTMLInputElement || input instanceof HTMLSelectElement
  ))
    return;
  let value = input.value;
  if (input instanceof HTMLInputElement && input.type === "checkbox")
    value = input.checked ? "on" : "off";
  setOption(input.name, value);
}
function reset(): void {
  const url = new URL(
    vueHref(props.lab ? "all-options" : ""),
    window.location.origin
  );
  url.searchParams.set("kit", props.adapter.key);
  if (!canReplaceDemo()) return;
  close();
  navigateDemo(url);
}
</script>

<template>
  <ShowcaseNav
    :active="lab ? 'all-options' : 'demo'"
    :kit="adapter"
    :dark="dark"
    :before-navigate="canReplaceDemo"
    @toggle-dark="dark = !dark"
  />
  <main
    class="shell vue-demo mx-vue"
    :dir="SHOWCASE_PRESENTATION.locale === 'ar' ? 'rtl' : 'ltr'"
  >
    <header class="vue-demo__intro" dir="auto">
      <h1>
        {{
          lab
            ? "Every option. Your combination."
            : "Same features. Any kit. Watch it switch."
        }}
      </h1>
      <p>
        {{
          lab
            ? "Compose filters, editing, selection, grouping and row controls with the selected Vue adapter."
            : "One dataset and one feature set, rendered by each real Vue adapter."
        }}
      </p>
    </header>
    <div
      class="adapterbar demo-kit-cards"
      :style="{ '--demo-kit-count': adapters.length }"
      role="group"
      aria-label="Vue adapter"
    >
      <button
        v-for="item in adapters"
        :key="item.key"
        type="button"
        class="adtab"
        :class="{ 'is-on': item.key === adapter.key }"
        :aria-pressed="item.key === adapter.key"
        :title="item.label + ' — ' + item.blurb"
        :style="{ '--c': kitAccent(item, dark) }"
        :data-demo-control="'kit-' + item.key"
        @click="setOption('kit', item.key)"
      >
        <span class="adtab__dot" aria-hidden="true"></span>
        <span class="adtab__l"
          ><strong>{{ item.label }}</strong
          ><small>{{ item.blurb }}</small></span
        >
      </button>
    </div>
    <section class="demo-setup" aria-label="Vue setup">
      <div class="demo-setup__main">
        <div class="demo-setup__command">
          <span aria-hidden="true">$</span><code>{{ setupCommand() }}</code>
          <button
            type="button"
            aria-label="Copy setup command"
            @click="copySetup"
          >
            {{ setupCopyStatus === "Copied" ? "Copied" : "Copy" }}
          </button>
        </div>
        <a class="demo-setup__docs" :href="docsUrl('getting-started', 'vue')"
          >Setup and providers</a
        >
      </div>
      <p class="demo-setup__feedback" role="status">{{ setupCopyStatus }}</p>
      <details class="demo-setup__direct">
        <summary>Direct installation</summary>
        <code>pnpm add {{ adapter.pkg }}</code>
        <p>
          Run the CLI in a Vue/Vite project, or install directly and follow the
          kit's provider and stylesheet setup. Nuxt applications use the Nuxt
          setup guide.
        </p>
      </details>
    </section>
    <section
      class="controls angular-options demo-preferences"
      aria-label="Demo preferences"
    >
      <fieldset
        v-for="group in groups"
        :key="group.key"
        class="angular-choice"
        :aria-label="group.label"
      >
        <legend>{{ group.label }}</legend>
        <div class="angular-choice__options">
          <label v-for="option in group.options" :key="option.value"
            ><input
              type="radio"
              :name="group.key"
              :data-demo-control="group.key + '-' + option.value"
              :value="option.value"
              :checked="group.value === option.value"
              @change="change"
            /><span>{{ option.label }}</span></label
          >
        </div>
      </fieldset>
      <label class="angular-select"
        >Filters<select
          name="filters"
          data-demo-control="filters"
          :value="current('filters', 'popover')"
          @change="change"
        >
          <option value="popover">Popover</option>
          <option value="drawer">Drawer</option>
          <option value="header">Header</option>
        </select></label
      >
      <div class="angular-options-switches">
        <label
          v-for="toggle in toggles.slice(0, 4)"
          :key="toggle.key"
          class="vue-demo__toggle"
          ><input
            type="checkbox"
            :name="toggle.key"
            :data-demo-control="toggle.key"
            :checked="
              current(toggle.key, toggle.initial ? 'on' : 'off') === 'on'
            "
            :disabled="
              ['server', 'backend'].includes(current('mode', 'frontend')) &&
              ['grouping', 'editing', 'selection'].includes(toggle.key)
            "
            @change="change"
          />{{ toggle.label }}</label
        >
      </div>
    </section>
    <div v-if="lab" class="vue-demo__options">
      <div>
        <strong>Table options</strong>
        <p>
          Choose the features to compose. Explore the linked examples for
          specialized views.
        </p>
      </div>
      <button
        ref="trigger"
        type="button"
        class="nav__docs"
        data-demo-control="lab-options"
        @click="open"
      >
        Configure options
      </button>
    </div>
    <dialog
      ref="dialog"
      class="vue-demo__dialog"
      aria-label="Feature Lab controls"
      @cancel="close"
    >
      <header>
        <h2>Feature Lab controls</h2>
        <button type="button" @click="close">Cancel</button>
      </header>
      <label
        v-for="toggle in toggles"
        :key="toggle.key"
        class="vue-demo__toggle"
        ><input
          type="checkbox"
          :name="toggle.key"
          :checked="optionValue(toggle.key, toggle.initial) === 'on'"
          :disabled="
            current('mode', 'frontend') === 'server' &&
            ['grouping', 'editing', 'row-reorder', 'row-actions'].includes(
              toggle.key
            )
          "
          @change="stageOption"
        />{{ toggle.label }}</label
      >
      <footer>
        <button type="button" @click="reset">Reset options</button>
        <button type="button" @click="applyOptions">Apply options</button>
      </footer>
    </dialog>
    <component
      :is="kit.Root"
      v-if="kit.Root"
      :dark="dark"
      :dir="SHOWCASE_PRESENTATION.dir"
      ><DemoTable :lab="lab"
    /></component>
    <DemoTable v-else :lab="lab" />
    <section class="mx-section">
      <h2>Explore {{ adapter.label }} features</h2>
      <nav class="mx-rail" aria-label="Vue feature examples">
        <a
          v-for="feature in featuresOf(adapter)"
          :key="feature.slug"
          :href="vueHref(`${pathOf(adapter)}/${feature.slug}`)"
          >{{ feature.label }}</a
        >
      </nav>
    </section>
    <MoreExamples :kit-key="adapter.key" />
    <section class="vue-demo__discovery">
      <h2>Build a connected workspace</h2>
      <p>
        Explore an order desk, dispatch planning and revenue review, with shared
        selection and host-owned updates.
      </p>
      <a :href="vueHref('unstyled/workspace')">Order workspace</a>
      <a :href="vueHref('unstyled/navigation')">Keyboard navigation and find</a>
      <a :href="vueHref('unstyled/actions')">Actions and export controls</a>
    </section>
  </main>
</template>

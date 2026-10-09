<script setup lang="ts">
/**
 * One page component for every Vue kit's landing and feature pages — the Vue
 * counterpart of `src/matrix/MatrixPage.tsx` and the Angular matrix page.
 *
 * The words come from `matrix.mjs` through `../../matrix/content`, the demo
 * from `bodies/`, and the kit's accent from the adapter's own token. The
 * chrome is the page's own; everything under the seam is the kit.
 */
import {
  type Component,
  computed,
  onScopeDispose,
  shallowRef,
  watch,
} from "vue";

import { FRAMEWORK_STORAGE_KEY } from "../../../../../scripts/framework-navigation.mjs";
import {
  docsUrl,
  featuresOf,
  fillTemplate,
  headFor,
  introFor,
  kitAccent,
  LANDING,
  landingIntro,
  type MatrixFeature,
  type MatrixRoute,
  otherKitsOf,
  pathOf,
  SITE_HOME,
  snippetFor,
} from "../../matrix/content";
import AccessibilityBody from "./bodies/AccessibilityBody.vue";
import AggregationBody from "./bodies/AggregationBody.vue";
import AiBody from "./bodies/AiBody.vue";
import ColumnGroupsBody from "./bodies/ColumnGroupsBody.vue";
import ColumnsBody from "./bodies/ColumnsBody.vue";
import EditingBody from "./bodies/EditingBody.vue";
import ExportBody from "./bodies/ExportBody.vue";
import FilteringBody from "./bodies/FilteringBody.vue";
import FormulasBody from "./bodies/FormulasBody.vue";
import GroupingBody from "./bodies/GroupingBody.vue";
import LandingTable from "./bodies/LandingTable.vue";
import MobileCardsBody from "./bodies/MobileCardsBody.vue";
import NestedTablesBody from "./bodies/NestedTablesBody.vue";
import PivotBody from "./bodies/PivotBody.vue";
import RealtimeBody from "./bodies/RealtimeBody.vue";
import RowReorderingBody from "./bodies/RowReorderingBody.vue";
import RowsBody from "./bodies/RowsBody.vue";
import RtlBody from "./bodies/RtlBody.vue";
import SavedViewsBody from "./bodies/SavedViewsBody.vue";
import ScaleBody from "./bodies/ScaleBody.vue";
import SelectionBody from "./bodies/SelectionBody.vue";
import TreeBody from "./bodies/TreeBody.vue";
import { SHOWCASE_PRESENTATION } from "./data";
import { demoFileHref, vueHref } from "./routes";
import { useShowcaseKit } from "./showcaseKit";
import ShowcaseNav from "./ShowcaseNav.vue";
import ShowcaseWordmark from "./ShowcaseWordmark.vue";

/** Feature slug to the demo that page shows. */
const FEATURE_BODIES: Readonly<Record<string, Component>> = {
  ai: AiBody,
  columns: ColumnsBody,
  aggregation: AggregationBody,
  pivot: PivotBody,
  formulas: FormulasBody,
  rtl: RtlBody,
  realtime: RealtimeBody,
  accessibility: AccessibilityBody,
  filtering: FilteringBody,
  selection: SelectionBody,
  "row-reordering": RowReorderingBody,
  editing: EditingBody,
  grouping: GroupingBody,
  export: ExportBody,
  scale: ScaleBody,
  "mobile-cards": MobileCardsBody,
  "saved-views": SavedViewsBody,
  tree: TreeBody,
  "nested-tables": NestedTablesBody,
  rows: RowsBody,
  "column-groups": ColumnGroupsBody,
};

/** Where every showcase page keeps the reader's theme between pages. */
const THEME_KEY = "adapttable-demo-theme";

const readStoredTheme = (): boolean => {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    // Storage can be unavailable (private mode): the page opens light.
    return false;
  }
};

const storeTheme = (dark: boolean): void => {
  try {
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage can be unavailable (private mode): the theme simply does not
    // persist across pages then.
  }
};

/**
 * A paragraph of matrix copy as runs of text and code: `backticked` spans are
 * code — the convention the served HTML uses.
 */
const leadParts = (text: string): { code: boolean; text: string }[] =>
  text
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("`") && part.endsWith("`")
        ? { code: true, text: part.slice(1, -1) }
        : { code: false, text: part }
    );

const props = defineProps<{ route: MatrixRoute }>();

const kit = useShowcaseKit();
const adapter = props.route.adapter;
const feature = props.route.feature;
const path = pathOf(adapter);
const active = feature ? `${path}/${feature.slug}` : path;
const presentation = SHOWCASE_PRESENTATION;
const dark = shallowRef(readStoredTheme());
const copied = shallowRef<"code" | "install" | null>(null);
const gettingStarted = docsUrl("getting-started", "vue");
const unavailable = new URLSearchParams(window.location.search).get(
  "unavailable"
);
const fill = (text: string): string =>
  fillTemplate(text, adapter, props.route.framework);
const head = (current: MatrixFeature) => headFor(current, adapter);
const accent = computed(() => kitAccent(adapter, dark.value));
const features = featuresOf(adapter);
const otherKits = otherKitsOf(adapter);

/** The heading around the kit's name, which is set in its accent. */
const heading = (() => {
  const text = fill(feature ? head(feature).h1 : LANDING.h1);
  const at = text.indexOf(adapter.label);
  return at === -1
    ? { before: text, after: "" }
    : {
        before: text.slice(0, at),
        after: text.slice(at + adapter.label.length),
      };
})();
const importLine = `import { DataTable } from "${adapter.pkg}";`;
const intro = (
  feature ? introFor(feature, adapter) : landingIntro(adapter)
).map(fill);
const code = feature
  ? fill(snippetFor(feature, adapter, props.route.framework))
  : "";
const note = feature ? feature.notes[adapter.key] : undefined;
const body: Component = (() => {
  if (!feature) return LandingTable;
  const found = FEATURE_BODIES[feature.slug];
  if (!found) throw new Error(`No Vue demo body for feature "${feature.slug}"`);
  return found;
})();

try {
  window.localStorage.setItem(FRAMEWORK_STORAGE_KEY, "vue");
} catch {
  // Storage is optional.
}
watch(
  dark,
  (value) => {
    document.documentElement.dataset.theme = value ? "dark" : "light";
    document.documentElement.style.colorScheme = value ? "dark" : "light";
    document.documentElement.classList.toggle("dark", value);
    kit.setDark?.(value);
    storeTheme(value);
  },
  { immediate: true }
);

let copyTimer: number | undefined;
onScopeDispose(() => window.clearTimeout(copyTimer));

/** Reload the selected label set while retaining the table's URL state. */
function changeLocale(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) return;
  const locale = event.target.value;
  if (locale !== "en" && locale !== "ar") return;
  const url = new URL(window.location.href);
  url.searchParams.set("locale", locale);
  url.searchParams.delete("dir");
  window.location.assign(url.href);
}

/** Copy text to the clipboard and say so on the button that did it. */
function copy(which: "code" | "install", text: string): void {
  void navigator.clipboard.writeText(text);
  copied.value = which;
  window.clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => {
    copied.value = null;
  }, 1400);
}
</script>

<template>
  <ShowcaseNav
    :active="active"
    :kit="adapter"
    :dark="dark"
    @toggle-dark="dark = !dark"
  />

  <main>
    <p v-if="unavailable" class="shell" role="status">
      This feature is not available in this Vue kit. Explore the supported
      examples below.
    </p>
    <div
      class="mx mx-ng mx-vue shell"
      :class="{ 'mx-ng--unstyled': adapter.key === 'vue-unstyled' }"
      :data-vue-kit="adapter.key"
      :data-adapttable-kit="adapter.key"
      :style="{ '--kit': accent, '--c': accent }"
    >
      <header class="mx-hero" :class="{ 'mx-hero--solo': feature }">
        <div class="mx-hero__body">
          <p class="mx-kicker">
            <template v-if="feature">
              <a :href="vueHref(path)">AdaptTable for {{ adapter.label }}</a>
              <span class="mx-kicker__sep">/</span>
              {{ head(feature).label }}
            </template>
            <span v-else class="mx-kicker__pkg">{{ adapter.pkg }}</span>
          </p>
          <h1 class="mx-title">
            {{ heading.before }}<em>{{ adapter.label }}</em
            >{{ heading.after }}
          </h1>
          <p v-for="(line, index) in intro" :key="index" class="mx-lead">
            <template v-for="(part, at) in leadParts(line)" :key="at">
              <code v-if="part.code">{{ part.text }}</code>
              <template v-else>{{ part.text }}</template>
            </template>
          </p>
          <div v-if="!feature" class="mx-actions">
            <a
              class="mx-btn mx-btn--primary"
              :href="gettingStarted"
              target="_blank"
              rel="noreferrer"
              >Get started</a
            >
          </div>
        </div>
        <aside v-if="!feature" class="mx-plate">
          <div class="mx-plate__head">
            <span>{{ adapter.pkg }}</span>
            <button
              type="button"
              class="mx-code__copy"
              :class="{ 'is-done': copied === 'install' }"
              @click="copy('install', adapter.install)"
            >
              {{ copied === "install" ? "Copied" : "Copy install" }}
            </button>
          </div>
          <div class="mx-plate__row">
            <span class="mx-plate__key">Install</span>
            <code class="mx-plate__val">{{ adapter.install }}</code>
          </div>
          <div class="mx-plate__row">
            <span class="mx-plate__key">Import</span>
            <code class="mx-plate__val">{{ importLine }}</code>
          </div>
          <div class="mx-plate__row">
            <span class="mx-plate__key">Peer</span>
            <code class="mx-plate__val">{{ adapter.peer }}</code>
          </div>
        </aside>
      </header>

      <div v-if="feature" class="mx-brief">
        <div class="mx-code">
          <div class="mx-code__bar">
            <span>{{ head(feature).label }} · {{ adapter.label }}</span>
            <button
              type="button"
              class="mx-code__copy"
              :class="{ 'is-done': copied === 'code' }"
              @click="copy('code', code)"
            >
              {{ copied === "code" ? "Copied" : "Copy" }}
            </button>
          </div>
          <pre><code>{{ code }}</code></pre>
        </div>
        <div class="mx-brief__side">
          <div v-if="note" class="mx-note">
            <span class="mx-note__key">In {{ adapter.label }}</span>
            <p>{{ note }}</p>
          </div>
          <div class="mx-refs">
            <span class="mx-refs__key">Reference</span>
            <div class="mx-refs__list">
              <a
                v-for="slug in feature.docs"
                :key="slug"
                :href="docsUrl(slug, 'vue')"
                target="_blank"
                rel="noreferrer"
                >{{ slug.replaceAll("-", " ") }}</a
              >
            </div>
          </div>
        </div>
      </div>

      <div class="angular-presentation">
        <fieldset class="angular-choice">
          <legend>Locale</legend>
          <div class="angular-choice__options">
            <label>
              <input
                type="radio"
                name="locale"
                value="en"
                :checked="presentation.locale === 'en'"
                data-demo-control="locale"
                @change="changeLocale"
              />
              <span>English</span>
            </label>
            <label>
              <input
                type="radio"
                name="locale"
                value="ar"
                :checked="presentation.locale === 'ar'"
                data-demo-control="locale"
                @change="changeLocale"
              />
              <span>العربية</span>
            </label>
          </div>
        </fieldset>
      </div>

      <p class="mx-seam">
        rendered by <span class="mx-seam__pkg">{{ adapter.pkg }}</span>
      </p>
      <component
        :is="kit.Root"
        v-if="kit.Root"
        :dark="dark"
        :dir="presentation.dir"
      >
        <component :is="body" />
      </component>
      <component :is="body" v-else />

      <section v-if="feature" class="mx-section">
        <div class="mx-section__head">
          <h2 class="mx-h2">The rest of {{ adapter.label }}</h2>
          <p class="mx-section__lead">
            Same engine, same props, one page each.
          </p>
        </div>
        <nav class="mx-rail" :aria-label="`${adapter.label} features`">
          <a
            v-for="item in features"
            :key="item.slug"
            :href="vueHref(`${path}/${item.slug}`)"
            :aria-current="item.slug === feature.slug ? 'page' : undefined"
            >{{ head(item).label }}</a
          >
        </nav>
      </section>
      <template v-else>
        <section class="mx-section">
          <div class="mx-section__head">
            <h2 class="mx-h2">{{ fill(LANDING.gridTitle) }}</h2>
            <p class="mx-section__lead">{{ fill(LANDING.gridLead) }}</p>
          </div>
          <div class="mx-grid">
            <a
              v-for="item in features"
              :key="item.slug"
              class="mx-card"
              :href="vueHref(`${path}/${item.slug}`)"
            >
              <span class="mx-card__name">{{ head(item).label }}</span>
              <p class="mx-card__desc">{{ fill(head(item).card) }}</p>
              <span class="mx-card__path">/{{ path }}/{{ item.slug }}/</span>
            </a>
          </div>
        </section>
        <section v-if="otherKits.length > 0" class="mx-section">
          <div class="mx-section__head">
            <h2 class="mx-h2">{{ fill(LANDING.kitsTitle) }}</h2>
            <p class="mx-section__lead">{{ fill(LANDING.kitsLead) }}</p>
          </div>
          <div class="mx-kits">
            <a
              v-for="other in otherKits"
              :key="other.key"
              class="mx-kit"
              :href="vueHref(pathOf(other))"
            >
              <span class="mx-kit__name">{{ other.label }}</span>
              <span class="mx-kit__blurb">{{ other.blurb }}</span>
            </a>
          </div>
        </section>
      </template>
    </div>
  </main>

  <footer class="foot">
    <div class="foot__inner shell">
      <div class="foot__lead">
        <ShowcaseWordmark :href="SITE_HOME" />
        <p>Headless freedom, batteries included.</p>
        <a :href="demoFileHref('third-party-notices.txt')"
          >Third-party notices</a
        >
      </div>
    </div>
  </footer>
</template>

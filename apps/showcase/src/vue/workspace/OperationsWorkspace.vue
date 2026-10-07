<script setup lang="ts">
import "./workspace.css";

import {
  type Component,
  computed,
  onScopeDispose,
  shallowRef,
  watch,
} from "vue";

import { docsUrl } from "../../matrix/content";
import { workspaceCopy } from "./copy";
import { money, type Order } from "./data";
import { useWorkspacePresentation, type WorkspaceView } from "./presentation";
import { provideWorkspaceSession } from "./session";
import WorkspaceDiscovery from "./WorkspaceDiscovery.vue";

const session = provideWorkspaceSession();
const presentation = useWorkspacePresentation();
const locale = computed({
  get: () => presentation.state.value.locale,
  set: (value: "en" | "ar") => presentation.navigate({ locale: value }),
});
const layout = computed({
  get: () => presentation.state.value.layout,
  set: (value: "auto" | "cards") => presentation.navigate({ layout: value }),
});
const dark = computed({
  get: () => presentation.state.value.dark,
  set: (value: boolean) => presentation.navigate({ dark: value }),
});
const active = computed({
  get: () => presentation.state.value.view,
  set: (value: WorkspaceView) => presentation.navigate({ view: value }),
});
const rows = computed(() => session.state.value.rows);
const recoveryFailed = shallowRef(false);
const text = computed(() => workspaceCopy[locale.value]);
const views = computed(() => [
  { key: "orders" as const, label: text.value.orders },
  { key: "dispatch" as const, label: text.value.dispatch },
  { key: "revenue" as const, label: text.value.revenue },
]);
const reviewCount = computed(
  () => rows.value.filter((row) => row.status === "Review").length
);
const total = computed(() =>
  rows.value.reduce((sum, row) => sum + row.amount, 0)
);
const current = shallowRef<Component>();
const loading = shallowRef(false);
const failed = shallowRef(false);
const loaded = new Map<WorkspaceView, Component>();
const loaders = {
  orders: () => import("./OrderDesk.vue"),
  dispatch: () => import("./DispatchPlan.vue"),
  revenue: () => import("./RevenueReview.vue"),
};
let request = 0;
async function loadView(view: WorkspaceView): Promise<void> {
  const version = ++request;
  const cached = loaded.get(view);
  current.value = cached;
  failed.value = false;
  recoveryFailed.value = false;
  loading.value = !cached;
  if (cached) return;
  try {
    const module = await loaders[view]();
    loaded.set(view, module.default);
    if (version === request) current.value = module.default;
  } catch {
    if (version === request) failed.value = true;
  } finally {
    if (version === request) loading.value = false;
  }
}
watch(
  active,
  (view) => {
    void loadView(view);
  },
  { immediate: true }
);
onScopeDispose(() => {
  request++;
});
function retryView(): void {
  // Failed ES-module requests can remain cached. Reload only after a durable host checkpoint.
  if (!session.checkpoint()) {
    recoveryFailed.value = true;
    return;
  }
  window.location.reload();
}
function updateRows(next: readonly Order[]): void {
  session.updateRows(next);
}
function restoreRows(): void {
  session.restoreRows();
}
const guidance = computed(
  () =>
    ({
      orders: text.value.ordersHint,
      dispatch: text.value.dispatchHint,
      revenue: text.value.revenueHint,
    })[active.value]
);
const keyboard = computed(
  () =>
    ({
      orders: text.value.ordersKeys,
      dispatch: text.value.dispatchKeys,
      revenue: text.value.revenueKeys,
    })[active.value]
);
</script>
<template>
  <div
    class="vue-workspace"
    :class="{ 'is-dark': dark }"
    :dir="locale === 'ar' ? 'rtl' : 'ltr'"
    :lang="locale"
  >
    <a class="workspace-skip" href="#workspace-content">{{ text.nav }}</a>
    <header class="workspace-nav">
      <div class="workspace-shell workspace-nav__inner">
        <a
          class="workspace-brand"
          href="../"
          aria-label="AdaptTable Vue Unstyled"
          ><svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="1"
              y="1"
              width="24"
              height="24"
              rx="7"
              fill="currentColor"
            />
            <path
              d="M7 8h12M7 13h12M7 18h7M11 7v12"
              stroke="var(--ws-surface)"
              stroke-width="1.7"
              stroke-linecap="round"
            /></svg
          >{{ text.brand }}<span>Vue</span></a
        >
        <div class="workspace-preferences">
          <div class="workspace-preference">
            <span>{{ text.language }}</span>
            <div
              class="workspace-choice"
              role="group"
              :aria-label="text.language"
            >
              <button
                type="button"
                lang="en"
                :aria-pressed="locale === 'en'"
                @click="locale = 'en'"
              >
                English
              </button>
              <button
                type="button"
                lang="ar"
                :aria-pressed="locale === 'ar'"
                @click="locale = 'ar'"
              >
                العربية
              </button>
            </div>
          </div>
          <div class="workspace-preference">
            <span>{{ text.layout }}</span>
            <div
              class="workspace-choice"
              role="group"
              :aria-label="text.layout"
            >
              <button
                type="button"
                :aria-pressed="layout === 'auto'"
                @click="layout = 'auto'"
              >
                {{ text.auto }}
              </button>
              <button
                type="button"
                :aria-pressed="layout === 'cards'"
                @click="layout = 'cards'"
              >
                {{ text.cards }}
              </button>
            </div>
          </div>
          <button
            class="workspace-theme"
            type="button"
            :aria-label="text.theme"
            :aria-pressed="dark"
            @click="dark = !dark"
          >
            <svg
              viewBox="0 0 24 24"
              width="19"
              height="19"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              aria-hidden="true"
            >
              <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
    <main id="workspace-content" class="workspace-shell" tabindex="-1">
      <section class="workspace-hero">
        <div>
          <p class="workspace-eyebrow">{{ text.eyebrow }}</p>
          <h1>{{ text.title }}</h1>
          <p class="workspace-hero__lead">{{ text.lead }}</p>
          <p class="workspace-notice">{{ text.notice }}</p>
        </div>
        <dl class="workspace-metrics">
          <div>
            <dt>{{ text.total }}</dt>
            <dd>
              {{ rows.length
              }}<span class="workspace-metric-decoration" aria-hidden="true"
                >↗</span
              >
            </dd>
          </div>
          <div>
            <dt>{{ text.needsReview }}</dt>
            <dd>
              {{ reviewCount
              }}<span class="workspace-metric-dot" aria-hidden="true"></span>
            </dd>
          </div>
          <div>
            <dt>{{ text.value }}</dt>
            <dd>{{ money(total, locale) }}</dd>
          </div>
        </dl>
      </section>
      <div class="workspace-tabs" role="group" :aria-label="text.nav">
        <button
          v-for="(view, index) in views"
          :key="view.key"
          type="button"
          :aria-pressed="active === view.key"
          :data-workspace-view="view.key"
          @click="active = view.key"
        >
          <span aria-hidden="true">0{{ index + 1 }}</span
          >{{ view.label }}
        </button>
      </div>
      <aside class="workspace-guide">
        <div>
          <strong>{{ text.guidance }}</strong>
          <p>{{ guidance }}</p>
        </div>
        <details>
          <summary>{{ text.keyboard }}</summary>
          <p>{{ keyboard }}</p>
        </details>
      </aside>
      <WorkspaceDiscovery :view="active" :locale="locale" />
      <div class="workspace-stage" :aria-busy="loading">
        <KeepAlive
          ><component
            :is="current"
            v-if="current"
            :key="active"
            :locale="locale"
            :mobile="layout === 'cards' ? true : undefined"
            :rows="rows"
            @update="updateRows"
            @restore="restoreRows"
        /></KeepAlive>
        <div v-if="loading" class="workspace-loading" role="status">
          <span class="workspace-loading__mark" aria-hidden="true"></span
          ><strong>{{ text.loading }}</strong>
        </div>
        <div
          v-else-if="failed"
          class="workspace-empty workspace-error"
          role="alert"
        >
          <strong>{{ text.failure }}</strong>
          <p>
            {{ recoveryFailed ? text.recoveryBlocked : text.recoverySaved }}
          </p>
          <button type="button" @click="retryView">{{ text.retry }}</button>
        </div>
      </div>
      <footer class="workspace-footer">
        <div>
          <strong>{{ text.brand }}</strong>
          <p>{{ text.footer }}</p>
        </div>
        <nav :aria-label="text.help">
          <a href="../">{{ text.examples }}</a
          ><a :href="docsUrl('getting-started', 'vue')">{{ text.docs }}</a>
          <details>
            <summary>{{ text.help }}</summary>
            <p>{{ text.about }}</p>
          </details>
        </nav>
      </footer>
    </main>
  </div>
</template>

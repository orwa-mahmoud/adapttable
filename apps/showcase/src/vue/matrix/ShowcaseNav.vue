<script setup lang="ts">
/** The Vue pages' header: kits, the current kit's features, and the site. */
import { nextTick, onMounted, onScopeDispose, shallowRef } from "vue";

import { FRAMEWORK_STORAGE_KEY } from "../../../../../scripts/framework-navigation.mjs";
import { SITE_EVENT, track } from "../../../../../scripts/site-events.mjs";
import {
  adaptersOf,
  docsUrl,
  featuresOf,
  kitAccent,
  pathOf,
  type ShowcaseAdapter,
  SITE_HOME,
} from "../../matrix/content";
import { navigationMenuShift } from "../../navGeometry";
import { createNavMenuInteraction } from "../../navMenuInteraction";
import { frameworkDemoHref, vueHref } from "./routes";
import ShowcaseWordmark from "./ShowcaseWordmark.vue";

const props = defineProps<{
  /** The page this is: a kit's path, or its path and a feature slug. */
  active: string;
  /** The kit whose pages these are. */
  kit: ShowcaseAdapter;
  dark: boolean;
  beforeNavigate?: () => boolean;
}>();
const emit = defineEmits<{ toggleDark: [] }>();

const adapters = adaptersOf("vue").filter((adapter) => adapter.built);
const features = featuresOf(props.kit);
const kitPath = pathOf(props.kit);
const demoHref = (lab = false) => {
  const url = new URL(
    vueHref(lab ? "all-options" : ""),
    window.location.origin
  );
  url.searchParams.set("kit", props.kit.key);
  return url.pathname + url.search;
};
const unavailableKit = new URLSearchParams(window.location.search).get(
  "kit-unavailable"
);
const docs = docsUrl("getting-started", "vue");
const repo = "https://github.com/orwa-mahmoud/adapttable";
const open = shallowRef(false);
const shift = shallowRef(0);
const root = shallowRef<HTMLElement | null>(null);
let pendingFocus: number | null = null;
let frame = 0;
const menu = createNavMenuInteraction(
  (value) => {
    open.value = value;
    layoutMenu();
  },
  () =>
    root.value
      ?.querySelector(".nav__group")
      ?.contains(document.activeElement) ?? false
);

const menuItems = (): HTMLAnchorElement[] =>
  Array.from(
    root.value?.querySelectorAll<HTMLAnchorElement>(".nav__menu a") ?? []
  );

function focusItem(index: number): void {
  const items = menuItems();
  if (!items.length) return;
  items[((index % items.length) + items.length) % items.length]?.focus();
}

function layoutMenu(): void {
  cancelAnimationFrame(frame);
  if (!open.value) {
    shift.value = 0;
    return;
  }
  frame = requestAnimationFrame(() => {
    const box = root.value
      ?.querySelector(".nav__menu")
      ?.getBoundingClientRect();
    if (!box || !open.value) return;
    shift.value = navigationMenuShift(
      { left: box.left - shift.value, right: box.right - shift.value },
      document.documentElement.clientWidth
    );
    if (pendingFocus !== null) {
      focusItem(pendingFocus);
      pendingFocus = null;
    }
  });
}

function toggleMenu(): void {
  menu.toggle();
}

function triggerKey(event: KeyboardEvent): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const index = event.key === "ArrowDown" ? 0 : -1;
  if (open.value) {
    menu.hold();
    focusItem(index);
    return;
  }
  pendingFocus = index;
  menu.hold();
}

function menuKey(event: KeyboardEvent): void {
  const items = menuItems();
  const index = items.findIndex((item) => item === document.activeElement);
  const moves = new Map([
    ["ArrowDown", index + 1],
    ["ArrowUp", index - 1],
    ["Home", 0],
    ["End", -1],
  ]);
  const next = moves.get(event.key);
  if (next !== undefined) {
    event.preventDefault();
    focusItem(next);
  }
  if (event.key === "Tab") close(false);
}

function close(restore: boolean): void {
  if (!open.value) return;
  menu.close();
  if (restore)
    void nextTick(() =>
      root.value?.querySelector<HTMLButtonElement>(".nav__trigger")?.focus()
    );
}

function outside(event: MouseEvent): void {
  if (
    event.target instanceof Node &&
    !root.value?.querySelector(".nav__group")?.contains(event.target)
  )
    menu.close();
}

function escape(event: KeyboardEvent): void {
  if (event.key === "Escape") close(true);
}

function switchPage(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const selected = event.target.value;
  const destinations = [
    demoHref(),
    demoHref(true),
    vueHref("unstyled/workspace"),
    ...adapters.map((adapter) => vueHref(pathOf(adapter))),
    ...features.map((feature) => vueHref(`${kitPath}/${feature.slug}`)),
  ];
  const destination = destinations.find((href) => href === selected);
  if (!destination || props.beforeNavigate?.() === false) {
    event.target.value =
      destinations.find(
        (href) =>
          new URL(href, window.location.origin).pathname ===
          window.location.pathname
      ) ?? "";
    return;
  }
  window.location.assign(destination);
}

function switchFramework(event: Event): void {
  if (!(event.target instanceof HTMLSelectElement)) return;
  const framework = event.target.value;
  if (framework !== "react" && framework !== "angular") return;
  if (props.beforeNavigate?.() === false) {
    event.target.value = "vue";
    return;
  }
  track(SITE_EVENT.frameworkSwitch, { framework });
  try {
    localStorage.setItem(FRAMEWORK_STORAGE_KEY, framework);
  } catch {
    // Storage is optional: the destination still opens.
  }
  window.location.assign(frameworkDemoHref(framework));
}

function guardLink(event: MouseEvent): void {
  const link =
    event.target instanceof Element ? event.target.closest("a") : null;
  if (
    !link ||
    link.target === "_blank" ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  if (props.beforeNavigate?.() === false) event.preventDefault();
}

onMounted(() => {
  document.addEventListener("click", outside);
  document.addEventListener("keydown", escape);
  window.addEventListener("resize", layoutMenu);
});
onScopeDispose(() => {
  menu.dispose();
  cancelAnimationFrame(frame);
  document.removeEventListener("click", outside);
  document.removeEventListener("keydown", escape);
  window.removeEventListener("resize", layoutMenu);
});
</script>

<template>
  <header ref="root" class="nav" @click.capture="guardLink">
    <div
      class="nav__inner shell"
      role="navigation"
      aria-label="Vue showcase navigation"
    >
      <ShowcaseWordmark :href="SITE_HOME" />
      <nav class="nav__links" aria-label="Demo pages">
        <a
          :href="demoHref()"
          :class="{ 'is-on': active === 'demo' }"
          :aria-current="active === 'demo' ? 'page' : undefined"
          >Live demo</a
        >
        <a
          :href="demoHref(true)"
          :class="{ 'is-on': active === 'all-options' }"
          :aria-current="active === 'all-options' ? 'page' : undefined"
          >Feature Lab</a
        >
        <a
          :href="vueHref(`${kitPath}/ai`)"
          :class="{ 'is-on': active.endsWith('/ai') }"
          :aria-current="active.endsWith('/ai') ? 'page' : undefined"
          >AI demo</a
        >
        <a
          :href="vueHref('unstyled/workspace')"
          :class="{ 'is-on': active === 'unstyled/workspace' }"
          :aria-current="active === 'unstyled/workspace' ? 'page' : undefined"
          >Order workspace</a
        >
        <div
          class="nav__group"
          @pointerenter="menu.enter"
          @pointerleave="menu.leave"
        >
          <button
            type="button"
            class="nav__trigger"
            :class="{
              'is-on':
                !['demo', 'all-options', 'unstyled/workspace'].includes(
                  active
                ) && !active.endsWith('/ai'),
            }"
            aria-controls="vue-adapter-menu"
            aria-haspopup="menu"
            :aria-expanded="open"
            @keydown="triggerKey"
            @click="toggleMenu"
          >
            Adapters
            <svg
              class="nav__chev"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            id="vue-adapter-menu"
            role="menu"
            aria-label="Adapters"
            class="nav__menu nav__menu--wide"
            :data-open="open"
            :style="{ transform: `translateX(${shift}px)` }"
            @keydown="menuKey"
          >
            <a
              v-for="adapter in adapters"
              :key="adapter.key"
              role="menuitem"
              :href="vueHref(pathOf(adapter))"
              :class="{
                'is-on': kit.key === adapter.key && active === pathOf(adapter),
              }"
              :aria-current="active === pathOf(adapter) ? 'page' : undefined"
            >
              <span class="nav__item-label"
                ><span
                  class="nav__dot"
                  :style="{ '--c': kitAccent(adapter, dark) }"
                ></span
                >{{ adapter.label }}</span
              >
              <span class="nav__item-hint">{{ adapter.blurb }}</span>
            </a>
          </div>
        </div>
      </nav>
      <label class="nav__mobile">
        <select aria-label="Demo page" @change="switchPage">
          <optgroup label="Demo">
            <option :value="demoHref()" :selected="active === 'demo'">
              Live demo
            </option>
            <option
              :value="demoHref(true)"
              :selected="active === 'all-options'"
            >
              Feature Lab
            </option>
            <option
              :value="vueHref('unstyled/workspace')"
              :selected="active === 'unstyled/workspace'"
            >
              Order workspace
            </option>
          </optgroup>
          <optgroup label="Adapters">
            <option
              v-for="adapter in adapters"
              :key="adapter.key"
              :value="vueHref(pathOf(adapter))"
              :selected="active === pathOf(adapter)"
            >
              {{ adapter.label }}
            </option>
          </optgroup>
          <optgroup label="Current kit features">
            <option
              v-for="feature in features"
              :key="feature.slug"
              :value="vueHref(`${kitPath}/${feature.slug}`)"
              :selected="active === `${kitPath}/${feature.slug}`"
            >
              {{ feature.label }}
            </option>
          </optgroup>
        </select>
        <span aria-hidden="true">▾</span>
      </label>
      <div class="nav__right">
        <label class="nav__framework">
          <span aria-hidden="true">V</span>
          <select
            aria-label="Framework"
            data-demo-control="framework"
            @change="switchFramework"
          >
            <option value="react">React</option>
            <option value="angular">Angular</option>
            <option value="vue" selected>Vue</option>
          </select>
        </label>
        <button
          type="button"
          class="nav__icon"
          aria-label="Toggle dark mode"
          :aria-pressed="dark"
          @click="emit('toggleDark')"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <template v-if="dark">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"
              />
            </template>
            <path v-else d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />
          </svg>
        </button>
        <a
          class="nav__docs"
          :href="docs"
          target="_blank"
          rel="noreferrer"
          data-cta="docs"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
            /></svg
          >Docs
        </a>
        <a class="nav__cta" :href="repo" target="_blank" rel="noreferrer">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.08c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.23-1.62-1.23-1.62-1-.68.08-.67.08-.67 1.11.08 1.69 1.14 1.69 1.14.99 1.69 2.59 1.2 3.22.91.1-.72.39-1.2.7-1.48-2.47-.28-5.07-1.24-5.07-5.5 0-1.22.43-2.22 1.14-3-.12-.28-.49-1.42.11-2.96 0 0 .93-.3 3.05 1.14a10.63 10.63 0 0 1 5.55 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.54.23 2.68.11 2.96.71.78 1.14 1.78 1.14 3 0 4.27-2.6 5.22-5.08 5.5.4.34.75 1.02.75 2.06v3.06c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z"
            /></svg
          >GitHub
        </a>
      </div>
    </div>
    <p v-if="unavailableKit" class="shell" role="status">
      {{ unavailableKit }} has no matching Vue kit. This example uses
      {{ kit.label }}
      and retains the feature where available.
    </p>
  </header>
</template>

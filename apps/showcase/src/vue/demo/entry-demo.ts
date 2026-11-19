import "../../styles.css";
import "../../angular/matrixPage.css";
import "../../angular/demoPage.css";
import "../matrix/matrixPage.css";
import "./demo.css";
import "../../demoLayout.css";

import { type App, createApp, h } from "vue";

import {
  canReplaceDemo,
  captureDemoState,
  createLatestDemoTask,
  demoOptionSignature,
  hasPendingDemoEdits,
  initializeDemoHistory,
  registerDemoRenderer,
  showDemoEditWarning,
} from "../../angular/demoTransitions.mjs";
import { adaptersOf, leadAdapter } from "../../matrix/content";
import {
  refreshShowcasePresentation,
  SHOWCASE_PRESENTATION,
} from "../matrix/data";
import { activateKitStyles } from "../matrix/kitStyles";
import { loadVueShowcaseKit } from "../matrix/loadKit";
import { SHOWCASE_KIT } from "../matrix/showcaseKit";

document.documentElement.dataset.framework = "vue";
const root = document.getElementById("root");
if (!root) throw new Error("The Vue demo has no root");
const adapters = adaptersOf("vue").filter((adapter) => adapter.built);
const container = root;
const lab = root.dataset.vueMode === "lab";
const demoHistory = initializeDemoHistory();
let app: App | undefined;
let renderedOptions = "";
let transitioning = false;

const render = createLatestDemoTask(async (isCurrent) => {
  transitioning = true;
  container.setAttribute("aria-busy", "true");
  try {
    const signature = demoOptionSignature(window.location.href);
    const requested = new URLSearchParams(window.location.search).get("kit");
    const adapter =
      adapters.find((candidate) => candidate.key === requested) ??
      leadAdapter("vue");
    // Load the next kit alongside the page, while the mounted table stays usable.
    const [{ kit }, { default: DemoPage }] = await Promise.all([
      loadVueShowcaseKit(adapter.key),
      import("./DemoPage.vue"),
    ]);
    if (!isCurrent()) return;
    if (demoOptionSignature(window.location.href) !== signature) {
      void render();
      return;
    }
    if (!canReplaceDemo()) return;
    captureDemoState();
    const scroll = { left: window.scrollX, top: window.scrollY };
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.demoControl
        : undefined;
    refreshShowcasePresentation();
    let dark = false;
    try {
      dark = localStorage.getItem("adapttable-demo-theme") === "dark";
    } catch {
      // Appearance storage is optional.
    }
    const next = createApp({ render: () => h(DemoPage, { adapter, lab }) });
    next.provide(SHOWCASE_KIT, kit);
    activateKitStyles(kit.key);
    kit.install?.(next, { dark, ...SHOWCASE_PRESENTATION });
    app?.unmount();
    container.replaceChildren();
    app = next;
    app.mount(container);
    demoHistory.commit();
    renderedOptions = demoOptionSignature(window.location.href);
    requestAnimationFrame(() => {
      if (!isCurrent()) return;
      if (active)
        container
          .querySelector<HTMLElement>(
            '[data-demo-control="' + CSS.escape(active) + '"]'
          )
          ?.focus({ preventScroll: true });
      window.scrollTo({ ...scroll, behavior: "instant" });
    });
  } catch (error) {
    if (!isCurrent()) return;
    container.querySelector("[data-demo-transition-error]")?.remove();
    const notice = document.createElement("section");
    notice.dataset.demoTransitionError = "";
    notice.setAttribute("role", "alert");
    const message = document.createElement("p");
    message.textContent = "The Vue demo could not switch. Please retry.";
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "Retry demo";
    retry.addEventListener("click", () => {
      void render();
    });
    notice.append(message, retry);
    container.prepend(notice);
    console.error(error);
  } finally {
    transitioning = false;
    container.removeAttribute("aria-busy");
  }
});
registerDemoRenderer(render);
window.addEventListener(
  "popstate",
  (event) => {
    const pending = hasPendingDemoEdits(container);
    if (!demoHistory.pop(pending)) {
      event.stopImmediatePropagation();
      if (pending) showDemoEditWarning();
      return;
    }
    if (
      transitioning ||
      demoOptionSignature(window.location.href) !== renderedOptions
    )
      void render();
  },
  true
);
window.addEventListener("beforeunload", (event) => {
  if (hasPendingDemoEdits(container)) event.preventDefault();
});
await render();

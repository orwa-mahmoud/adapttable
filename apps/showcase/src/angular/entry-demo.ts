/** Main and Feature Lab replace kit providers in-place without replacing the document. */
import "../styles.css";

import { ADAPTTABLE_URL_ADAPTER } from "@adapttable/angular";
import {
  type ApplicationRef,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";

import { refreshShowcasePresentation } from "./data";
import { AdaptShowcaseDemoPage, SHOWCASE_LAB } from "./demoPage";
import {
  canReplaceDemo,
  captureDemoState,
  createLatestDemoTask,
  demoOptionSignature,
  demoUrlAdapter,
  hasPendingDemoEdits,
  initializeDemoHistory,
  registerDemoRenderer,
  showDemoEditWarning,
} from "./demoTransitions.mjs";
import { SHOWCASE_ASSET_ROOT, SHOWCASE_KIT } from "./showcaseKit";

const root = document.getElementById("root");
if (!root) throw new Error("The showcase has no root");
const container = root;
const lab = container.dataset.angularMode === "lab";
let application: ApplicationRef | undefined;
let renderedOptions = "";
let transitioning = false;
const demoHistory = initializeDemoHistory();

async function loadKit(selected: string) {
  switch (selected) {
    case "ng-zorro":
      return import("./kits/ngZorro");
    case "material":
      return import("./kits/material");
    case "ng-bootstrap":
      return import("./kits/ngBootstrap");
    case "spartan":
      return import("./kits/spartan");
    case "taiga-ui":
      return import("./kits/taigaUi");
    case "aria":
      return import("./kits/aria");
    case "ngx-bootstrap":
      return import("./kits/ngxBootstrap");
    case "angular-cdk":
      return import("./kits/angularCdk");
    default:
      return import("./kits/unstyled");
  }
}

function showTransitionError(error: unknown): void {
  container.querySelector("[data-demo-transition-error]")?.remove();
  const notice = document.createElement("section");
  notice.dataset.demoTransitionError = "";
  notice.setAttribute("role", "alert");
  const message = document.createElement("p");
  message.textContent = `The Angular demo could not switch: ${error instanceof Error ? error.message : String(error)}`;
  const retry = document.createElement("button");
  retry.textContent = "Retry demo";
  retry.addEventListener("click", () => {
    void render();
  });
  notice.append(message, retry);
  if (application) container.prepend(notice);
  else container.replaceChildren(notice);
  console.error(error);
}

const render = createLatestDemoTask(async (isCurrent) => {
  transitioning = true;
  container.setAttribute("aria-busy", "true");
  try {
    const url = new URL(window.location.href);
    const signature = demoOptionSignature(url.href);
    // Keep the mounted app usable while the next kit's own bundle arrives.
    const { kit } = await loadKit(url.searchParams.get("kit") ?? "unstyled");
    if (!isCurrent()) return;
    if (demoOptionSignature(window.location.href) !== signature) {
      void render();
      return;
    }
    if (!canReplaceDemo()) return;
    captureDemoState();
    const scroll = { x: window.scrollX, y: window.scrollY };
    const optionsScroll =
      container.querySelector<HTMLDialogElement>("dialog")?.scrollTop ?? 0;
    const active =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.demoControl
        : undefined;
    application?.destroy();
    application = undefined;
    refreshShowcasePresentation();
    container.replaceChildren(
      document.createElement("adapt-showcase-demo-page")
    );
    try {
      application = await bootstrapApplication(AdaptShowcaseDemoPage, {
        providers: [
          provideZonelessChangeDetection(),
          { provide: ADAPTTABLE_URL_ADAPTER, useValue: demoUrlAdapter },
          ...kit.providers,
          { provide: SHOWCASE_KIT, useValue: kit },
          { provide: SHOWCASE_LAB, useValue: lab },
          {
            provide: SHOWCASE_ASSET_ROOT,
            useValue: url.pathname.startsWith("/angular/demo")
              ? "/angular/demo/assets"
              : "/assets",
          },
        ],
      });
      if (isCurrent()) demoHistory.commit();
      renderedOptions = demoOptionSignature(window.location.href);
      requestAnimationFrame(() => {
        if (!isCurrent()) return;
        const dialog = container.querySelector<HTMLDialogElement>("dialog");
        if (dialog) dialog.scrollTop = optionsScroll;
        if (active)
          container
            .querySelector<HTMLElement>(
              active === "kit"
                ? 'input[name="kit"]:checked'
                : `[data-demo-control="${CSS.escape(active)}"]`
            )
            ?.focus({ preventScroll: true });
        window.scrollTo({ left: scroll.x, top: scroll.y, behavior: "instant" });
      });
    } catch (error) {
      showTransitionError(error);
    }
  } catch (error) {
    if (isCurrent()) showTransitionError(error);
  } finally {
    transitioning = false;
    container.removeAttribute("aria-busy");
  }
});
registerDemoRenderer(render);
window.addEventListener(
  "popstate",
  (event) => {
    const pendingEdits = hasPendingDemoEdits(container);
    if (!demoHistory.pop(pendingEdits)) {
      // The binding must not consume a traversal that is being reversed.
      event.stopImmediatePropagation();
      if (pendingEdits) showDemoEditWarning();
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
  if (!hasPendingDemoEdits(container)) return;
  event.preventDefault();
  event.returnValue = "";
});
await render();

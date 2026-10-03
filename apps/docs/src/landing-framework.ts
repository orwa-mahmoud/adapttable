import {
  FRAMEWORK_STORAGE_KEY,
  frameworkDemoTarget,
  frameworkDocsTarget,
  selectedFramework,
} from "../../../scripts/framework-navigation.mjs";
import { ORIGIN } from "../../../scripts/site.mjs";
import { featuresOf, SHOWCASE_ADAPTERS } from "../../showcase/matrix.mjs";

const select = document.querySelector<HTMLSelectElement>(
  "[data-landing-framework]"
);
function updateLandingFramework(framework: string) {
  if (select) select.value = framework;
  const icon = document.querySelector("[data-landing-icon]");
  if (icon) icon.textContent = framework === "angular" ? "Ⓐ" : "⚛";
  try {
    localStorage.setItem(FRAMEWORK_STORAGE_KEY, framework);
  } catch {
    /* Selection still works without storage. */
  }
  document
    .querySelectorAll<HTMLElement>("[data-framework-only]")
    .forEach((element) => {
      element.hidden = element.dataset.frameworkOnly !== framework;
    });
  document
    .querySelectorAll<HTMLElement>("[data-angular-copy]")
    .forEach((element) => {
      element.dataset.reactCopy ??= element.innerHTML;
      if (framework === "angular")
        element.textContent = element.dataset.angularCopy ?? "";
      else element.innerHTML = element.dataset.reactCopy;
    });
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    link.dataset.frameworkHref ??= link.href;
    const url = new URL(link.dataset.frameworkHref);
    if (
      (url.origin !== location.origin && url.origin !== ORIGIN) ||
      !/^\/(react|angular)\//.test(url.pathname)
    )
      return;
    if (link.closest("[data-framework-only]")) return;
    const target = url.pathname.includes("/demo/")
      ? frameworkDemoTarget(
          url.pathname,
          framework,
          SHOWCASE_ADAPTERS,
          featuresOf
        )
      : frameworkDocsTarget(url.pathname, framework);
    link.href = target.href;
  });
  const install =
    framework === "angular"
      ? "npm install @adapttable/angular-unstyled @adapttable/angular"
      : "npx @adapttable/cli init";
  document.querySelectorAll(".install code").forEach((code) => {
    code.textContent = install;
  });
  document
    .querySelectorAll<HTMLElement>(".install [data-copy]")
    .forEach((button) => {
      button.dataset.copy = install;
    });
}
function restoreLandingFramework() {
  let preferred = new URLSearchParams(location.search).get("framework");
  if (!preferred)
    try {
      preferred = localStorage.getItem(FRAMEWORK_STORAGE_KEY);
    } catch {
      /* Default to React. */
    }
  updateLandingFramework(selectedFramework(location.pathname, preferred));
}
if (select)
  select.onchange = () => {
    const url = new URL(location.href);
    url.searchParams.set("framework", select.value);
    history.pushState(null, "", url);
    updateLandingFramework(select.value);
  };
restoreLandingFramework();
window.addEventListener("pageshow", restoreLandingFramework);

window.addEventListener("popstate", restoreLandingFramework);

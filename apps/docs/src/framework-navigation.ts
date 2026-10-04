import {
  DOCS_FRAMEWORKS,
  FRAMEWORK_STORAGE_KEY,
  frameworkDocsTarget,
  selectedFramework,
} from "../../../scripts/framework-navigation.mjs";
import { ORIGIN } from "../../../scripts/site.mjs";

function updateFrameworkNavigation() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(FRAMEWORK_STORAGE_KEY);
  } catch {
    /* Storage is optional. */
  }
  const framework = selectedFramework(location.pathname, stored);
  try {
    localStorage.setItem(FRAMEWORK_STORAGE_KEY, framework);
  } catch {
    /* Explicit URLs still work. */
  }
  document
    .querySelectorAll<HTMLSelectElement>("[data-framework-select]")
    .forEach((select) => {
      select.value = framework;
      const icon = select.parentElement?.querySelector("[data-framework-icon]");
      const glyph =
        DOCS_FRAMEWORKS.find(({ key }) => key === framework)?.icon ?? "⚛";
      if (icon && icon.textContent !== glyph) icon.textContent = glyph;
      select.onchange = () => {
        const targetFramework =
          DOCS_FRAMEWORKS.find(({ key }) => key === select.value)?.key ??
          "react";
        try {
          localStorage.setItem(FRAMEWORK_STORAGE_KEY, targetFramework);
        } catch {
          /* Navigation does not require storage. */
        }
        location.assign(
          frameworkDocsTarget(location.pathname, targetFramework).href
        );
      };
    });
  // Archived references retain their version, rather than pretending Angular
  // was published in an older React-only snapshot.
  if (/^\/v\d+\//.test(location.pathname)) return;
  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    link.dataset.frameworkOriginalHref ??= link.href;
    const url = new URL(link.dataset.frameworkOriginalHref);
    if (
      (url.origin !== location.origin && url.origin !== ORIGIN) ||
      !/^\/(react|angular|vue)\//.test(url.pathname)
    )
      return;
    if (/^\/(react|angular|vue)\/demo\//.test(url.pathname)) {
      if (framework === "angular" && url.pathname === "/react/demo/")
        link.href = "/angular/demo/unstyled/";
      return;
    }
    // An explicit link into the experimental guide remains a useful cross-link.
    if (
      url.pathname.startsWith("/vue/") &&
      framework !== "vue" &&
      !link.closest("#starlight__sidebar, .pagefind-ui__result")
    )
      return;
    const target = frameworkDocsTarget(url.pathname, framework);
    if (target.equivalent && link.closest("#starlight__sidebar")) {
      const item = link.closest("li");
      if (item) item.hidden = false;
    }
    if (
      !target.equivalent &&
      link.closest("#starlight__sidebar, .pagefind-ui__result")
    ) {
      const item = link.closest<HTMLElement>(".pagefind-ui__result, li");
      if (item) item.hidden = true;
      return;
    }
    link.href = target.href + (target.equivalent ? url.hash : "");
    if (!target.equivalent)
      link.title = `This guide is not available for ${framework}. Open its getting-started guide.`;
  });
  const unavailable = new URLSearchParams(location.search).get("unavailable");
  if (unavailable && !document.querySelector("[data-framework-notice]")) {
    const notice = document.createElement("p");
    notice.dataset.frameworkNotice = "";
    notice.setAttribute("role", "status");
    notice.textContent = `The ${unavailable.replaceAll("-", " ")} guide is not available for ${framework === "vue" ? "Vue" : framework === "angular" ? "Angular" : "React"}. This getting-started guide lists supported features.`;
    document.querySelector("main")?.prepend(notice);
  }
}
updateFrameworkNavigation();
document.addEventListener("astro:page-load", updateFrameworkNavigation);
window.addEventListener("pageshow", updateFrameworkNavigation);

// Pagefind inserts results after the initial render. Reconcile new links without
// observing our own href/visibility attribute updates.
const searchResults = new MutationObserver(updateFrameworkNavigation);
searchResults.observe(document.body, { childList: true, subtree: true });

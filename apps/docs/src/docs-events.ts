import {
  installSiteEvents,
  SITE_EVENT,
  SITE_SURFACE,
  trackCopy,
  trackOnce,
} from "../../../scripts/site-events.mjs";

/** How long the search box must rest before its results count as shown. */
const SEARCH_SETTLE_MS = 1000;

/** Expressive Code writes newlines in a copy button's `data-code` as U+007F. */
const CODE_NEWLINE = /\u007f/g;

installSiteEvents(SITE_SURFACE.docs);

/** The label a copied block reports: its frame title, else its language. */
function blockLabel(button: HTMLElement): string {
  const block = button.closest(".expressive-code");
  const title = block?.querySelector(".title")?.textContent?.trim();
  return title || block?.querySelector("pre")?.dataset.language || "code";
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLElement>(".expressive-code .copy button");
  if (!button) return;
  const code = (button.dataset.code ?? "").replace(CODE_NEWLINE, "\n");
  trackCopy(SITE_SURFACE.docs, code, blockLabel(button));
});

let searchTimer: number | undefined;
document.addEventListener("input", (event) => {
  const input = event.target;
  if (
    !(input instanceof HTMLInputElement) ||
    !input.matches(".pagefind-ui__search-input")
  )
    return;
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    const term = input.value.trim();
    if (!term || !document.querySelector(".pagefind-ui__result")) return;
    trackOnce(
      `${SITE_EVENT.docsSearch}:${term.toLowerCase()}`,
      SITE_EVENT.docsSearch,
      { search_term: term }
    );
  }, SEARCH_SETTLE_MS);
});

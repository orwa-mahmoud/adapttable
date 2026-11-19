/**
 * What the site reports to its analytics, defined once.
 *
 * The landing page, the docs and the three showcases all install the same
 * GA4 and Clarity tags and report the same events. The ids, the tag source,
 * the error reporter, every event name and the `track` helper live here; each
 * surface imports them and holds no copy of its own.
 *
 * `track` sends through the `window.gtag` the GA4 tag defines. That tag is
 * only installed by a production build served from the real site (see
 * `analytics-guard.mjs`), so a dev server, a local preview and the test suite
 * send nothing: there is no `gtag` to send through. An automated browser
 * (`navigator.webdriver`) sends nothing either.
 */
import { appendScript, guarded } from "./analytics-guard.mjs";

/** The GA4 property every surface reports to. */
export const GA_MEASUREMENT_ID = "G-FT8LY7Z15Y";

/** The Clarity project every surface records into. */
export const CLARITY_PROJECT_ID = "xxq9dbsjnj";

/** GA4 truncates a string parameter past this length; trim it first. */
export const PARAM_LIMIT = 100;

/** Event names. GA4 reads them by name, so they never change spelling. */
export const SITE_EVENT = Object.freeze({
  copyInstall: "copy_install",
  copyCode: "copy_code",
  demoInteract: "demo_interact",
  kitSwitch: "kit_switch",
  demoOption: "demo_option",
  frameworkSwitch: "framework_switch",
  ctaClick: "cta_click",
  videoPlay: "video_play",
  videoComplete: "video_complete",
  docsSearch: "docs_search",
  starPromptShown: "star_prompt_shown",
  starPromptStar: "star_prompt_star",
  starPromptClosed: "star_prompt_closed",
  webException: "web_exception",
});

/** Where on the site an event happened: the `surface` parameter. */
export const SITE_SURFACE = Object.freeze({
  landing: "landing",
  docs: "docs",
  demoMain: "demo_main",
  demoKit: "demo_kit",
  demoLab: "demo_lab",
});

/** The options a main demo offers, as `demo_option` names them. */
export const DEMO_OPTION = Object.freeze({
  data: "data",
  locale: "locale",
  filters: "filters",
  density: "density",
  layout: "layout",
  grouping: "grouping",
  editing: "editing",
  selection: "selection",
  motion: "motion",
});

/** The main-demo URL keys whose `demo_option` name differs from the key. */
const OPTION_FOR_KEY = Object.freeze({
  mode: DEMO_OPTION.data,
  mobile: DEMO_OPTION.layout,
});

/** The main-demo URL key that chooses the kit. */
export const DEMO_KIT_KEY = "kit";

/** The element around every rendered table, in every kit. */
export const TABLE_ROOT_SELECTOR = '[data-adapttable-part="root"]';

/** An on-site button that reports `cta_click` carries its key here. */
export const CTA_ATTRIBUTE = "data-cta";

const CTA_SELECTOR = `[${CTA_ATTRIBUTE}]`;

/**
 * An install or setup command: the CLI, or a package manager adding an
 * `@adapttable/` package as its first package (flags may come before it).
 */
const INSTALL_COMMAND =
  /^(?:npx @adapttable\/|(?:pnpm add|npm i|npm install|yarn add|bun add)(?: -{1,2}[\w-]+)* @adapttable\/)/;

/** @typedef {Readonly<Record<string, string | number | boolean>>} EventParams */

/**
 * Send one event. Production builds on the real site only; never throws.
 *
 * @param {string} name - One of {@link SITE_EVENT}.
 * @param {EventParams} [params] - String values are trimmed to {@link PARAM_LIMIT}.
 */
export function track(name, params = {}) {
  if (typeof window === "undefined" || navigator.webdriver) return;
  const gtag = /** @type {{ gtag?: unknown }} */ (window).gtag;
  if (typeof gtag !== "function") return;
  /** @type {Record<string, string | number | boolean>} */
  const trimmed = {};
  for (const [key, value] of Object.entries(params))
    trimmed[key] =
      typeof value === "string" ? value.slice(0, PARAM_LIMIT) : value;
  gtag("event", name, trimmed);
}

/** Keys already sent in this page view, for {@link trackOnce}. */
const sentThisPageView = new Set();

/**
 * Send an event once per page view for `key`.
 *
 * @param {string} key - What makes two calls the same event.
 * @param {string} name - One of {@link SITE_EVENT}.
 * @param {EventParams} [params]
 */
export function trackOnce(key, name, params) {
  if (sentThisPageView.has(key)) return;
  sentThisPageView.add(key);
  track(name, params);
}

/**
 * The event a copy reports: an install command, or any other code.
 *
 * @param {string} text - What was copied.
 * @returns {string} {@link SITE_EVENT.copyInstall} or {@link SITE_EVENT.copyCode}.
 */
export const copyEventName = (text) =>
  INSTALL_COMMAND.test(text.trim())
    ? SITE_EVENT.copyInstall
    : SITE_EVENT.copyCode;

/**
 * Report a copy. An install command is reported as itself (its first line);
 * other code by `item`, the block's label or the page's feature key.
 *
 * @param {string} surface - One of {@link SITE_SURFACE}.
 * @param {string} text - What was copied.
 * @param {string} item - The block's label or the page's feature key.
 */
export function trackCopy(surface, text, item) {
  const name = copyEventName(text);
  const [command = ""] = text.trim().split("\n");
  track(name, {
    surface,
    item: name === SITE_EVENT.copyInstall ? command.trim() : item,
  });
}

/**
 * The event a main-demo choice reports, by the demo's URL key.
 *
 * @param {string} key - The URL key the choice writes (`kit`, `mode`, `density`…).
 * @param {string} value - The chosen value.
 * @returns {[string, EventParams]} the event name and its parameters.
 */
export function demoChoiceEvent(key, value) {
  if (key === DEMO_KIT_KEY) return [SITE_EVENT.kitSwitch, { kit: value }];
  const option =
    /** @type {Record<string, string>} */ (OPTION_FOR_KEY)[key] ?? key;
  return [SITE_EVENT.demoOption, { item: `${option}=${value}` }];
}

/**
 * Report a main-demo choice.
 *
 * @param {string} key - The URL key the choice writes.
 * @param {string} value - The chosen value.
 */
export function trackDemoChoice(key, value) {
  track(...demoChoiceEvent(key, value));
}

/**
 * The element an event started on, when it is one.
 *
 * @param {EventTarget | null} target
 * @returns {Element | null}
 */
const elementOf = (target) =>
  target && typeof (/** @type {Element} */ (target).closest) === "function"
    ? /** @type {Element} */ (target)
    : null;

/**
 * Call `listener` for every pointer or keyboard action inside a live table:
 * sorting, filtering, searching, editing, paging, selecting. One detector
 * serves `demo_interact` and the star prompt.
 *
 * @param {() => void} listener
 * @returns {() => void} stops listening.
 */
export function onTableAction(listener) {
  /** @param {Event} event */
  const hear = (event) => {
    if (elementOf(event.target)?.closest(TABLE_ROOT_SELECTOR)) listener();
  };
  for (const type of ["pointerdown", "keydown"])
    document.addEventListener(type, hear, true);
  return () => {
    for (const type of ["pointerdown", "keydown"])
      document.removeEventListener(type, hear, true);
  };
}

/**
 * Report `demo_interact` the first time a live table is used on this page view.
 *
 * @param {string} surface - One of {@link SITE_SURFACE}.
 * @returns {() => void} stops listening.
 */
export function watchTableUse(surface) {
  const stop = onTableAction(() => {
    trackOnce(SITE_EVENT.demoInteract, SITE_EVENT.demoInteract, { surface });
    stop();
  });
  return stop;
}

/**
 * Report `cta_click` for every followed on-site button that carries
 * {@link CTA_ATTRIBUTE}. Links to other sites are GA4's own `click` event.
 *
 * @param {string} surface - One of {@link SITE_SURFACE}.
 * @returns {() => void} stops listening.
 */
export function watchCtaClicks(surface) {
  /** @param {Event} event */
  const hear = (event) => {
    const button = /** @type {HTMLElement | null} */ (
      elementOf(event.target)?.closest(CTA_SELECTOR) ?? null
    );
    const item = button?.dataset.cta;
    if (item) track(SITE_EVENT.ctaClick, { surface, item });
  };
  document.addEventListener("click", hear, true);
  return () => document.removeEventListener("click", hear, true);
}

/**
 * Install the page-wide reporting every surface shares: on-site buttons and
 * the first use of a live table.
 *
 * @param {string} surface - One of {@link SITE_SURFACE}.
 * @returns {() => void} stops both.
 */
export function installSiteEvents(surface) {
  const stopCta = watchCtaClicks(surface);
  const stopTableUse = watchTableUse(surface);
  return () => {
    stopCta();
    stopTableUse();
  };
}

/**
 * Report uncaught errors and unhandled rejections as `web_exception`: the
 * error's name as its type and its message, never its stack.
 *
 * ResizeObserver's benign loop notification arrives as an error event with no
 * error object; it gets its own type so the count stays readable. Without an
 * error object the message is the only identifying detail, so it also names
 * the type, and only a real error object is fatal.
 *
 * {@link analyticsTag} writes this function into the page as source, so it
 * reads nothing but its arguments, keeps to syntax every engine that loads the
 * tag can parse, and carries no comments in its body.
 *
 * @param {Pick<Window, "addEventListener"> & { gtag?: unknown }} win - The page's window.
 * @param {string} eventName - {@link SITE_EVENT.webException}.
 * @param {number} limit - {@link PARAM_LIMIT}.
 */
export function reportErrors(win, eventName, limit) {
  /** @param {string} type @param {string} message @param {boolean} fatal */
  function report(type, message, fatal) {
    var gtag = win.gtag;
    if (typeof gtag !== "function") return;
    gtag("event", eventName, {
      exception_type: type.slice(0, limit),
      exception_message: message.slice(0, limit),
      fatal: fatal,
      non_interaction: true,
    });
  }
  win.addEventListener("error", function (event) {
    var message = typeof event.message === "string" ? event.message : "";
    if (message.indexOf("ResizeObserver loop") === 0) {
      report("ResizeObserverLoop", message, false);
      return;
    }
    var error = event.error;
    var name = error && error.name ? String(error.name) : "";
    report(name || message || "Error", message, Boolean(error));
  });
  win.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    var name = reason && reason.name ? String(reason.name) : "";
    var message =
      reason && typeof reason.message === "string" ? reason.message : "";
    report(name || "UnhandledRejection", message, false);
  });
}

/**
 * The GA4 tag and the error reporter, as page source behind the local-host
 * guard. It defines `window.gtag`, which {@link track} sends through.
 *
 * @returns {string}
 */
export function analyticsTag() {
  return guarded(
    [
      // googletagmanager.com serves the tag with
      // `access-control-allow-origin: *`, so an anonymous fetch gives the
      // browser full error detail instead of the opaque "Script error."
      // every cross-origin failure collapses into.
      appendScript(
        `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
        { async: true, crossorigin: "anonymous" }
      ),
      "window.dataLayer = window.dataLayer || [];",
      "window.gtag = function () { window.dataLayer.push(arguments); };",
      "window.gtag('js', new Date());",
      `window.gtag('config', '${GA_MEASUREMENT_ID}');`,
      `(${reportErrors.toString()})(window, '${SITE_EVENT.webException}', ${PARAM_LIMIT});`,
    ].join("\n")
  );
}

/**
 * The Clarity tag, as page source behind the local-host guard. The stub
 * queues `clarity()` calls until the tag loads.
 *
 * @returns {string}
 */
export function clarityTag() {
  return guarded(
    [
      "  window.clarity = window.clarity || function () {",
      "    (window.clarity.q = window.clarity.q || []).push(arguments);",
      "  };",
      appendScript(`https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`, {
        async: true,
      }),
    ].join("\n")
  );
}

/** Framework-aware navigation shared by documentation, landing, and demos. */
import { ANGULAR_DOCS, ANGULAR_KIT_DOCS } from "./angular-docs.mjs";
import { docsRoute, SHARED_DOCS } from "./site.mjs";

/** Published frameworks only; new bindings extend this registry when available. */
export const SITE_FRAMEWORKS = Object.freeze([
  { key: "react", label: "React", icon: "⚛" },
  { key: "angular", label: "Angular", icon: "Ⓐ" },
]);
export const FRAMEWORK_STORAGE_KEY = "adapttable-framework";
/** @param {string | null} value */
export function normalizeFramework(value) {
  return value === "angular" ? "angular" : "react";
}
const angular = new Set(ANGULAR_DOCS.map((page) => page.replace(/\.md$/, "")));
const shared = new Set(SHARED_DOCS);

/** @param {string} path @param {string | null} [preferred] */
export function selectedFramework(path, preferred = null) {
  const explicit = /^\/(react|angular)(?:\/|$)/.exec(path)?.[1];
  return explicit ?? normalizeFramework(preferred);
}

/** A destination includes an explicit explanation when no equivalent exists.
 * @param {string} path @param {string} framework
 */
export function frameworkDocsTarget(path, framework) {
  framework = normalizeFramework(framework);
  const slug = path
    .replace(/^\/v\d+\//, "/")
    .replace(/^\/(react|angular)\//, "/")
    .split("/")
    .filter(Boolean)
    .join("/")
    .replace(/\.md$/, "");
  if (framework === "angular" && angular.has(`angular/${slug}`))
    return { href: docsRoute(`angular/${slug}`), equivalent: true };
  if (shared.has(slug)) return { href: docsRoute(slug), equivalent: true };
  if (framework === "react" && !ANGULAR_KIT_DOCS.includes(slug))
    return { href: docsRoute(slug || "getting-started"), equivalent: true };
  return {
    href: `${docsRoute("getting-started", framework)}?unavailable=${encodeURIComponent(slug)}`,
    equivalent: false,
  };
}

/** Preserve matching kit and feature using the registered showcase inventory.
 * @param {string} path @param {string} framework
 * @template {{key: string, framework: string, built?: boolean}} T
 * @param {readonly T[]} adapters
 * @param {(adapter: T) => readonly {slug: string}[]} features
 */
export function frameworkDemoTarget(path, framework, adapters, features) {
  framework = normalizeFramework(framework);
  const url = new URL(path, "https://adapttable.local");
  const parts = url.pathname
    .replace(/^\/(react|angular)\/demo\/?/, "")
    .split("/")
    .filter(Boolean);
  // Main and Feature Lab are modes, not adapter names.
  if (parts.length === 0 || parts[0] === "all-options") {
    const mode = parts[0] === "all-options" ? "all-options/" : "";
    return { href: `/${framework}/demo/${mode}`, equivalent: true };
  }
  const sourceKit = parts[0] ?? "";
  /** @type {Record<string, string>} */
  const equivalents =
    framework === "angular"
      ? {
          antd: "ng-zorro",
          mui: "material",
          shadcn: "spartan",
          tailwind: "unstyled",
        }
      : {
          "ng-zorro": "antd",
          material: "mui",
          spartan: "shadcn",
          unstyled: "tailwind",
        };
  const counterpart = equivalents[sourceKit];
  const kit =
    adapters.find(
      (item) =>
        item.framework === framework &&
        item.built !== false &&
        item.key === (counterpart ?? sourceKit)
    ) ??
    adapters.find(
      (item) =>
        item.framework === framework &&
        item.built !== false &&
        item.key === (framework === "angular" ? "unstyled" : "tailwind")
    );
  if (!kit)
    return { href: `/${framework}/getting-started/`, equivalent: false };
  const feature = parts[1];
  const supported =
    !feature || features(kit).some((item) => item.slug === feature);
  const base = `/${framework}/demo/${kit.key}/`;
  const suffix = feature ? feature + "/" : "";
  const equivalentKit = !sourceKit || kit.key === (counterpart ?? sourceKit);
  const query = new URLSearchParams();
  if (!supported) query.set("unavailable", feature);
  if (!equivalentKit) query.set("kit-unavailable", sourceKit);
  const destination = supported ? base + suffix : base;
  const href = query.size ? `${destination}?${query}` : destination;
  return { href, equivalent: supported && equivalentKit };
}

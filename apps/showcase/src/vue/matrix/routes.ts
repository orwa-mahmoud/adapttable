/**
 * Addresses inside the site from a Vue page. The dev server serves the Vue
 * pages from the showcase's `vue/` folder; the composed site serves the same
 * pages under `/vue/demo/`. Both spell a kit's page the same below that root.
 */
const DEPLOYED = /^\/vue\/demo(?:\/|$)/.test(window.location.pathname);

/** A Vue demo page, by its path under the Vue demo root. */
export const vueHref = (page = ""): string => {
  const root = DEPLOYED ? "/vue/demo/" : "/vue/";
  return page ? `${root}${page}/` : root;
};

/** A file at the root of the demo the page is served from. */
export const demoFileHref = (file: string): string =>
  `${DEPLOYED ? "/vue/demo/" : "/"}${file}`;

/** Another framework's live demo. */
export const frameworkDemoHref = (framework: "react" | "angular"): string => {
  if (DEPLOYED) return `/${framework}/demo/`;
  return framework === "react" ? "/" : "/angular-main/";
};

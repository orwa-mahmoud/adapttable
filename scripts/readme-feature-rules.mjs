/** Vue documents its server rendering; React Server Components are React-only. */
const VUE_SSR = /\bSSR\b|\bserver(?:[- ]side)?[- ]render(?:ing|ed)\b/i;

/** Keep all default feature requirements unless the framework needs its own term. */
export function readmeFeatureMentioned(feature, pattern, section, framework) {
  if (feature === "ssr-rsc" && framework === "vue")
    return VUE_SSR.test(section);
  return pattern.test(section);
}

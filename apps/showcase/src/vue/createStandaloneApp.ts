import {
  type Component,
  createApp,
  h,
  onMounted,
  onScopeDispose,
  shallowRef,
} from "vue";

import {
  installSiteEvents,
  SITE_SURFACE,
} from "../../../../scripts/site-events.mjs";

/** Keep focused fixtures readable as pages while their minimal test hosts stay intact. */
export function createStandaloneApp(component: Component) {
  if (!document.getElementById("showcase-navigation"))
    return createApp(component);
  const suffix = "— AdaptTable";
  const title = document.title.endsWith(suffix)
    ? document.title.slice(0, -suffix.length).trimEnd()
    : document.title;
  const description = document
    .querySelector('meta[name="description"]')
    ?.getAttribute("content");
  return createApp({
    setup() {
      const host = shallowRef<HTMLElement | null>(null);
      const intro = shallowRef(false);
      onScopeDispose(installSiteEvents(SITE_SURFACE.demoLab));
      onMounted(() => {
        intro.value = !host.value?.querySelector("h1");
      });
      return () =>
        h("div", { ref: host, class: "vue-standalone-content" }, [
          intro.value
            ? h("header", { class: "vue-standalone-intro" }, [
                h("h1", title),
                description ? h("p", description) : null,
              ])
            : null,
          h(component),
        ]);
    },
  });
}

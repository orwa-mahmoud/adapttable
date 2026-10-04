import {
  defineRouteMiddleware,
  type StarlightRouteData,
} from "@astrojs/starlight/route-data";

import {
  frameworkDocsTarget,
  selectedFramework,
} from "../../../scripts/framework-navigation.mjs";

type Entry = StarlightRouteData["sidebar"][number];
/** Filter the published sidebar before rendering, retaining shared contracts. */
export const onRequest = defineRouteMiddleware((context) => {
  if (/^\/v\d+\//.test(context.url.pathname)) return;
  const framework = selectedFramework(context.url.pathname);
  const transform = (items: Entry[]): Entry[] =>
    items.flatMap((item): Entry[] => {
      if (item.type === "group") {
        if (item.label === "Angular" || item.label === "Vue (experimental)")
          return [];
        const entries = transform(item.entries);
        return entries.length ? [{ ...item, entries }] : [];
      }
      const target = frameworkDocsTarget(item.href, framework);
      return target.equivalent
        ? [
            {
              ...item,
              href: target.href,
              isCurrent: target.href === context.url.pathname,
            },
          ]
        : [];
    });
  const route = context.locals.starlightRoute;
  route.sidebar = transform(route.sidebar);
  const flatten = (items: Entry[]): Extract<Entry, { type: "link" }>[] =>
    items.flatMap((item) =>
      item.type === "group" ? flatten(item.entries) : [item]
    );
  const pages = flatten(route.sidebar);
  const index = pages.findIndex((item) => item.isCurrent);
  route.pagination =
    index < 0 ? {} : { prev: pages[index - 1], next: pages[index + 1] };
});

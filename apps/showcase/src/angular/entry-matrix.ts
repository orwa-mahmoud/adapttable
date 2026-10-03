/**
 * The one entry every Angular kit's matrix page boots — the Angular
 * counterpart of `src/entry-matrix.tsx`.
 *
 * Which page this is comes from `#root`'s `data-matrix-page`, written into the
 * served HTML by `scripts/build-showcase-html.mjs`, so the dev server
 * (`/unstyled/filtering/`) and the published site (`/angular/demo/unstyled/…`)
 * boot the same file without either knowing the other's mount point.
 */
import "../styles.css";

import { provideZonelessChangeDetection } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";

import { resolveMatrixRoute } from "../matrix/content";
import { AdaptShowcaseMatrixPage, MATRIX_PAGE } from "./matrixPage";
import { SHOWCASE_ASSET_ROOT, SHOWCASE_KIT } from "./showcaseKit";

const container = document.getElementById("root");
if (!container) throw new Error("the showcase page has no #root to mount into");

/** The framework this entry serves: the kits whose matrix pages boot it. */
const FRAMEWORK = "angular";

const id = container.dataset.matrixPage ?? "";
const route = resolveMatrixRoute(id, FRAMEWORK);
if (!route) {
  // The page's static copy stays on screen rather than being replaced by a
  // blank root, and the fault is reported instead of being swallowed.
  throw new Error(
    `the matrix does not build a ${FRAMEWORK} page called "${id}"`
  );
}

/** Only the requested kit and its stylesheet enter this page's runtime graph. */
const { kit } = await (() => {
  switch (route.adapter.key) {
    case "unstyled":
      return import("./kits/unstyled");
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
    case "ng-zorro":
      return import("./kits/ngZorro");
    default:
      throw new Error(`No Angular showcase kit for "${route.adapter.key}"`);
  }
})();

/** `..` from an adapter landing, `../..` from one of its feature pages. */
const root = "..".concat("/..".repeat(id.split("/").length - 1));

container.replaceChildren(document.createElement("adapt-showcase-matrix-page"));
await bootstrapApplication(AdaptShowcaseMatrixPage, {
  providers: [
    provideZonelessChangeDetection(),
    ...kit.providers,
    {
      provide: SHOWCASE_ASSET_ROOT,
      useValue: new URL(`${root}/assets`, document.baseURI).pathname,
    },
    { provide: SHOWCASE_KIT, useValue: kit },
    { provide: MATRIX_PAGE, useValue: { route, root } },
  ],
});

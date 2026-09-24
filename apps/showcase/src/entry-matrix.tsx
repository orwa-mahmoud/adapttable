import "./kitStyles";
import "./styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { resolveMatrixRoute } from "./matrix/content";
import { MatrixPage } from "./matrix/MatrixPage";
import { PageShell } from "./PageShell";

/**
 * The one entry every adapter × feature page boots.
 *
 * Which page this is comes from `#root`'s `data-matrix-page` — written into
 * the served HTML by `scripts/build-showcase-html.mjs`. Reading it from the
 * markup rather than from `location.pathname` is what lets the dev server
 * (`/mantine/saved-views/`) and the published site (`/react/demo/mantine/…`) boot the
 * same file without either one having to know the other's mount point.
 */
const container = document.getElementById("root");
if (!container) throw new Error("the showcase page has no #root to mount into");

const id = container.dataset.matrixPage ?? "";
const route = resolveMatrixRoute(id);
if (!route) {
  // The page's static copy stays on screen rather than being replaced by a
  // blank root, and the fault is reported instead of being swallowed.
  throw new Error(`the matrix does not build a page called "${id}"`);
}

/** `..` from an adapter landing, `../..` from one of its feature pages. */
const root = "..".concat("/..".repeat(id.split("/").length - 1));

createRoot(container).render(
  <StrictMode>
    <PageShell active={id} root={root}>
      {(dark) => <MatrixPage route={route} dark={dark} root={root} />}
    </PageShell>
  </StrictMode>
);

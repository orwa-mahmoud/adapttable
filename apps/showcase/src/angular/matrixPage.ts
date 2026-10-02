/**
 * One page component for every Angular kit's landing and feature pages — the
 * Angular counterpart of `src/matrix/MatrixPage.tsx`.
 *
 * The words come from `matrix.mjs` through `../matrix/content`, the demo from
 * `featureBodies.ts`, and the kit's accent from the adapter's own token, so an
 * Angular kit's page reads exactly as its React neighbours do. The chrome is
 * the page's own; everything under the seam is the kit.
 */
import { NgComponentOutlet } from "@angular/common";
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  input,
  signal,
  ViewEncapsulation,
} from "@angular/core";

import { demoRoute } from "../../../../scripts/site.mjs";
import {
  docsUrl,
  featuresOf,
  fillTemplate,
  headFor,
  introFor,
  kitAccent,
  LANDING,
  landingIntro,
  type MatrixFeature,
  type MatrixRoute,
  otherKitsOf,
  SITE_HOME,
  snippetFor,
} from "../matrix/content";
import { AdaptShowcaseLandingTable, FEATURE_BODIES } from "./featureBodies";

/** Where every showcase page keeps the reader's theme between pages. */
const THEME_KEY = "adapttable-demo-theme";

const readStoredTheme = (): boolean => {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    // Storage can be unavailable (private mode): the page opens light.
    return false;
  }
};

const storeTheme = (dark: boolean): void => {
  try {
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage can be unavailable (private mode): the theme simply does not
    // persist across pages then.
  }
};

const escapeHtml = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * A paragraph of matrix copy as HTML: escaped, with `backticked` spans set as
 * code — the convention the served HTML uses, so a prop name reads as a prop
 * name whether the bundle has arrived or not.
 *
 * @param text - The paragraph.
 * @returns Its HTML.
 */
export const leadHtml = (text: string): string =>
  escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");

/** The AdaptTable wordmark, as every showcase page draws it. */
@Component({
  selector: "adapt-showcase-wordmark",
  template: `
    <a class="wm" [href]="href()">
      <svg
        class="wm__mark"
        viewBox="0 0 32 32"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <rect
          x="8.5"
          y="1.5"
          width="22"
          height="22"
          rx="5.5"
          fill="var(--brand)"
          opacity="0.25"
        />
        <rect
          x="5"
          y="5"
          width="22"
          height="22"
          rx="5.5"
          fill="var(--brand)"
          opacity="0.5"
        />
        <rect
          x="1.5"
          y="8.5"
          width="22"
          height="22"
          rx="5.5"
          fill="var(--brand)"
        />
        <rect x="4.5" y="12.5" width="16" height="2.8" rx="1.2" fill="#fff" />
        <rect
          x="11.1"
          y="12.5"
          width="2.8"
          height="14.5"
          rx="1.2"
          fill="#fff"
        />
        <rect
          x="4.5"
          y="18.8"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
        <rect
          x="4.5"
          y="23"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
        <rect
          x="15.9"
          y="18.8"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
        <rect
          x="15.9"
          y="23"
          width="4.6"
          height="2.2"
          rx="1"
          fill="#fff"
          opacity="0.4"
        />
      </svg>
      <span class="wm__txt">Adapt<strong>Table</strong></span>
    </a>
  `,
  host: { style: "display: contents" },
})
export class AdaptShowcaseWordmark {
  /** Where the wordmark links. */
  readonly href = input.required<string>();
}

/** Which page this is, and the relative prefix back to the showcase root. */
export interface MatrixPageContext {
  readonly route: MatrixRoute;
  readonly root: string;
}

/** The page the entry resolved from the served markup. */
export const MATRIX_PAGE = new InjectionToken<MatrixPageContext>(
  "adapttable showcase matrix page"
);

/**
 * The matrix page for one Angular kit.
 */
@Component({
  selector: "adapt-showcase-matrix-page",
  imports: [AdaptShowcaseWordmark, NgComponentOutlet],
  templateUrl: "./matrixPage.html",
  styleUrl: "./matrixPage.css",
  // The stylesheet addresses the kit's elements by part name, which lie in
  // the kit's own components, so it is global to the page.
  encapsulation: ViewEncapsulation.None,
})
export class AdaptShowcaseMatrixPage {
  private readonly page = inject(MATRIX_PAGE);
  /** Which kit and feature this page is for. */
  readonly route = signal(this.page.route).asReadonly();
  /** The relative prefix back to the showcase root. */
  readonly root = signal(this.page.root).asReadonly();

  /** Whether the page is dark. */
  readonly dark = signal(readStoredTheme());
  /** Which copy button last copied, for its "Copied" state. */
  readonly copied = signal<"code" | "install" | null>(null);

  readonly siteHome = SITE_HOME;
  readonly reactDemo = demoRoute();
  readonly gettingStarted = docsUrl("getting-started", "angular");
  readonly leadHtml = leadHtml;
  readonly docsUrl = (page: string): string => docsUrl(page, "angular");

  readonly adapter = computed(() => this.route().adapter);
  readonly feature = computed(() => this.route().feature);
  readonly fill = (text: string): string =>
    fillTemplate(text, this.adapter(), this.route().framework);

  readonly accent = computed(() => kitAccent(this.adapter(), this.dark()));
  readonly features = computed(() => featuresOf(this.adapter()));
  readonly otherKits = computed(() => otherKitsOf(this.adapter()));
  readonly landing = LANDING;

  /** A feature's label, heading and card as this kit states them. */
  readonly head = (feature: MatrixFeature) => headFor(feature, this.adapter());

  /** The heading around the kit's name, which is set in its accent. */
  readonly heading = computed(() => {
    const feature = this.feature();
    const text = this.fill(feature ? this.head(feature).h1 : LANDING.h1);
    const label = this.adapter().label;
    const at = text.indexOf(label);
    return at === -1
      ? { before: text, after: "" }
      : { before: text.slice(0, at), after: text.slice(at + label.length) };
  });

  /** The import the landing page's spec plate shows. */
  readonly importLine = computed(
    () => `import { AdaptDataTable } from "${this.adapter().pkg}";`
  );

  readonly intro = computed(() => {
    const feature = this.feature();
    return (
      feature ? introFor(feature, this.adapter()) : landingIntro(this.adapter())
    ).map((line) => this.fill(line));
  });

  readonly code = computed(() => {
    const feature = this.feature();
    return feature
      ? this.fill(snippetFor(feature, this.adapter(), this.route().framework))
      : "";
  });

  readonly note = computed(() => {
    const feature = this.feature();
    return feature ? feature.notes[this.adapter().key] : undefined;
  });

  readonly body = computed(() => {
    const feature = this.feature();
    if (!feature) return AdaptShowcaseLandingTable;
    const body = FEATURE_BODIES[feature.slug];
    if (!body) {
      throw new Error(`No Angular demo body for feature "${feature.slug}"`);
    }
    return body;
  });

  private copyTimer: number | undefined;

  constructor() {
    effect(() => {
      const dark = this.dark();
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      storeTheme(dark);
    });
    inject(DestroyRef).onDestroy(() => {
      window.clearTimeout(this.copyTimer);
    });
  }

  /** Flip the theme. */
  toggleDark(): void {
    this.dark.update((dark) => !dark);
  }

  /** Copy text to the clipboard and say so on the button that did it. */
  copy(which: "code" | "install", text: string): void {
    void navigator.clipboard.writeText(text);
    this.copied.set(which);
    window.clearTimeout(this.copyTimer);
    this.copyTimer = window.setTimeout(() => this.copied.set(null), 1400);
  }
}

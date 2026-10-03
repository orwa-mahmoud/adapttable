import "@angular/compiler";

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { type ColumnDef } from "@adapttable/angular";
import { standardPreset } from "@adapttable/taiga-ui/preset";
import { virtualize } from "@adapttable/taiga-ui/virtualize";
import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { TUI_DARK_MODE } from "@taiga-ui/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";
import { provideAdaptTaiga } from "./taigaRoot";

// @vitest-environment jsdom

/**
 * The unstyled table hydrating over its server render: the browser adopts
 * the server's elements, starts from the same URL state, and answers the
 * reader.
 *
 * Runs under `vitest.ssr.config.ts`, in a browser window but with no browser
 * testing platform, so the server platform can render first.
 */

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: "1", name: "Amman" },
  { id: "2", name: "Dubai" },
  { id: "3", name: "Irbid" },
];

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", header: "City", sortable: true, accessor: (row) => row.name },
];

@Component({
  selector: "app-root",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="cities"
      [columns]="columns"
      [rowKey]="rowKey"
      [defaults]="{ limit: 2 }"
      [forceMobile]="false"
      [features]="features"
    />
  `,
})
class App {
  readonly cities = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly features = [
    ...standardPreset<City>({ filters: [] }),
    virtualize({ estimateRowSize: 40 }),
  ];
}

/**
 * The app's hydration providers. Angular picks the server's or the browser's
 * half when they are created, so each render creates its own.
 */
const hydration = () => [
  ...provideAdaptTaiga(),
  {
    // jsdom has no system media queries. Keep the real native popup while
    // supplying its supported theme signal, as in the browser unit fixtures.
    provide: TUI_DARK_MODE,
    useFactory: () => {
      const darkMode = signal(false);
      return Object.assign(darkMode, { reset: () => darkMode.set(false) });
    },
  },
  provideZonelessChangeDetection(),
  provideClientHydration(),
];

const rows = () => [
  ...document.querySelectorAll('[data-adapttable-part="row"]'),
];
const names = () => rows().map((row) => row.textContent?.trim());

// The inline event-dispatch contract an Angular CLI app's index.html
// carries, which records the reader's clicks until hydration replays them.
const CONTRACT = readFileSync(
  createRequire(import.meta.url).resolve(
    "@angular/core/event-dispatch-contract.min.js"
  ),
  "utf8"
);
/** Where the contract keeps the events it recorded, per application. */
const EARLY_EVENTS = "_ejsas";
const SHELL = `<html><head></head><body><script id="ng-event-dispatch-contract">${CONTRACT}</script><app-root></app-root></body></html>`;

/** DOM constructor families installed by Angular's Domino server adapter. */
const SERVER_DOM_TYPE =
  /^(?:(?:HTML|SVG).*Element|CSSStyleDeclaration|CharacterData|Comment|DOMImplementation|DOMTokenList|Document|DocumentFragment|DocumentType|Element|NamedNodeMap|Node|NodeList|NodeFilter|ProcessingInstruction|Text|Window|Event|UIEvent|MouseEvent|CustomEvent|KeyboardEvent)$/;

/** Load the server's page at `url`, running its scripts as the browser would. */
async function loadServerPage(url: string): Promise<void> {
  const browser = jsdomWindow();
  // Angular's Domino server adapter assigns its DOM constructors to globalThis.
  // SSR and a real browser have separate realms; this fixture renders both in
  // one process, so restore its actual browser constructors before hydration.
  const browserTypes = Object.getOwnPropertyNames(browser)
    .filter((name) => SERVER_DOM_TYPE.test(name))
    .flatMap((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
      const value: unknown = Reflect.get(globalThis, name);
      return descriptor && typeof value === "function"
        ? [{ name, descriptor, value }]
        : [];
    });
  let html: string;
  try {
    html = await renderApplication(
      (context) =>
        bootstrapApplication(
          App,
          { providers: [...hydration(), provideServerRendering()] },
          context
        ),
      { document: SHELL, url }
    );
  } finally {
    for (const { name, descriptor, value } of browserTypes) {
      if (Reflect.get(globalThis, name) === value) continue;
      if ("value" in descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
      } else {
        // Vitest exposes browser constructors through accessor-backed globals.
        Reflect.set(globalThis, name, value);
      }
    }
  }
  for (const name of [
    "Element",
    "Event",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
  ]) {
    expect(Reflect.get(globalThis, name)).toBe(Reflect.get(browser, name));
  }
  history.replaceState(null, "", url);
  const page = new DOMParser().parseFromString(html, "text/html");
  const body = document.importNode(page.body, true);
  for (const parsed of body.querySelectorAll("script:not([type])")) {
    const script = document.createElement("script");
    script.textContent = parsed.textContent;
    parsed.replaceWith(script);
  }
  document.body.replaceWith(body);
  // The page's scripts run in jsdom's own window; Vitest's `window` is the
  // test's global, so hand the recorded early events across.
  Reflect.set(
    globalThis,
    EARLY_EVENTS,
    Reflect.get(jsdomWindow(), EARLY_EVENTS)
  );
}

/** The window jsdom runs the page's scripts in. */
function jsdomWindow(): object {
  const dom: unknown = Reflect.get(globalThis, "jsdom");
  const window: unknown =
    typeof dom === "object" && dom !== null
      ? Reflect.get(dom, "window")
      : undefined;
  if (typeof window !== "object" || window === null) {
    throw new Error("The hydration spec runs in Vitest's jsdom environment.");
  }
  return window;
}

beforeEach(() => {
  vi.spyOn(console, "error");
});

afterEach(() => {
  try {
    expect(console.error).not.toHaveBeenCalled();
  } finally {
    vi.restoreAllMocks();
    history.replaceState(null, "", "/");
    document.body.replaceChildren();
    Reflect.deleteProperty(globalThis, EARLY_EVENTS);
  }
});

describe("the Taiga UI Angular table hydrating over its server render", () => {
  it("adopts the server's rows, starts from the same page, and answers the reader", async () => {
    await loadServerPage("/cities?page=2");
    const serverRow = rows()[0];
    expect(names()).toEqual(["Irbid"]);
    const app = await bootstrapApplication(App, { providers: hydration() });
    try {
      await app.whenStable();
      expect(console.error).not.toHaveBeenCalled();
      // Hydration keeps the server's elements rather than drawing new ones.
      expect(rows()[0]).toBe(serverRow);
      expect(names()).toEqual(["Irbid"]);

      document
        .querySelector<HTMLButtonElement>('[data-taiga-part="page-prev"]')!
        .click();
      await app.whenStable();
      expect(names()).toEqual(["Amman", "Dubai"]);
      expect(new URLSearchParams(location.search).get("page")).toBeNull();
    } finally {
      app.destroy();
    }
  });

  it("replays a click the reader made before the table hydrated", async () => {
    await loadServerPage("/cities?page=2");
    document
      .querySelector<HTMLButtonElement>('[data-taiga-part="page-prev"]')!
      .click();
    expect(names()).toEqual(["Irbid"]);

    const app = await bootstrapApplication(App, { providers: hydration() });
    try {
      await app.whenStable();
      await vi.waitFor(() => {
        expect(names()).toEqual(["Amman", "Dubai"]);
      });
    } finally {
      app.destroy();
    }
  });

  it("keeps the requested page size selected before and after hydration", async () => {
    await loadServerPage("/cities?limit=25");
    const select = document.querySelector<HTMLInputElement>(
      '[data-taiga-part="rows-per-page"]'
    )!;
    // Vitest aliases defaultView to its global, whose Event SSR replaces.
    const browser = jsdomWindow() as Window & typeof globalThis;
    expect(select.getAttribute("role")).toBe("combobox");
    expect(select.value).toBe("25");
    expect(select.getAttribute("aria-expanded")).toBe("false");

    const app = await bootstrapApplication(App, { providers: hydration() });
    try {
      await app.whenStable();
      expect(document.querySelector('[data-taiga-part="rows-per-page"]')).toBe(
        select
      );
      expect(select.value).toBe("25");

      select.focus();
      select.click();
      await app.whenStable();
      expect(select.getAttribute("aria-expanded")).toBe("true");
      const popup = document.getElementById(
        select.getAttribute("aria-controls")!
      )!;
      expect(popup).not.toBeNull();
      const options = [
        ...popup.querySelectorAll<HTMLButtonElement>("button[tuiOption]"),
      ];
      expect(options[0]?.textContent.trim()).toBe("2");
      const choice = options.find(
        (option) => option.textContent.trim() === "10"
      )!;
      choice.click();
      await app.whenStable();
      expect(select.value).toBe("10");
      expect(new URLSearchParams(location.search).get("limit")).toBe("10");

      history.replaceState(null, "", "/cities?limit=50");
      browser.dispatchEvent(new browser.PopStateEvent("popstate"));
      await app.whenStable();
      expect(select.value).toBe("50");
      expect(select.getAttribute("aria-expanded")).toBe("false");
      expect(select.getAttribute("role")).toBe("combobox");
    } finally {
      app.destroy();
    }
  });
});

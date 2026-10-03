// @vitest-environment jsdom
import "@angular/compiler";

/**
 * The unstyled table hydrating over its server render: the browser adopts
 * the server's elements, starts from the same URL state, and answers the
 * reader.
 *
 * Runs under `vitest.ssr.config.ts`, in a browser window but with no browser
 * testing platform, so the server platform can render first.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import type { ColumnDef } from "@adapttable/angular";
import { standardPreset } from "@adapttable/ngx-bootstrap/preset";
import { virtualize } from "@adapttable/ngx-bootstrap/virtualize";
import {
  type ApplicationRef,
  Component,
  provideZonelessChangeDetection,
} from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { AdaptDataTable } from "./dataTable";

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

/** Load the server's page at `url`, running its scripts as the browser would. */
async function loadServerPage(url: string): Promise<void> {
  const html = await renderApplication(
    (context) =>
      bootstrapApplication(
        App,
        { providers: [...hydration(), provideServerRendering()] },
        context
      ),
    { document: SHELL, url }
  );
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

describe("the unstyled Angular table hydrating over its server render", () => {
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

  it("adopts the server's rows, starts from the same page, and answers the reader", async () => {
    await loadServerPage("/cities?page=2");
    const serverRow = rows()[0];
    expect(names()).toEqual(["Irbid"]);
    const app = await bootstrapApplication(App, { providers: hydration() });
    await app.whenStable();
    expect(console.error).not.toHaveBeenCalled();
    // Hydration keeps the server's elements rather than drawing new ones.
    expect(rows()[0]).toBe(serverRow);
    expect(names()).toEqual(["Irbid"]);

    document
      .querySelector<HTMLButtonElement>(
        '[data-ngx-bootstrap-part="page-prev"]'
      )!
      .click();
    await app.whenStable();
    expect(names()).toEqual(["Amman", "Dubai"]);
    expect(new URLSearchParams(location.search).get("page")).toBeNull();
    app.destroy();
  });

  it("keeps the requested page size selected before and after hydration", async () => {
    await loadServerPage("/cities?limit=25");
    const select = document.querySelector<HTMLSelectElement>(
      '[data-ngx-bootstrap-part="rows-per-page"]'
    )!;
    // Vitest aliases defaultView to its global, whose Event SSR replaces.
    const browser = jsdomWindow() as Window & typeof globalThis;
    expect(select.options[0]?.value).toBe("2");
    expect(select.value).toBe("25");
    expect(
      [...select.options]
        .filter((option) => option.hasAttribute("selected"))
        .map((option) => option.value)
    ).toEqual(["25"]);

    const app = await bootstrapApplication(App, { providers: hydration() });
    try {
      await app.whenStable();
      expect(
        document.querySelector('[data-ngx-bootstrap-part="rows-per-page"]')
      ).toBe(select);
      expect(select.value).toBe("25");

      select.value = "10";
      select.dispatchEvent(new browser.Event("change"));
      await app.whenStable();
      expect(select.value).toBe("10");
      expect(new URLSearchParams(location.search).get("limit")).toBe("10");

      history.replaceState(null, "", "/cities?limit=50");
      browser.dispatchEvent(new browser.PopStateEvent("popstate"));
      await app.whenStable();
      expect(select.value).toBe("50");
      expect([...select.selectedOptions].map((option) => option.value)).toEqual(
        ["50"]
      );
    } finally {
      app.destroy();
    }
  });
});

/**
 * Known compatibility exception: ngx-bootstrap 22.0.0 calls preventDefault
 * on replayed native-anchor clicks, which Angular 22 rejects. Keep fixture and
 * error checks in suite hooks: Vitest 4.1.11 also inverts per-test hook failures
 * for it.fails, but a beforeAll/afterAll failure remains a genuine suite failure.
 */
describe("ngx-bootstrap 22 pre-hydration pagination exception", () => {
  let app: ApplicationRef | undefined;
  const assertKnownReplayError = () => {
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      "ERROR",
      expect.objectContaining({
        message:
          "`preventDefault` called during event replay. Because event replay occurs " +
          "after browser dispatch, `preventDefault` would have no effect. You can " +
          "check whether an event is being replayed by accessing the event phase: " +
          "`event.eventPhase === EventPhase.REPLAY`.",
        stack: expect.stringContaining("PaginationComponent.selectPage"),
      })
    );
  };

  beforeAll(async () => {
    // Observe the known upstream error; keep real console output and fail for
    // every unexpected error rather than replacing Angular's ErrorHandler.
    vi.spyOn(console, "error");
    await loadServerPage("/cities?page=2");
    expect(console.error).not.toHaveBeenCalled();
    const serverRow = rows()[0];
    const previous = document.querySelector<HTMLAnchorElement>(
      '[data-ngx-bootstrap-part="page-prev"]'
    )!;
    expect(previous.tagName).toBe("A");
    expect(previous.closest("pagination")).not.toBeNull();
    const replace = vi.spyOn(history, "replaceState");
    const push = vi.spyOn(history, "pushState");
    previous.click();
    expect(names()).toEqual(["Irbid"]);

    app = await bootstrapApplication(App, { providers: hydration() });
    await app.whenStable();
    await vi.waitFor(assertKnownReplayError);
    expect(rows()[0]).toBe(serverRow);
    expect(names()).toEqual(["Irbid"]);
    expect(location.pathname + location.search).toBe("/cities?page=2");
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  afterAll(() => {
    try {
      app?.destroy();
      assertKnownReplayError();
    } finally {
      vi.restoreAllMocks();
      history.replaceState(null, "", "/");
      document.body.replaceChildren();
      Reflect.deleteProperty(globalThis, EARLY_EVENTS);
    }
  });

  it.fails(
    "replays a click the reader made before the table hydrated",
    async () => {
      await vi.waitFor(() => {
        expect(names()).toEqual(["Amman", "Dubai"]);
      });
    }
  );
});

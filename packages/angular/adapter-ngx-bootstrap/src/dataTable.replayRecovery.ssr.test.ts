// @vitest-environment jsdom
import "@angular/compiler";

/**
 * Isolated diagnostic for recovery after ngx-bootstrap rejects a replayed
 * native-anchor click. This does not replace or weaken the original hydration
 * replay gate in dataTable.hydration.ssr.test.ts.
 *
 * Runs under `vitest.ssr.config.ts`, in a browser window but with no browser
 * testing platform, so the server platform can render first.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import type { ColumnDef } from "@adapttable/angular";
import { standardPreset } from "@adapttable/ngx-bootstrap/preset";
import { virtualize } from "@adapttable/ngx-bootstrap/virtualize";
import { Component, provideZonelessChangeDetection } from "@angular/core";
import {
  bootstrapApplication,
  provideClientHydration,
} from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { afterEach, describe, expect, it, vi } from "vitest";

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

/** The exact Angular 22 error observed in the unchanged hydration gate. */
const REPLAY_ERROR =
  "`preventDefault` called during event replay. Because event replay occurs " +
  "after browser dispatch, `preventDefault` would have no effect. You can " +
  "check whether an event is being replayed by accessing the event phase: " +
  "`event.eventPhase === EventPhase.REPLAY`.";

afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(null, "", "/");
  document.body.replaceChildren();
  Reflect.deleteProperty(globalThis, EARLY_EVENTS);
});

describe("ngx-bootstrap rejected-replay recovery diagnostic", () => {
  it("handles one second outer-anchor click on the same hydrated app after the first replay is rejected", async () => {
    // Observe the diagnostic's known error without suppressing console output
    // or replacing Angular's ErrorHandler. Every extra error fails below.
    const errors = vi.spyOn(console, "error");
    await loadServerPage("/cities?page=2");
    expect(errors).not.toHaveBeenCalled();
    const serverRow = rows()[0];
    const previous = document.querySelector<HTMLAnchorElement>(
      '[data-ngx-bootstrap-part="page-prev"]'
    )!;
    expect(previous.tagName).toBe("A");
    expect(previous.closest("pagination")).not.toBeNull();
    expect(previous.getAttribute("aria-disabled")).toBe("false");
    expect(names()).toEqual(["Irbid"]);
    const replace = vi.spyOn(history, "replaceState");
    const push = vi.spyOn(history, "pushState");

    // Identical target and native activation to the original failing gate.
    previous.click();
    expect(names()).toEqual(["Irbid"]);
    expect(location.pathname + location.search).toBe("/cities?page=2");
    expect(replace).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    const app = await bootstrapApplication(App, { providers: hydration() });
    try {
      await app.whenStable();
      await vi.waitFor(() => expect(errors).toHaveBeenCalledTimes(1));
      const assertOnlyRejectedReplay = () => {
        expect(errors).toHaveBeenCalledExactlyOnceWith(
          "ERROR",
          expect.objectContaining({
            message: REPLAY_ERROR,
            stack: expect.stringContaining("PaginationComponent.selectPage"),
          })
        );
      };
      assertOnlyRejectedReplay();
      expect(app.destroyed).toBe(false);
      expect(rows()[0]).toBe(serverRow);
      expect(names()).toEqual(["Irbid"]);
      expect(location.pathname + location.search).toBe("/cities?page=2");
      expect(replace).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
      expect(
        document.querySelector('[data-ngx-bootstrap-part="page-prev"]')
      ).toBe(previous);
      expect(previous.isConnected).toBe(true);

      // Keep this application and its native anchor alive. No reload, new
      // bootstrap, synthetic event rewriting, or programmatic page selection.
      previous.click();
      await app.whenStable();
      await vi.waitFor(() => {
        expect(names()).toEqual(["Amman", "Dubai"]);
        expect(location.pathname + location.search).toBe("/cities?atv=1");
      });
      expect(replace).toHaveBeenCalledExactlyOnceWith(
        null,
        "",
        "/cities?atv=1"
      );
      expect(push).not.toHaveBeenCalled();
      expect(previous.getAttribute("aria-disabled")).toBe("true");
      expect(
        document
          .querySelector(
            '[data-ngx-bootstrap-part="page-number"][aria-current="page"]'
          )
          ?.textContent?.trim()
      ).toBe("1");
      assertOnlyRejectedReplay();

      // A further stable turn must not retry the lost event or write again.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      await app.whenStable();
      expect(names()).toEqual(["Amman", "Dubai"]);
      expect(location.pathname + location.search).toBe("/cities?atv=1");
      expect(replace).toHaveBeenCalledExactlyOnceWith(
        null,
        "",
        "/cities?atv=1"
      );
      expect(push).not.toHaveBeenCalled();
      assertOnlyRejectedReplay();
    } finally {
      app.destroy();
    }
    expect(errors).toHaveBeenCalledTimes(1);
  });
});

import "@angular/compiler";

import type { FilterHeaderControlProps } from "@adapttable/angular/adapter";
import { defaultLabels } from "@adapttable/core";
import {
  Component,
  Directive,
  ElementRef,
  inject,
  provideZonelessChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  provideServerRendering,
  renderApplication,
} from "@angular/platform-server";
import { expect, it, vi } from "vitest";

import { AdaptHeaderFilterTrigger } from "../header-filters/headerFilterTrigger";

const setExtra = vi.fn();
const setExtras = vi.fn();
const readDirection = vi.fn(() => {
  throw new Error("A browser direction read ran during SSR");
});

@Directive({ selector: "[serverDirectionProbe]" })
class ServerDirectionProbe {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    Object.defineProperty(element, "closest", { value: readDirection });
  }
}

@Component({
  selector: "app-root",
  imports: [AdaptHeaderFilterTrigger, ServerDirectionProbe],
  template: `<div dir="rtl">
    <adapt-header-filter-trigger serverDirectionProbe [props]="props" />
  </div>`,
})
class App {
  readonly props: FilterHeaderControlProps<never> = {
    def: { key: "team", type: "select", label: "Team", options: [] },
    source: {
      extra: {},
      setExtra,
      setExtras,
      allFilteredRows: [],
      facets: {},
    },
    labels: defaultLabels,
  };
}

it("renders a closed header filter on the server without browser direction reads", async () => {
  expect(typeof globalThis.window).toBe("undefined");
  expect(typeof globalThis.document).toBe("undefined");
  const html = await renderApplication(
    (context) =>
      bootstrapApplication(
        App,
        {
          providers: [
            provideZonelessChangeDetection(),
            provideServerRendering(),
          ],
        },
        context
      ),
    {
      document: "<html><body><app-root></app-root></body></html>",
      url: "/people",
    }
  );
  expect(html).toContain('data-adapttable-part="filter-header-trigger"');
  expect(html).toContain('aria-label="Team"');
  expect(html).not.toContain('data-adapttable-part="filter-header-cell"');
  expect(readDirection).not.toHaveBeenCalled();
  expect(setExtra).not.toHaveBeenCalled();
  expect(setExtras).not.toHaveBeenCalled();
});

import { type SavedView, type TableLabels } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, signal, type TemplateRef, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import { type AngularKitUnderTest, kitComponent } from "../kit";

/**
 * The shared `savedViewsPanel.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function savedViewsPanelTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { kitSelector } = kit;
  const AdaptSavedViewsPanel = kitComponent(kit, "AdaptSavedViewsPanel");
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The native saved-views panel: the parts, and the actions each row offers.
     */

    const VIEWS: readonly SavedView[] = [
      { name: "Mine", search: "t.q=a" },
      { name: "Team", search: "t.q=b", isDefault: true },
      { name: "Shared", search: "t.q=c", readOnly: true },
    ];

    @Component({
      imports: [AdaptSavedViewsPanel],
      template: `
        <ng-template #note>Kept from last year.</ng-template>
        <adapt-saved-views-panel
          [views]="views()"
          [onApply]="onApply"
          [onRename]="onRename"
          [onMove]="onMove"
          [onSetDefault]="onSetDefault"
          [onRemove]="onRemove"
          [labels]="labels()"
          [footer]="footer()"
          [className]="className()"
        />
      `,
    })
    class Host {
      readonly views = signal<readonly SavedView[]>(VIEWS);
      readonly labels = signal<Partial<TableLabels> | undefined>(undefined);
      readonly footer = signal<TemplateRef<unknown> | string | undefined>(
        "Upgraded on load."
      );
      readonly className = signal<string | undefined>("views");
      readonly onApply = vi.fn<(name: string) => void>();
      readonly onRename = vi.fn<(from: string, to: string) => void>();
      readonly onMove = vi.fn<(name: string, delta: number) => void>();
      readonly onSetDefault = vi.fn<(name: string) => void>();
      readonly onRemove = vi.fn<(name: string) => void>();
      private readonly note = viewChild.required<TemplateRef<unknown>>("note");

      useNote(): void {
        this.footer.set(this.note());
      }
    }

    function mount(): {
      host: Host;
      root: HTMLElement;
      detect: () => void;
    } {
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      return {
        host: fixture.componentInstance,
        root: fixture.nativeElement as HTMLElement,
        detect: () => {
          fixture.detectChanges();
        },
      };
    }

    function part(root: ParentNode, name: string): HTMLElement | null {
      return root.querySelector<HTMLElement>(kitSelector(name));
    }

    describe("AdaptSavedViewsPanel", () => {
      it("shows the empty message, a template footer, and a custom title", () => {
        const { root, host, detect } = mount();
        host.views.set([]);
        host.labels.set({ savedViews: "Library" });
        host.footer.set(undefined);
        detect();
        expect(part(root, "saved-view-row")).toBeNull();
        expect(part(root, "saved-views-footer")).toBeNull();
        expect(root.textContent?.match(/Library/g)?.length).toBeGreaterThan(1);

        host.useNote();
        detect();
        expect(part(root, "saved-views-footer")?.textContent).toContain(
          "Kept from last year."
        );
      });
    });
  });
}

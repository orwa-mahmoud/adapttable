import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import {
  Component,
  computed,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import { type AngularKitUnderTest, kitComponent } from "../kit";

/**
 * The shared `sidePanel.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function sidePanelTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { kitSelector } = kit;
  const { sidePanel } = kit.features;
  const AdaptSidePanelFrame = kitComponent(kit, "AdaptSidePanelFrame");
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The each kit side panel: a docked frame, its tabs, and the close control.
     */

    const part = (name: string) =>
      document.querySelector<HTMLElement>(kitSelector(name));

    describe("sidePanel", () => {
      it("is a feature", () => {
        expect(
          sidePanel({ panels: [], open: null, onOpenChange: () => undefined })
        ).toBeTruthy();
      });
    });

    describe("AdaptSidePanelFrame", () => {
      it("outlets a body without a header, and nothing when both are absent", async () => {
        @Component({
          imports: [AdaptSidePanelFrame],
          template: `
            <ng-template #body>Only the body</ng-template>
            <adapt-side-panel-frame [props]="frameProps()" />
          `,
        })
        class FrameHost {
          readonly body = viewChild<TemplateRef<unknown>>("body");
          readonly withBody = signal(false);
          readonly frameProps = computed(() => ({
            side: "end" as const,
            body: this.withBody() ? this.body() : undefined,
          }));
        }
        const fixture = TestBed.createComponent(FrameHost);
        document.body.append(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(part("side-panel")?.textContent).not.toContain("Only the body");

        fixture.componentInstance.withBody.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(part("side-panel")?.textContent).toContain("Only the body");
      });
    });
  });
}

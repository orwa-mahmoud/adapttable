import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { TAIGA_CONTROLS } from "../taigaControls";
import { AdaptTaigaEditorValidation } from "./editorValidation";

@Component({
  imports: [...TAIGA_CONTROLS, AdaptTaigaEditorValidation],
  template: `<tui-textfield
    ><input
      tuiInput
      aria-label="Name"
      [ngModel]="value"
      [adaptTaigaEditorValidation]="error()"
  /></tui-textfield>`,
})
class ValidationHost {
  readonly value = "Ada";
  readonly error = signal<string | undefined>("Host rejected this name");
}

it("uses native Taiga validity when the host omits an error-description ID", async () => {
  const fixture = TestBed.createComponent(ValidationHost);
  document.body.append(fixture.nativeElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const field = (fixture.nativeElement as HTMLElement).querySelector("input")!;
  expect(field.getAttribute("aria-invalid")).toBe("true");
  expect(field.getAttribute("aria-describedby")).toBe("");
  fixture.componentInstance.error.set(undefined);
  await fixture.whenStable();
  await expect.poll(() => field.getAttribute("aria-invalid")).toBe("false");
  expect(field.getAttribute("aria-describedby")).toBe("");
  expect(field.checkValidity()).toBe(true);
  fixture.destroy();
});

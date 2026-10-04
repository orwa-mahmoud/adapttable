/** Keep semantic part selectors and validation attributes on Material's native checkbox. */
import {
  type AfterViewChecked,
  Directive,
  ElementRef,
  inject,
  input,
} from "@angular/core";

/** @internal */
@Directive({ selector: "mat-checkbox[adaptCheckboxPart]" })
export class AdaptMaterialCheckboxAttrs implements AfterViewChecked {
  readonly adaptCheckboxPart = input.required<string>();
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  ngAfterViewChecked(): void {
    const host = this.element.nativeElement;
    const input = host.querySelector<HTMLInputElement>("input");
    if (!input) return;
    input.dataset.adapttablePart = this.adaptCheckboxPart();
    delete host.dataset.adapttablePart;
    for (const name of [
      "aria-invalid",
      "aria-describedby",
      "aria-busy",
      "data-conflict",
    ]) {
      const value = host.getAttribute(name);
      if (value === null) input.removeAttribute(name);
      else input.setAttribute(name, value);
    }
  }
}

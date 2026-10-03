import { Directive, effect, inject, input } from "@angular/core";
import { TuiDropdownDirective } from "@taiga-ui/core";

/** Name the actual native portal of a freeform dropdown. */
@Directive({ selector: "[adaptTaigaDropdownLabel]" })
export class AdaptTaigaDropdownLabel {
  readonly adaptTaigaDropdownLabel = input.required<string>();
  private readonly dropdown = inject(TuiDropdownDirective);

  constructor() {
    effect(() => {
      const label = this.adaptTaigaDropdownLabel();
      const popup = this.dropdown.ref()?.location.nativeElement as
        HTMLElement | undefined;
      popup?.setAttribute("aria-label", label);
    });
  }
}

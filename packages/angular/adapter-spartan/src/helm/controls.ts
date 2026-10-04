/**
 * Package-owned Helm layer, adapted from Spartan 1.5 (MIT).
 * These directives are internal: applications customize the documented CSS
 * tokens and table classNames, never import the copied implementation.
 */
import { type Attrs } from "@adapttable/angular";
import {
  afterEveryRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  inject,
  input,
} from "@angular/core";
import { BrnButton } from "@spartan-ng/brain/button";
import { BrnCheckbox } from "@spartan-ng/brain/checkbox";
import {
  BrnFieldControl,
  BrnFieldControlDescribedBy,
} from "@spartan-ng/brain/field";
import { BrnInput } from "@spartan-ng/brain/input";

/** Internal Helm button: behavior stays in Brain. */
@Directive({
  selector: "button[adaptHlmButton], a[adaptHlmButton]",
  hostDirectives: [{ directive: BrnButton, inputs: ["disabled"] }],
  host: { class: "at-spartan-button", "data-slot": "button" },
})
export class HlmButton {}

/** Internal Helm input, including textarea and native date/number fields. */
@Directive({
  selector: "[adaptHlmInput]",
  hostDirectives: [
    { directive: BrnInput, inputs: ["id", "forceInvalid"] },
    { directive: BrnFieldControlDescribedBy, inputs: ["aria-describedby"] },
  ],
  host: {
    class: "at-spartan-input",
    "data-slot": "input",
    "[attr.aria-invalid]":
      "control.forceInvalid() || field.invalid() ? 'true' : null",
  },
})
export class HlmInput {
  protected readonly control = inject(BrnInput);
  protected readonly field = inject(BrnFieldControl);
}

/**
 * The Helm native-select variant keeps native option semantics on the control
 * carrying the public part. This includes the keyboard multi-select editor.
 */
@Directive({
  selector: "select[adaptHlmNativeSelect]",
  hostDirectives: [
    BrnFieldControl,
    { directive: BrnFieldControlDescribedBy, inputs: ["aria-describedby"] },
  ],
  host: { class: "at-spartan-select", "data-slot": "native-select" },
})
export class HlmNativeSelect {}

/** Internal Helm option: use platform colors inside the native popup. */
@Directive({
  selector: "option[adaptHlmNativeOption]",
  host: { class: "at-spartan-option", "data-slot": "native-select-option" },
})
export class HlmNativeOption {}

/** Internal Helm checkbox style applied to Brain's focusable button. */
@Directive({ selector: "brn-checkbox[adaptHlmCheckbox]" })
export class HlmCheckbox {
  private readonly checkbox = inject(BrnCheckbox);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.checkbox.class();
      this.checkbox
        .checkbox()
        .nativeElement.classList.add("at-spartan-checkbox");
    });
    afterEveryRender(() => {
      const host = this.host.nativeElement;
      const button = this.checkbox.checkbox().nativeElement;
      // Part markers move once; their absence on the host in later renders
      // must not remove the marker from the actual control.
      for (const name of ["data-adapttable-part", "data-spartan-part"]) {
        const value = host.getAttribute(name);
        if (value !== null) button.setAttribute(name, value);
        host.removeAttribute(name);
      }
      for (const name of ["aria-invalid", "aria-busy", "data-conflict"]) {
        const value = host.getAttribute(name);
        if (value === null) button.removeAttribute(name);
        else button.setAttribute(name, value);
      }
      const value = host.dataset.value;
      if (value === undefined) button.removeAttribute("value");
      else button.setAttribute("value", value);
      if (this.checkbox.required())
        button.setAttribute("aria-required", "true");
      else button.removeAttribute("aria-required");
    });
  }
}

/** Selection attrs are translated to Brain inputs, rather than native inputs. */
@Component({
  selector: "adapt-spartan-selection",
  imports: [BrnCheckbox, HlmCheckbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<brn-checkbox
    adaptHlmCheckbox
    data-spartan-part="checkbox"
    [class]="userClass() ?? ''"
    [checked]="attrs()['checked'] === true"
    [indeterminate]="attrs()['indeterminate'] === true"
    [disabled]="attrs()['disabled'] === true"
    [aria-label]="label()"
    (checkedChange)="toggle()"
  />`,
})
export class SpartanSelection {
  readonly attrs = input.required<Attrs>();
  readonly class = input<string | undefined>();
  readonly userClass = this.class;

  protected label(): string {
    const label = this.attrs()["aria-label"];
    return typeof label === "string" ? label : "";
  }

  protected toggle(): void {
    const handler = this.attrs().onChange;
    if (typeof handler === "function") {
      (handler as (event: Event) => void)(new Event("change"));
    }
  }
}

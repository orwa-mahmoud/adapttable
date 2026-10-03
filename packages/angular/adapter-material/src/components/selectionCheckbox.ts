/** Angular Material selection control with the binding's native-input contract. */
import { AdaptAttrs, type Attrs } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  viewChild,
} from "@angular/core";
import { MatCheckbox, MatCheckboxModule } from "@angular/material/checkbox";

/** @internal */
@Component({
  selector: "adapt-selection-checkbox",
  imports: [AdaptAttrs, MatCheckboxModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <mat-checkbox
      [checked]="attrs().checked === true"
      [indeterminate]="attrs().indeterminate === true"
      [disabled]="attrs().disabled === true"
      [adaptAttrs]="inputAttrs()"
      [adaptAttrsTarget]="inputElement"
      (change)="change()"
      (click)="$event.stopPropagation()"
    ></mat-checkbox>
  `,
})
export class AdaptSelectionCheckbox {
  readonly attrs = input.required<Attrs>();
  readonly part = input<string>();
  readonly className = input<string>();

  private readonly checkboxElement = viewChild<
    MatCheckbox,
    ElementRef<HTMLElement>
  >(MatCheckbox, { read: ElementRef });
  protected readonly inputElement = (): HTMLInputElement | null =>
    this.checkboxElement()?.nativeElement.querySelector<HTMLInputElement>(
      "input"
    ) ?? null;

  /** Material owns change dispatch; refs, keyboard handlers and native mixed state remain intact. */
  protected readonly inputAttrs = computed((): Attrs => ({
    ...this.attrs(),
    onChange: undefined,
    "data-adapttable-part":
      this.part() === "checkbox"
        ? undefined
        : (this.part() ?? this.attrs()["data-adapttable-part"]),
    class: [
      "mdc-checkbox__native-control",
      "adapt-material-checkbox",
      this.attrs().class,
      this.className(),
    ]
      .filter(Boolean)
      .join(" "),
  }));

  protected change(): void {
    const change = this.attrs().onChange;
    if (this.attrs().disabled !== true && typeof change === "function") {
      (change as () => void)();
    }
  }
}

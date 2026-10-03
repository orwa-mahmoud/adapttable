/** Angular Aria select: composite keyboard behavior with adapter-owned pixels. */
import {
  Combobox,
  ComboboxPopup,
  ComboboxWidget,
} from "@angular/aria/combobox";
import { Listbox, Option } from "@angular/aria/listbox";
import { CdkConnectedOverlay } from "@angular/cdk/overlay";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from "@angular/core";

/** A labeled choice used by the adapter's Aria select. */
export interface AriaChoice {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

/** @internal An Aria combobox and listbox with a CDK-positioned popup. */
@Component({
  selector: "adapt-aria-select",
  imports: [
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    Option,
    CdkConnectedOverlay,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: inline-block; min-width: 0" },
  template: `
    <div
      ngCombobox
      #trigger="ngCombobox"
      class="adapt-aria-select"
      [attr.data-adapttable-part]="part()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      [(expanded)]="expanded"
    >
      {{ display() }} <span aria-hidden="true">⌄</span>
    </div>
    <ng-template
      [cdkConnectedOverlayOrigin]="trigger.element"
      [cdkConnectedOverlayOpen]="expanded()"
      [cdkConnectedOverlayHasBackdrop]="false"
      (overlayOutsideClick)="expanded.set(false)"
    >
      <ng-template ngComboboxPopup [combobox]="trigger">
        <div class="adapt-aria adapt-aria-popup">
          <div
            ngListbox
            ngComboboxWidget
            #list="ngListbox"
            [tabindex]="-1"
            focusMode="activedescendant"
            selectionMode="explicit"
            [attr.aria-label]="label()"
            [activeDescendant]="list.activeDescendant()"
            [value]="[value()]"
            (valueChange)="choose($event, trigger)"
          >
            @for (option of options(); track option.value) {
              <div
                ngOption
                [value]="option.value"
                [label]="option.label"
                [disabled]="option.disabled === true"
              >
                {{ option.label }}
              </div>
            }
          </div>
        </div>
      </ng-template>
    </ng-template>
  `,
})
export class AdaptAriaSelect {
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly options = input.required<readonly AriaChoice[]>();
  readonly part = input<string>();
  readonly disabled = input(false);
  readonly valueChange = output<string>();
  protected readonly expanded = signal(false);
  protected readonly display = computed(
    () =>
      this.options().find((option) => option.value === this.value())?.label ??
      this.value()
  );

  protected choose(values: string[], trigger: Combobox): void {
    const value = values[0];
    if (value === undefined) return;
    this.valueChange.emit(value);
    this.expanded.set(false);
    trigger.element.focus();
  }
}

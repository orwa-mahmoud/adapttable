/**
 * The AI page's settings drawer: what the table wires, which actions need a
 * human, where they are asked, what saving means, what the agent is told and
 * may do. Scaffolding around the table, so it stays in the page's language
 * and out of the table's direction.
 */
import type { ApprovalPresentation } from "@adapttable/core";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  output,
  viewChild,
} from "@angular/core";

import {
  APPROVAL_CHOICES,
  type ApprovalOverride,
  DEMO_EXCLUSIONS,
  DEMO_FEATURES,
  type DemoActionApproval,
  type DemoContextProfile,
  type DemoEditingMode,
  type DemoFeatureKey,
  type DemoToggles,
  EDITING_MODES,
  OPTIONS_TEXT,
  PRESENTATIONS,
  PROFILES,
  SAVING,
} from "../shared/aiDemo";

/** One approval answer from the drawer. */
export interface ApprovalAnswer {
  readonly key: string;
  readonly next: ApprovalOverride | "inherit";
}

@Component({
  selector: "adapt-ai-demo-options",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="ai-opts"
      [attr.aria-label]="text.title"
      data-testid="ai-demo-options-drawer"
      (cancel)="$event.preventDefault(); closed.emit()"
    >
      <header class="ai-opts__head">
        <h3>{{ text.title }}</h3>
        <button
          type="button"
          class="ai-opts__close"
          [attr.aria-label]="text.close"
          (click)="closed.emit()"
        >
          ✕
        </button>
      </header>

      <div class="ai-opts__body">
        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.features }}</h4>
          <p class="ai-opts__help">{{ text.featuresHelp }}</p>
          <div class="ai-opts__row ai-opts__row--mode">
            <span>
              <span class="ai-opts__label">{{ text.editingMode }}</span>
              <span class="ai-opts__hint">{{ text.editingModeHelp }}</span>
            </span>
            <div class="seg" role="group" [attr.aria-label]="text.editingMode">
              @for (mode of editingModes; track mode.value) {
                <button
                  type="button"
                  class="seg__btn"
                  [class.is-on]="toggles().editingMode === mode.value"
                  [attr.aria-pressed]="toggles().editingMode === mode.value"
                  [attr.data-testid]="'ai-editing-' + mode.value"
                  (click)="editingMode.emit(mode.value)"
                >
                  {{ mode.label }}
                </button>
              }
            </div>
          </div>
          @for (feature of features; track feature.key) {
            <label class="ai-opts__row">
              <input
                type="checkbox"
                [attr.aria-label]="feature.label"
                [checked]="toggles()[feature.key]"
                [attr.data-testid]="'ai-toggle-' + feature.key"
                (change)="toggle.emit(feature.key)"
              />
              <span>
                <span class="ai-opts__label">{{ feature.label }}</span>
                <span class="ai-opts__hint">{{ feature.help }}</span>
              </span>
            </label>
          }
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.approvals }}</h4>
          <p class="ai-opts__help">{{ text.approvalsHelp }}</p>
          @for (action of actions(); track action.key) {
            <div class="ai-opts__row">
              <span>
                <span class="ai-opts__label">{{ action.label }}</span>
                <span class="ai-opts__hint">{{ action.description }}</span>
              </span>
              <span class="ai-opts__choices">
                <select
                  [attr.aria-label]="text.approvalFor(action.label)"
                  [attr.data-testid]="'ai-approval-' + action.key"
                  [value]="action.inherited ? 'inherit' : action.policy"
                  (change)="answer(action.key, $event)"
                >
                  @for (choice of approvalChoices; track choice.value) {
                    <option
                      [value]="choice.value"
                      [selected]="
                        (action.inherited ? 'inherit' : action.policy) ===
                        choice.value
                      "
                    >
                      {{ choice.label }}
                    </option>
                  }
                </select>
              </span>
            </div>
          } @empty {
            <p class="ai-opts__hint">{{ text.noApprovals }}</p>
          }
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.location }}</h4>
          <p class="ai-opts__help">{{ text.locationHelp }}</p>
          @for (option of presentations; track option.value) {
            <label class="ai-opts__row">
              <input
                type="radio"
                name="ai-approval-location"
                [attr.aria-label]="option.label"
                [value]="option.value"
                [checked]="presentation() === option.value"
                [attr.data-testid]="'ai-presentation-' + option.value"
                (change)="presentationChange.emit(option.value)"
              />
              <span>
                <span class="ai-opts__label">{{ option.label }}</span>
                <span class="ai-opts__hint">{{ option.help }}</span>
              </span>
            </label>
          }
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.saving }}</h4>
          @for (option of saving; track option.value) {
            <label class="ai-opts__row">
              <input
                type="radio"
                name="ai-saving"
                [attr.aria-label]="option.label"
                [value]="option.value"
                [checked]="commit() === option.value"
                [disabled]="
                  option.value === 'stage' && toggles().editingMode !== 'batch'
                "
                [attr.data-testid]="'ai-commit-' + option.value"
                (change)="commitChange.emit(option.value)"
              />
              <span>
                <span class="ai-opts__label">{{ option.label }}</span>
                <span class="ai-opts__hint">{{ option.help }}</span>
              </span>
            </label>
          }
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.told }}</h4>
          <p class="ai-opts__help">{{ text.toldHelp }}</p>
          @for (option of profiles; track option.value) {
            <label class="ai-opts__row">
              <input
                type="radio"
                name="ai-context-profile"
                [attr.aria-label]="option.label"
                [value]="option.value"
                [checked]="contextProfile() === option.value"
                [attr.data-testid]="'ai-profile-' + option.value"
                (change)="contextProfileChange.emit(option.value)"
              />
              <span>
                <span class="ai-opts__label">{{ option.label }}</span>
                <span class="ai-opts__hint">{{ option.help }}</span>
              </span>
            </label>
          }
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.may }}</h4>
          <p class="ai-opts__help">{{ text.mayHelp }}</p>
          @for (exclusion of exclusions; track exclusion.key) {
            <label class="ai-opts__row">
              <input
                type="checkbox"
                [attr.aria-label]="exclusion.label"
                [checked]="!excluded().includes(exclusion.key)"
                [attr.data-testid]="'ai-offer-' + exclusion.key"
                (change)="offer.emit(exclusion.key)"
              />
              <span>
                <span class="ai-opts__label">{{ exclusion.label }}</span>
                <span class="ai-opts__hint">{{ exclusion.help }}</span>
              </span>
            </label>
          }
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.browser }}</h4>
          <label class="ai-opts__row">
            <input
              type="checkbox"
              [attr.aria-label]="text.webmcp"
              [checked]="webmcp() && webmcpAvailable()"
              [disabled]="!webmcpAvailable()"
              data-testid="ai-toggle-webmcp"
              (change)="webmcpChange.emit(!webmcp())"
            />
            <span>
              <span class="ai-opts__label">{{ text.webmcp }}</span>
              <span class="ai-opts__hint">{{
                webmcpAvailable() ? text.webmcpHelp : text.webmcpMissing
              }}</span>
            </span>
          </label>
        </section>

        <section class="ai-opts__section">
          <h4 class="ai-opts__heading">{{ text.direction }}</h4>
          <label class="ai-opts__row">
            <input
              type="checkbox"
              [attr.aria-label]="text.rtl"
              [checked]="rtl()"
              data-testid="ai-toggle-rtl"
              (change)="rtlChange.emit(!rtl())"
            />
            <span>
              <span class="ai-opts__label">{{ text.rtl }}</span>
              <span class="ai-opts__hint">{{ text.rtlHelp }}</span>
            </span>
          </label>
        </section>
      </div>

      <footer class="ai-opts__foot">
        <button
          type="button"
          class="ai-opts__reset"
          data-testid="ai-reset"
          (click)="reset.emit()"
        >
          {{ text.reset }}
        </button>
        <button
          type="button"
          class="ai-opts__done"
          data-testid="ai-demo-options-done"
          (click)="closed.emit()"
        >
          {{ text.done }}
        </button>
      </footer>
    </dialog>
  `,
})
export class AiDemoOptions {
  readonly open = input.required<boolean>();
  readonly toggles = input.required<DemoToggles>();
  readonly actions = input.required<readonly DemoActionApproval[]>();
  readonly presentation = input.required<ApprovalPresentation>();
  readonly commit = input.required<"stage" | "immediate">();
  readonly rtl = input.required<boolean>();
  readonly contextProfile = input.required<DemoContextProfile>();
  readonly excluded = input.required<readonly string[]>();
  readonly webmcp = input.required<boolean>();
  readonly webmcpAvailable = input.required<boolean>();

  readonly closed = output();
  readonly editingMode = output<DemoEditingMode>();
  readonly toggle = output<DemoFeatureKey>();
  readonly approval = output<ApprovalAnswer>();
  readonly presentationChange = output<ApprovalPresentation>();
  readonly commitChange = output<"stage" | "immediate">();
  readonly rtlChange = output<boolean>();
  readonly contextProfileChange = output<DemoContextProfile>();
  readonly offer = output<string>();
  readonly webmcpChange = output<boolean>();
  readonly reset = output();

  readonly text = OPTIONS_TEXT;
  readonly editingModes = EDITING_MODES;
  readonly features = DEMO_FEATURES;
  readonly approvalChoices = APPROVAL_CHOICES;
  readonly presentations = PRESENTATIONS;
  readonly saving = SAVING;
  readonly profiles = PROFILES;
  readonly exclusions = DEMO_EXCLUSIONS;

  // Optional: an effect can run before the view's queries resolve, and
  // reading the signal there is what reruns it once the dialog exists.
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>("dialog");

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (element) this.sync(element, this.open());
    });
    // Dismissal from the dark around the panel: the backdrop belongs to the
    // dialog, so a click is read against the panel's own box.
    const dismiss = (event: MouseEvent): void => {
      const element = this.dialog()?.nativeElement;
      if (!element || event.target !== element) return;
      const box = element.getBoundingClientRect();
      const onPanel =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
      if (!onPanel) this.closed.emit();
    };
    afterNextRender(() => {
      this.dialog()?.nativeElement.addEventListener("click", dismiss);
    });
    inject(DestroyRef).onDestroy(() => {
      this.dialog()?.nativeElement.removeEventListener("click", dismiss);
    });
  }

  /** Open or close the native dialog with the host's state. */
  private sync(element: HTMLDialogElement, open: boolean): void {
    if (open && !element.open) {
      const view = element.ownerDocument.defaultView;
      const top = view?.scrollY;
      const left = view?.scrollX;
      element.showModal();
      // Stop a pending page scroll before the modal holds the background.
      view?.scrollTo({ top, left, behavior: "instant" });
    }
    if (!open && element.open) element.close();
  }

  answer(key: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const next = APPROVAL_CHOICES.find(
      (choice) => choice.value === target.value
    )?.value;
    if (next) this.approval.emit({ key, next });
  }
}

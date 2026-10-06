/**
 * Direct rename of a column from its header: a pencil, then the name field,
 * over the binding's rename editor.
 */
import type { TableLabels } from "@adapttable/angular";
import {
  AdaptAttrs,
  AdaptLiveRegion,
  injectColumnRenameEditor,
} from "@adapttable/angular/adapter";
import { Component, computed, input } from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/**
 * The header's caption, replaced by the name field while a rename is open.
 *
 * The host's `onRename` is the layout's `setName`, which keeps the name and
 * tells the host.
 */
@Component({
  selector: "adapt-column-header-rename",
  imports: [
    AdaptAttrs,
    AdaptLiveRegion,
    NzButtonModule,
    NzInputModule,
    NzTypographyModule,
  ],
  template: `
    <button
      nz-button
      nzSize="small"
      nzType="text"
      type="button"
      data-adapttable-part="header-rename-button"
      [attr.aria-label]="renameLabel()"
      [disabled]="editor.editing()"
      (click)="$event.stopPropagation(); editor.begin()"
      (keydown)="$event.stopPropagation()"
    >
      <span aria-hidden="true">✎</span>
    </button>
    @if (editor.editing()) {
      <form
        data-adapttable-part="header-rename-form"
        style="display: inline-flex; align-items: center; gap: 4px"
        (submit)="save($event)"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
      >
        <label
          [attr.for]="editor.inputId"
          data-adapttable-part="header-rename-label"
        >
          {{ labels().columnName }}
        </label>
        <input
          nz-input
          nzSize="small"
          data-adapttable-part="header-rename-input"
          [adaptAttrs]="editor.inputAttrs()"
        />
        @if (editor.error(); as error) {
          <span
            nz-typography
            nzType="danger"
            [id]="editor.errorId"
            role="alert"
            data-adapttable-part="header-rename-error"
          >
            {{ error }}
          </span>
        }
        <button
          nz-button
          nzSize="small"
          nzType="primary"
          type="submit"
          data-adapttable-part="header-rename-save"
        >
          <span>{{ labels().saveColumnName }} </span>
        </button>
        <button
          nz-button
          nzSize="small"
          nzType="text"
          type="button"
          data-adapttable-part="header-rename-cancel"
          (click)="editor.cancel()"
        >
          <span>{{ labels().cancelColumnRename }} </span>
        </button>
      </form>
    } @else {
      <ng-content />
    }
    <div
      [adaptLiveRegion]="editor.announcement()"
      data-adapttable-part="header-rename-announcer"
      part="header-rename-announcer"
    ></div>
  `,
})
export class AdaptColumnHeaderRename {
  /** The column's stable key. */
  readonly columnKey = input.required<string>();
  /** The name on screen. */
  readonly name = input.required<string>();
  /** Writes the new name. */
  readonly onRename = input.required<(key: string, name: string) => void>();
  /** The table's labels. */
  readonly labels = input.required<Required<TableLabels>>();

  private readonly column = computed(() => ({
    key: this.columnKey(),
    name: this.name(),
    onRename: this.onRename(),
    requiredMessage: this.labels().columnNameRequired,
    renamedMessage: this.labels().columnRenamed,
  }));

  /** The open editor. */
  protected readonly editor = injectColumnRenameEditor({
    column: this.column,
  });

  /** The pencil's accessible name. */
  protected readonly renameLabel = computed(
    () => `${this.labels().renameColumn}: ${this.name()}`
  );

  /** Save from the form or Enter, and keep the keypress from sorting. */
  protected save(event: Event): void {
    event.preventDefault();
    this.editor.submit();
  }
}

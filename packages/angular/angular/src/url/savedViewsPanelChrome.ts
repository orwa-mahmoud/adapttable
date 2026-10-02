/**
 * Managing saved views: the list, and what you can do to each one.
 *
 * The saved-views menu answers "switch to a view". This answers "keep the
 * list in order" — rename, reorder, delete, and choose the one the table
 * opens with. Applying a view is clicking its name. The rest is an icon
 * cluster at the end of the row, in an order decided here once.
 *
 * Structure, part names, labels, glyphs and the row's layout live here.
 * Every visible control is a slot the kit fills. A slot's content is a
 * template, because an Angular slot cannot project children through the
 * control outlet.
 */
import {
  createSavedViewRenameController,
  resolveLabels,
  type SavedView,
  type SavedViewRowControlModel,
  savedViewRowControls,
  type TableLabels,
} from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";

/**
 * Inline styles for one row. Held once so every row shares the object.
 */
interface SavedViewsRowLayout {
  readonly row: Readonly<Record<string, string>>;
  readonly caption: Readonly<Record<string, string>>;
  readonly controls: Readonly<Record<string, string>>;
  readonly control: Readonly<Record<string, string>>;
}

/** The row, wrapping the cluster rather than truncating the name. */
const ROW_LAYOUT: SavedViewsRowLayout = {
  row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px",
    minWidth: "0",
  },
  caption: {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: "6px",
    flex: "1 1 9rem",
    minWidth: "0",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    flex: "0 0 auto",
    minWidth: "0",
  },
  control: { flex: "0 0 auto" },
};

/**
 * One view, ready for the kit's row.
 */
interface SavedViewsRowModel {
  readonly viewName: string;
  readonly isEditing: boolean;
  readonly isDefault: boolean;
  readonly readOnly: boolean;
  readonly defaultLabel: string;
  readonly readOnlyLabel: string;
  readonly applyLabel: string;
  readonly inputLabel: string;
  readonly draft: string;
  readonly onApply: () => void;
  readonly onDraft: (next: string) => void;
  readonly onCommit: () => void;
  readonly onCancel: () => void;
  readonly controls: readonly SavedViewRowControlModel[];
}

/**
 * The kit's controls for {@link AdaptSavedViewsPanelChrome}. Each is a
 * standalone component with one `props` input.
 *
 * @public
 */
export interface SavedViewsPanelSlots {
  /** The card: title, rows, and the optional footer. */
  readonly Surface: Type<unknown>;
  /** One view. */
  readonly Row: Type<unknown>;
  /** The inline rename field. */
  readonly Input: Type<unknown>;
  /** What the card says when the list is empty. */
  readonly Empty: Type<unknown>;
}

/**
 * One control's glyph. Paths come from core; the kit places this in the
 * button so the five icons are not redrawn per kit.
 *
 * @public
 */
@Component({
  selector: "adapt-saved-view-glyph",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    [attr.fill]="fill()"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    @for (d of glyph().paths; track d) {
      <path [attr.d]="d" />
    }
  </svg>`,
})
export class AdaptSavedViewGlyph {
  /** The shape core chose for this control. */
  readonly glyph = input.required<{
    readonly paths: readonly string[];
    readonly filled: boolean;
  }>();

  /** Filled when the control is the current default. */
  protected readonly fill = computed(() =>
    this.glyph().filled ? "currentColor" : "none"
  );
}

/**
 * One row of the panel: the name slot, and the props the kit's row reads.
 *
 * @internal
 */
@Component({
  selector: "adapt-saved-views-row-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl],
  template: `
    <ng-template #name>
      @if (row().isEditing) {
        <ng-container
          [adaptControl]="slots().Input"
          [adaptControlProps]="inputProps()"
        />
      } @else {
        {{ row().viewName }}
      }
    </ng-template>
    <ng-container
      [adaptControl]="slots().Row"
      [adaptControlProps]="rowProps()"
    />
  `,
})
export class AdaptSavedViewsRowChrome {
  /** The view and its controls. */
  readonly row = input.required<SavedViewsRowModel>();

  /** The kit's row and input. */
  readonly slots = input.required<SavedViewsPanelSlots>();

  private readonly name = viewChild<TemplateRef<unknown>>("name");

  /** The rename field, while this row is the one being renamed. */
  protected readonly inputProps = computed(() => {
    const row = this.row();
    return {
      label: row.inputLabel,
      value: row.draft,
      onChange: row.onDraft,
      onCommit: row.onCommit,
      onCancel: row.onCancel,
    };
  });

  /** What the kit's row renders. */
  protected readonly rowProps = computed(() => ({
    ...this.row(),
    name: this.name(),
    layout: ROW_LAYOUT,
    "data-adapttable-part": "saved-view-row",
  }));
}

/**
 * The saved-views management panel.
 *
 * @public
 */
@Component({
  selector: "adapt-saved-views-panel-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl, AdaptSavedViewsRowChrome, NgTemplateOutlet],
  template: `
    <ng-template #body>
      @if (rows().length === 0) {
        <ng-container
          [adaptControl]="slots().Empty"
          [adaptControlProps]="emptyProps()"
        />
      }
      @for (row of rows(); track row.viewName) {
        <adapt-saved-views-row-chrome [row]="row" [slots]="slots()" />
      }
    </ng-template>
    <ng-template #footerTpl>
      @if (footerNode(); as node) {
        <ng-container [ngTemplateOutlet]="node" />
      } @else {
        {{ footerText() }}
      }
    </ng-template>
    <ng-container
      [adaptControl]="slots().Surface"
      [adaptControlProps]="surfaceProps()"
    />
  `,
})
export class AdaptSavedViewsPanelChrome {
  /** The list, in the order to show it. */
  readonly views = input.required<readonly SavedView[]>();

  /** Apply a view. */
  readonly onApply = input.required<(name: string) => void>();

  /** Rename a view. */
  readonly onRename = input.required<(from: string, to: string) => void>();

  /** Move a view by one step. */
  readonly onMove = input.required<(name: string, delta: number) => void>();

  /** Make a view the default, or clear it. */
  readonly onSetDefault = input.required<(name: string) => void>();

  /** Delete a view. */
  readonly onRemove = input.required<(name: string) => void>();

  /** The kit's card, row, input and empty state. */
  readonly slots = input.required<SavedViewsPanelSlots>();

  /** Label overrides. Omitted keys keep the English default. */
  readonly labels = input<Partial<TableLabels>>();

  /** A note under the list. A string, or a template the host fills. */
  readonly footer = input<TemplateRef<unknown> | string>();

  /** Class on the card. */
  readonly className = input<string>();

  private readonly rename = createSavedViewRenameController();

  private readonly renameState = signal(this.rename.getSnapshot());

  private readonly body = viewChild<TemplateRef<unknown>>("body");

  private readonly footerTpl = viewChild<TemplateRef<unknown>>("footerTpl");

  constructor() {
    const stop = this.rename.subscribe(() => {
      this.renameState.set(this.rename.getSnapshot());
    });
    inject(DestroyRef).onDestroy(stop);
  }

  /** Resolved copy, English where the host passed nothing. */
  private readonly resolved = computed(() => resolveLabels(this.labels()));

  /**
   * The list, one model per view. Private so the row model stays inside
   * this component: a protected member would publish that type.
   */
  private readonly rows = computed(() => {
    const labels = this.resolved();
    const editing = this.renameState().editing;
    const draft = this.renameState().draft;
    const views = this.views();
    return views.map((view, index) =>
      this.rowModel(view, index, views.length, labels, editing, draft)
    );
  });

  /** The empty card's message. */
  protected readonly emptyProps = computed(() => ({
    message: this.resolved().savedViews,
  }));

  /** A host template, when the footer is one. */
  protected readonly footerNode = computed(() => {
    const footer = this.footer();
    return footer instanceof TemplateRef ? footer : undefined;
  });

  /** The footer sentence, when the footer is one. */
  protected readonly footerText = computed(() => {
    const footer = this.footer();
    return typeof footer === "string" ? footer : "";
  });

  /** The card. The list is read so this field stays live with the rows. */
  protected readonly surfaceProps = computed(() => {
    this.rows();
    this.footerNode();
    this.footerText();
    const footer = this.footer();
    return {
      title: this.resolved().savedViews,
      className: this.className(),
      children: this.body(),
      footer: footer === undefined ? undefined : this.footerTpl(),
      "data-adapttable-part": "saved-views-panel",
    };
  });

  /** Hand the draft to the host and close the field. */
  protected commitRename(): void {
    this.rename.commit((from, to) => {
      this.onRename()(from, to);
    });
  }

  /** Close the field without renaming. */
  protected cancelRename(): void {
    this.rename.cancel();
  }

  /** Keep the half-typed name. */
  protected setDraft(next: string): void {
    this.rename.setDraft(next);
  }

  private rowModel(
    view: SavedView,
    index: number,
    count: number,
    labels: ReturnType<typeof resolveLabels>,
    editing: string | null,
    draft: string
  ): SavedViewsRowModel {
    const isEditing = editing === view.name;
    return {
      viewName: view.name,
      isEditing,
      isDefault: view.isDefault === true,
      readOnly: view.readOnly === true,
      defaultLabel: labels.defaultViewBadge,
      readOnlyLabel: labels.readOnlyViewBadge,
      applyLabel: labels.applyView,
      inputLabel: labels.viewName,
      draft: isEditing ? draft : view.name,
      onApply: () => {
        this.onApply()(view.name);
      },
      onDraft: (next) => {
        this.setDraft(next);
      },
      onCommit: () => {
        this.commitRename();
      },
      onCancel: () => {
        this.cancelRename();
      },
      controls: savedViewRowControls({
        view,
        index,
        count,
        editing: isEditing,
        labels,
        onStartRename: () => {
          this.rename.begin(view.name);
        },
        onMove: (delta) => {
          this.onMove()(view.name, delta);
        },
        onSetDefault: () => {
          this.onSetDefault()(view.name);
        },
        onRemove: () => {
          this.onRemove()(view.name);
        },
      }),
    };
  }
}

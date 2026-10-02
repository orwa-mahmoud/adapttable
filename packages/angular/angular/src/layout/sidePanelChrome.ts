/**
 * The side panel: a docked frame beside the table, and the row that holds it.
 *
 * The tabs are a real tablist. Arrows wrap, Home and End jump, and Escape
 * closes. The kit draws the frame, each tab and the close control. The
 * header, the strip and the body stay here so every kit shares them.
 */
import {
  DEFAULT_SIDE_PANEL_ID_PREFIX,
  handleSidePanelBodyKey,
  handleSidePanelTabKey,
  sidePanelModel,
  sidePanelTabId,
  type TableLabels,
} from "@adapttable/core";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";
import type { SidePanelPanel } from "../features/factories";

/**
 * The kit's controls for {@link AdaptSidePanelChrome}. Each is a standalone
 * component with one `props` input.
 *
 * @public
 */
export interface SidePanelSlots {
  /** The docked frame. It outlets the header and the body. */
  readonly Frame: Type<unknown>;
  /** One tab. Omitted from the strip when there is only one panel. */
  readonly Tab: Type<unknown>;
  /** The control that closes the panel. */
  readonly Close: Type<unknown>;
}

/**
 * Place a panel beside the table body.
 *
 * Absent a panel, the body is projected unchanged: the region exists only
 * while something is beside it.
 *
 * @public
 */
@Component({
  selector: "adapt-side-panel-layout",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #body><ng-content /></ng-template>
    @if (panel(); as docked) {
      <div
        data-adapttable-part="table-region"
        style="display: flex; gap: 12px; align-items: flex-start"
        [style.flex-direction]="side() === 'start' ? 'row-reverse' : 'row'"
      >
        <div
          data-adapttable-part="table-region-main"
          style="flex: 1; min-width: 0"
        >
          <ng-container [ngTemplateOutlet]="body" />
        </div>
        <ng-container [ngTemplateOutlet]="docked" />
      </div>
    } @else {
      <ng-container [ngTemplateOutlet]="body" />
    }
  `,
})
export class AdaptSidePanelLayout {
  /** The panel beside the body. Absent, the body stands alone. */
  readonly panel = input<TemplateRef<unknown>>();
  /** Which edge the panel sits on. */
  readonly side = input<"start" | "end">("end");
}

/**
 * Renders the side panel, or nothing when there is nothing to show.
 *
 * @public
 */
@Component({
  selector: "adapt-side-panel-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl, NgTemplateOutlet],
  template: `
    @if (model(); as model) {
      <ng-template #header>
        <div
          data-adapttable-part="side-panel-header"
          style="display: flex; align-items: center; gap: 8px"
        >
          @if (model.tabbed) {
            <div
              role="tablist"
              data-adapttable-part="side-panel-tabs"
              [attr.aria-label]="model.tablistLabel"
              style="display: flex; flex: 1; gap: 4px"
            >
              @for (tab of tabProps(); track tab.buttonProps.id) {
                <ng-container
                  [adaptControl]="slots().Tab"
                  [adaptControlProps]="tab"
                />
              }
            </div>
          }
          <ng-container
            [adaptControl]="slots().Close"
            [adaptControlProps]="closeProps()"
          />
        </div>
      </ng-template>
      <ng-template #body>
        <div
          data-adapttable-part="side-panel-body"
          [id]="model.bodyId"
          [attr.role]="model.bodyRole"
          [attr.aria-labelledby]="model.bodyLabelledBy"
          [attr.aria-label]="model.bodyLabel"
          (keydown)="onBodyKey($event)"
        >
          @if (contentTemplate(); as tpl) {
            <ng-container [ngTemplateOutlet]="tpl" />
          } @else {
            {{ contentText() }}
          }
        </div>
      </ng-template>
      <ng-container
        [adaptControl]="slots().Frame"
        [adaptControlProps]="frameProps()"
      />
    }
  `,
})
export class AdaptSidePanelChrome {
  /** The panels, in tab order. Nothing renders when this is empty. */
  readonly panels = input.required<readonly SidePanelPanel[]>();
  /** Which panel is showing. */
  readonly openPanel = input.required<string>();
  /** Show a different panel. */
  readonly onOpenPanel = input.required<(key: string) => void>();
  /** Close the panel entirely. */
  readonly onClose = input.required<() => void>();
  /** Which edge to dock to. */
  readonly side = input<"start" | "end" | undefined>("end");
  /** Labels; gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** A unique id root, so two tables on a page do not collide. */
  readonly idPrefix = input<string | undefined>(undefined);
  /** A kit's own class for the frame. */
  readonly className = input<string | undefined>(undefined);
  /** The kit's frame, tabs and close control. */
  readonly slots = input.required<SidePanelSlots>();

  private readonly headerTpl = viewChild<TemplateRef<unknown>>("header");
  private readonly bodyTpl = viewChild<TemplateRef<unknown>>("body");

  /** The tab strip, the body and which panel is selected. */
  protected readonly model = computed(() =>
    sidePanelModel({
      panels: this.panels().map((panel) => ({
        ...panel,
        label: panel.label ?? panel.key,
      })),
      openPanel: this.openPanel(),
      idPrefix: this.idPrefix(),
      labels: this.labels(),
    })
  );

  /** The selected panel's template, when its content is one. */
  protected readonly contentTemplate = computed(() => {
    const content = this.model()?.selected.content;
    return content instanceof TemplateRef ? content : undefined;
  });

  /** The selected panel's text, when its content is not a template. */
  protected readonly contentText = computed(() => {
    const content = this.model()?.selected.content;
    return typeof content === "string" ? content : "";
  });

  /** Props for the kit's frame. */
  protected readonly frameProps = computed(() => ({
    side: this.side() ?? "end",
    className: this.className(),
    header: this.headerTpl(),
    body: this.bodyTpl(),
  }));

  /** Props for the kit's close control. Read only while a panel is showing. */
  protected readonly closeProps = computed(() => ({
    label: this.model()!.closeLabel,
    onClose: () => {
      this.onClose()();
    },
  }));

  /** Props for each kit tab. Stable until the strip or the handlers change. */
  protected readonly tabProps = computed(() =>
    this.model()!.tabs.map((tab) => this.tabBinding(tab))
  );

  /** Props for one kit tab. */
  private tabBinding(tab: {
    readonly panel: SidePanelPanel;
    readonly key: string;
    readonly id: string;
    readonly selected: boolean;
    readonly tabIndex: number;
    readonly controls: string;
  }): {
    readonly panel: SidePanelPanel;
    readonly selected: boolean;
    readonly buttonProps: {
      readonly id: string;
      readonly role: "tab";
      readonly type: "button";
      readonly tabIndex: number;
      readonly "aria-selected": boolean;
      readonly "aria-controls": string;
      readonly "data-adapttable-part": "side-panel-tab";
      readonly onClick: () => void;
      readonly onKeyDown: (event: KeyboardEvent) => void;
    };
  } {
    return {
      panel: tab.panel,
      selected: tab.selected,
      buttonProps: {
        id: tab.id,
        role: "tab",
        type: "button",
        tabIndex: tab.tabIndex,
        "aria-selected": tab.selected,
        "aria-controls": tab.controls,
        "data-adapttable-part": "side-panel-tab",
        onClick: () => {
          this.onOpenPanel()(tab.key);
        },
        onKeyDown: (event: KeyboardEvent) => {
          this.onTabKey(event);
        },
      },
    };
  }

  /** Escape closes. Arrows, Home and End move the selection, then focus. */
  private onTabKey(event: KeyboardEvent): void {
    const model = this.model()!;
    const key = handleSidePanelTabKey(event, {
      panels: this.panels(),
      selectedIndex: model.selectedIndex,
      onOpenPanel: (next) => {
        this.onOpenPanel()(next);
      },
      onClose: () => {
        this.onClose()();
      },
    });
    if (key === undefined) return;
    const prefix = this.idPrefix() ?? DEFAULT_SIDE_PANEL_ID_PREFIX;
    const id = CSS.escape(sidePanelTabId(prefix, key));
    const current = event.currentTarget;
    if (!(current instanceof Element)) return;
    current
      .closest('[data-adapttable-part="side-panel-tabs"]')
      ?.querySelector<HTMLElement>(`#${id}`)
      ?.focus();
  }

  /** Escape inside the body closes the panel and stops there. */
  protected onBodyKey(event: KeyboardEvent): void {
    handleSidePanelBodyKey(event, () => {
      this.onClose()();
    });
  }
}

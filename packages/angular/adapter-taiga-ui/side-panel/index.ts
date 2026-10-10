import {
  type AdaptTableFeature,
  extendFeature,
  slotRender,
  type TableLabels,
} from "@adapttable/angular";
import {
  AdaptSidePanelChrome,
  SIDE_PANEL,
  type SidePanelSlots,
} from "@adapttable/angular/adapter";
import {
  sidePanel as bindingSidePanel,
  type SidePanelOptions,
} from "@adapttable/angular/features";
import { ɵTAIGA_CONTROLS as TAIGA_CONTROLS } from "@adapttable/taiga-ui";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import {
  AdaptSidePanelClose,
  AdaptSidePanelFrame,
  AdaptSidePanelTab,
} from "./panel";

/**
 * The side panel — `@adapttable/taiga-ui/side-panel`.
 *
 * @packageDocumentation
 */

export { AdaptSidePanelClose, AdaptSidePanelFrame, AdaptSidePanelTab };

const SLOTS: SidePanelSlots = {
  Frame: AdaptSidePanelFrame,
  Tab: AdaptSidePanelTab,
  Close: AdaptSidePanelClose,
};

/**
 * The live panel: the chrome, filled with the native frame, tabs and close
 * control.
 */
@Component({
  selector: "adapt-side-panel-live",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...TAIGA_CONTROLS, AdaptSidePanelChrome],
  template: `
    <adapt-side-panel-chrome
      [panels]="props().panels"
      [openPanel]="props().openPanel"
      [onOpenPanel]="props().onOpenPanel"
      [onClose]="props().onClose"
      [side]="props().side"
      [labels]="props().labels"
      [idPrefix]="props().idPrefix"
      [className]="props().className"
      [slots]="slots"
    />
  `,
})
export class AdaptSidePanelLive {
  /** The table's panel props, without the kit's slots. */
  readonly props = input.required<{
    readonly panels: SidePanelOptions["panels"];
    readonly openPanel: string;
    readonly onOpenPanel: (key: string) => void;
    readonly onClose: () => void;
    readonly side?: "start" | "end";
    readonly labels?: TableLabels;
    readonly idPrefix?: string;
    readonly className?: string;
  }>();
  /** The kit's frame, tabs and close control. */
  readonly slots = SLOTS;
}

/**
 * A panel docked beside the table, drawn with native controls.
 *
 * @param options - See {@link SidePanelOptions}. `open` is the panel that is
 *   showing, or `null` while the dock is closed.
 * @returns The feature.
 *
 * @public
 */
export function sidePanel(options: SidePanelOptions): AdaptTableFeature {
  return extendFeature(bindingSidePanel(options), [
    slotRender(SIDE_PANEL, () => AdaptSidePanelLive),
  ]);
}

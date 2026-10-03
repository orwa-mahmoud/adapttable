/**
 * The side panel — `@adapttable/angular-cdk/side-panel`.
 *
 * @packageDocumentation
 */
import {
  AdaptSidePanelChrome,
  type AdaptTableFeature,
  extendFeature,
  SIDE_PANEL,
  sidePanel as bindingSidePanel,
  type SidePanelOptions,
  type SidePanelSlots,
  slotRender,
  type TableLabels,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import {
  AdaptSidePanelClose,
  AdaptSidePanelFrame,
  AdaptSidePanelTab,
} from "./panel";

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
  imports: [AdaptSidePanelChrome],
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

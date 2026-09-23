import { createElement, type ReactNode } from "react";

import { useFindState } from "../find/findMarks";
import { type FeatureRender, slotRender } from "../features/providers";
import {
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
} from "../features/slotKeys";
import type { AdapterFeatureComponent } from "./component";

/**
 * Props a kit's toolbar Find control receives: the toolbar's own props, plus
 * the open action and whether the find bar is showing.
 *
 * @public
 */
export interface AdapterFindButtonProps extends ToolbarExtrasSlotProps {
  /** Open the find bar. */
  readonly onOpenFind: () => void;
  /** Whether the find bar is showing, for `aria-expanded`. */
  readonly findOpen: boolean;
}

/**
 * Draw a kit's Find control among the toolbar's view controls, reading the
 * live find state. Renders nothing outside a table that composed find.
 *
 * @public
 */
export function findButtonRender(
  Button: AdapterFeatureComponent<AdapterFindButtonProps>
): FeatureRender<ToolbarExtrasSlotProps> {
  function LiveFindButton(props: Readonly<ToolbarExtrasSlotProps>): ReactNode {
    const find = useFindState();
    const openBar = find?.openBar;
    if (!find || !openBar) return null;
    return createElement(Button, {
      ...props,
      onOpenFind: openBar,
      findOpen: find.open,
    });
  }
  return slotRender(TOOLBAR_EXTRAS, (props) =>
    createElement(LiveFindButton, props)
  );
}

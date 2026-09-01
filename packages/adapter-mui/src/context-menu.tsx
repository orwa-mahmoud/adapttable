import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  extendFeature,
  slotRender,
  type TableFeature,
  useTableContextMenu,
} from "@adapttable/core/adapter";
import {
  contextMenu as core,
  type ContextMenuOptions,
} from "@adapttable/core/features";
import type { ReactNode } from "react";

import { ContextMenu } from "./components/ContextMenu";

function LiveContextMenu({
  children,
  container,
  ...hookOptions
}: Readonly<ContextMenuLiveSlotProps<never>>): ReactNode {
  const menu = useTableContextMenu(hookOptions);
  return (
    <>
      {children(menu.regionProps)}
      <ContextMenu
        items={menu.items}
        at={menu.at}
        onClose={menu.close}
        container={container ?? undefined}
        labels={hookOptions.labels}
      />
    </>
  );
}

/**
 * A right-click menu on rows and cells, drawn with MUI's own Menu.
 *
 * @public
 */
export function contextMenu<TRow>(
  options: boolean | ContextMenuOptions<TRow> = true
): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(CONTEXT_MENU_LIVE, (props) => <LiveContextMenu {...props} />),
  ]);
}

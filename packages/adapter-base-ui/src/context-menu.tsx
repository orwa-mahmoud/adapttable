import { createAdapterContextMenuFeature } from "@adapttable/react/adapter";

import { ContextMenu } from "./components/ContextMenu";

/** Add a right-click menu drawn with this kit's controls. @public */
export const contextMenu = createAdapterContextMenuFeature(ContextMenu);

import {
  type AdapterContextMenuProps,
  createAdapterContextMenuFeature,
} from "@adapttable/react/adapter";

import { useClassNames } from "./components/classNamesContext";
import { ContextMenu } from "./components/ContextMenu";

function ContextMenuSlot(props: Readonly<AdapterContextMenuProps>) {
  const classNames = useClassNames();
  return <ContextMenu {...props} classNames={classNames} />;
}

/** Add a right-click menu drawn with native controls. @public */
export const contextMenu = createAdapterContextMenuFeature(ContextMenuSlot);

import type { SavedViewsPanelChromeProps } from "@adapttable/core/adapter";
import {
  type DataTableClassNames,
  SavedViewsPanel as UnstyledSavedViewsPanel,
} from "@adapttable/unstyled";

import { shadcnClassNames } from "./classNames";

/**
 * The saved-views management panel, pre-styled with **shadcn/ui** tokens.
 *
 * The same wrapper `DataTable` is: native markup from `@adapttable/unstyled`
 * with the {@link shadcnClassNames} preset applied, merged per part under your
 * own `classNames`. A panel mounted beside a shadcn table is styled like it,
 * from one import and with nothing to hand-wire.
 *
 * @public
 */
export function SavedViewsPanel(
  props: Readonly<
    Omit<SavedViewsPanelChromeProps, "slots"> & {
      classNames?: DataTableClassNames;
    }
  >
) {
  const { classNames, ...rest } = props;
  return (
    <UnstyledSavedViewsPanel
      {...rest}
      classNames={
        classNames ? { ...shadcnClassNames, ...classNames } : shadcnClassNames
      }
    />
  );
}

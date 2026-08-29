import {
  type DataTableClassNames,
  type SavedView,
  SavedViewsPanel as UnstyledSavedViewsPanel,
  type TableLabels,
} from "@adapttable/unstyled";
import type { ReactNode } from "react";

import { shadcnClassNames } from "./classNames";

/**
 * What {@link SavedViewsPanel} accepts.
 *
 * Spelled out rather than derived from core's chrome props. Deriving it read
 * as one line and cost the whole slot family: naming a chrome type in a public
 * signature obliges the entry point to export it, that type names
 * `SavedViewsPanelSlots`, and the slots name the Empty / Input / Row / Surface
 * props and `SavedViewRowControl` behind them — seven symbols published to
 * describe controls this adapter fills in for you. The panel takes the views
 * and what to do with them; the slots are not yours to pass.
 *
 * @public
 */
export interface SavedViewsPanelProps {
  /** The saved views, in list order. */
  readonly views: readonly SavedView[];
  /** Apply one. */
  readonly onApply: (name: string) => void;
  /** Rename one. */
  readonly onRename: (from: string, to: string) => void;
  /** Move one a step. */
  readonly onMove: (name: string, delta: -1 | 1) => void;
  /** Make one the default, or clear it. */
  readonly onSetDefault: (name: string) => void;
  /** Delete one. */
  readonly onRemove: (name: string) => void;
  /** Labels; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /** Anything of yours that belongs inside the card, under the list. */
  readonly footer?: ReactNode;
  /** Class for the element. */
  readonly className?: string;
  /** Your class map, merged per key over the shadcn preset. */
  readonly classNames?: DataTableClassNames;
}

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
export function SavedViewsPanel(props: SavedViewsPanelProps) {
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

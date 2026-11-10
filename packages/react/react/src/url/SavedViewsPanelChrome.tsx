/**
 * Managing saved views: the list, and what you can do to each one.
 *
 * The saved-views *menu* answers "switch to a view". This answers "keep the
 * list in order" — rename, reorder, delete, and choose the one the table
 * opens with. They are different jobs and putting both in a dropdown makes
 * the common one harder, so this is a panel rather than a deeper menu.
 *
 * The panel is a card with a title, and each view is one row inside it. The
 * row has a single primary action: **applying the view is clicking its name**,
 * which is the thing a reader wants nine times out of ten and the widest
 * target on the row. Everything else — rename, move, default, delete — is an
 * icon in a compact cluster at the end of the line, each with its own
 * localized accessible name.
 *
 * That shape is a decision the chrome owns rather than each kit. Six equally
 * weighted text buttons per row read as six equal choices, and a list of views
 * where "Delete view" is as loud as the view's own name is a list that is
 * harder to use the more it holds.
 *
 * Reordering is buttons, not drag, for the same reason the pivot panel's is:
 * a list you can only reorder by dragging is a list some people cannot
 * reorder. Renaming is an inline text input rather than a modal prompt — the
 * name is right there, and a dialog to change one word is a dialog too many.
 *
 * Structure, ordering, part names, labels, glyphs and the row's layout live
 * here. Every visible control is a required slot the adapter fills with its
 * own kit's component.
 */
import {
  createSavedViewRenameController,
  type SavedViewGlyph,
  savedViewRowControls,
} from "@adapttable/core";
import {
  resolveFeatureLabels,
  SAVED_VIEW_LABELS,
  type SavedViewRowControl as NeutralSavedViewRowControl,
  type SavedViewsPanelChromeProps as NeutralSavedViewsPanelChromeProps,
  type SavedViewsPanelRowProps as NeutralSavedViewsPanelRowProps,
  type SavedViewsPanelSlots as NeutralSavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps as NeutralSavedViewsPanelSurfaceProps,
} from "@adapttable/core/binding";
import {
  type CSSProperties,
  type ReactNode,
  useState,
  useSyncExternalStore,
} from "react";

import type { SavedView } from "./useSavedViews";

const SAVED_VIEW_GROUPS = [SAVED_VIEW_LABELS] as const;

export type { SavedView };

/**
 * The row's own shape: the name, growing to fill the line, and the control
 * cluster hugging its end.
 *
 * A panel is mounted in a sidebar as often as in a page, and a row laid out by
 * each adapter drifted exactly as far as each kit's default: six controls in a
 * no-wrap flex row truncated their captions to "Set a", and six controls in
 * normal flow ran into the next view's name. Both are the same missing
 * decision, so the decision lives here and every kit spreads it.
 */
const ROW: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

/**
 * The name and its badges, together and never touching.
 *
 * `nowrap` inside: a badge that drops to its own line reads as a second row,
 * and the name beside it stops looking like the control it is. The row around
 * this one wraps instead, so a panel too narrow for both moves the whole
 * control cluster down rather than breaking the caption in half.
 */
const CAPTION: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 6,
  // Takes the line, and gives the cluster its own row rather than squeezing it
  // once the panel is narrower than this.
  flex: "1 1 9rem",
  minWidth: 0,
};

/** The icon cluster, kept together at the end of the line. */
const CONTROLS: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 2,
  flex: "0 0 auto",
  minWidth: 0,
};

/** One control — an icon square, never stretched. */
const CONTROL: CSSProperties = { flex: "0 0 auto" };

/** Held once so a row's props keep their identity between renders. */
const ROW_LAYOUT = {
  row: ROW,
  caption: CAPTION,
  controls: CONTROLS,
  control: CONTROL,
} as const;

/**
 * The cluster's glyphs.
 *
 * Drawn here rather than per kit for the same reason the column menu's eye,
 * grip and pin are: five icons redrawn eight times is five icons that drift
 * eight ways, and none of them carries meaning a kit could express better. The
 * kit still owns the button around them — its size, its shape, its focus ring
 * and its danger colour.
 */
const glyph = ({ paths, filled }: SavedViewGlyph): ReactNode => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.9}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {paths.map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

export type {
  SavedViewControlKey,
  SavedViewsPanelEmptyProps,
  SavedViewsPanelInputProps,
} from "@adapttable/core/binding";

/**
 * One control in a row's cluster — `@adapttable/core`'s `SavedViewRowControl`
 * drawing a React node for its glyph.
 *
 * @public
 */
export type SavedViewRowControl = NeutralSavedViewRowControl<ReactNode>;

/**
 * Props an adapter's panel surface receives — `@adapttable/core`'s
 * `SavedViewsPanelSurfaceProps` drawing React nodes.
 *
 * @public
 */
export type SavedViewsPanelSurfaceProps =
  NeutralSavedViewsPanelSurfaceProps<ReactNode>;

/**
 * Props an adapter's row receives — `@adapttable/core`'s
 * `SavedViewsPanelRowProps` with React's nodes and inline styles.
 *
 * @public
 */
export type SavedViewsPanelRowProps = NeutralSavedViewsPanelRowProps<
  ReactNode,
  CSSProperties
>;

/**
 * The kit-native pieces the panel is built from — `@adapttable/core`'s
 * `SavedViewsPanelSlots` drawing React nodes.
 *
 * @public
 */
export type SavedViewsPanelSlots = NeutralSavedViewsPanelSlots<
  ReactNode,
  CSSProperties
>;

/**
 * What the panel needs to render — `@adapttable/core`'s
 * `SavedViewsPanelChromeProps` with React's nodes and slots.
 *
 * @public
 */
export type SavedViewsPanelChromeProps = NeutralSavedViewsPanelChromeProps<
  ReactNode,
  CSSProperties
>;

/**
 * The saved-views management panel.
 *
 * @param props - The views, the operations, and the adapter's slots.
 * @returns The panel, built from the adapter's own controls.
 *
 * @public
 */
export function SavedViewsPanelChrome({
  views,
  onApply,
  onRename,
  onMove,
  onSetDefault,
  onRemove,
  labels: labelsProp,
  footer,
  slots,
  className,
}: Readonly<SavedViewsPanelChromeProps>) {
  const labels = resolveFeatureLabels(labelsProp, SAVED_VIEW_GROUPS);
  const { Surface, Row, Input, Empty } = slots;
  // Which view is being renamed, and the draft. Held here rather than by the
  // host: a half-typed name is the panel's business, not the table's.
  const [rename] = useState(createSavedViewRenameController);
  const { editing, draft } = useSyncExternalStore(
    rename.subscribe,
    rename.getSnapshot,
    rename.getSnapshot
  );

  // Focus when the element arrives rather than in an effect: kits portal or
  // mount their inputs a tick later, and an effect would run too early.
  const focusOnArrival = (element: HTMLInputElement | null) => {
    element?.focus();
  };

  const commit = () => {
    rename.commit(onRename);
  };

  /** The cluster for one view, in the order every kit renders it. */
  const controlsFor = (
    view: SavedView,
    index: number
  ): readonly SavedViewRowControl[] =>
    savedViewRowControls({
      view,
      index,
      count: views.length,
      editing: editing === view.name,
      labels,
      onStartRename: () => {
        rename.begin(view.name);
      },
      onMove: (delta) => {
        onMove(view.name, delta);
      },
      onSetDefault: () => {
        onSetDefault(view.name);
      },
      onRemove: () => {
        onRemove(view.name);
      },
    }).map(({ glyph: shape, ...control }) => ({
      ...control,
      icon: glyph(shape),
    }));

  return (
    <Surface
      className={className}
      title={labels.savedViews}
      footer={footer}
      data-adapttable-part="saved-views-panel"
    >
      {views.length === 0 && <Empty message={labels.savedViews} />}
      {views.map((view, index) => (
        <Row
          key={view.name}
          data-adapttable-part="saved-view-row"
          layout={ROW_LAYOUT}
          viewName={view.name}
          isEditing={editing === view.name}
          isDefault={view.isDefault === true}
          readOnly={view.readOnly === true}
          defaultLabel={labels.defaultViewBadge}
          readOnlyLabel={labels.readOnlyViewBadge}
          name={
            editing === view.name ? (
              <Input
                label={labels.viewName}
                ref={focusOnArrival}
                value={draft}
                onChange={rename.setDraft}
                onCommit={commit}
                onCancel={rename.cancel}
              />
            ) : (
              view.name
            )
          }
          onApply={() => {
            onApply(view.name);
          }}
          applyLabel={labels.applyView}
          controls={controlsFor(view, index)}
        />
      ))}
    </Surface>
  );
}

export type { BaseDataTableProps } from "../props";

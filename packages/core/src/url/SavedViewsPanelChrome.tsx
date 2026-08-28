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
import { type CSSProperties, type ReactNode, useState } from "react";

import { resolveLabels } from "../labels";
import type { BaseDataTableProps } from "../props";
import type { TableLabels } from "../types";
import type { SavedView } from "./useSavedViews";

export type { BaseDataTableProps, SavedView };

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
const glyph = (paths: readonly string[], filled = false): ReactNode => (
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

const PENCIL = ["M4 20h4l10-10-4-4L4 16v4z", "M14 6l4 4"];
const ARROW_UP = ["M12 19V5", "M6 11l6-6 6 6"];
const ARROW_DOWN = ["M12 5v14", "M6 13l6 6 6-6"];
const STAR = [
  "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5z",
];
const TRASH = [
  "M4 7h16",
  "M9 7V4h6v3",
  "M6 7l1 13h10l1-13",
  "M10 11v6",
  "M14 11v6",
];

/**
 * Which control a cluster entry is. Stable across kits, and across renders.
 *
 * @public
 */
export type SavedViewControlKey =
  "rename" | "moveUp" | "moveDown" | "default" | "remove";

/**
 * One control in a row's cluster.
 *
 * The adapter maps over these rather than hand-writing five buttons, so a kit
 * cannot render four of them, order them differently, or miss the disabled
 * state on the one control this reader may not use.
 *
 * @public
 */
export interface SavedViewRowControl {
  /** Which control this is — the React key, and what a test asks for. */
  readonly key: SavedViewControlKey;
  /** The accessible name, already localized. These controls are icon-only. */
  readonly label: string;
  /** The glyph to draw inside the kit's own icon button. */
  readonly icon: ReactNode;
  /**
   * Run it, or `undefined` when this reader may not — a view someone else
   * owns, or a move off the end of the list. The adapter renders the control
   * disabled rather than dropping it: a button that vanishes on the last row
   * makes every row jump as the list is reordered.
   */
  readonly onPress?: () => void;
  /** Whether the toggle is currently on. Only the default control sets it. */
  readonly pressed?: boolean;
  /** Destructive, so the kit can reach for its own danger colour. */
  readonly danger?: boolean;
}

/**
 * Props an adapter's panel surface receives.
 *
 * @public
 */
export interface SavedViewsPanelSurfaceProps {
  /** The card's heading, already localized. */
  readonly title: string;
  /** Content rendered inside. */
  readonly children: ReactNode;
  /**
   * Anything the host wants inside the card, under the list — a note about
   * where the views came from, a link to the docs. Outside the card it reads
   * as a caption belonging to whatever follows it.
   */
  readonly footer?: ReactNode;
  /** Class for the element. */
  readonly className?: string;
  /** Spread onto the surface — the public part name. */
  readonly "data-adapttable-part": "saved-views-panel";
}

/**
 * Props an adapter's row receives — one saved view and its controls.
 *
 * @public
 */
export interface SavedViewsPanelRowProps {
  /** The view's name, or the rename input while it is being edited. */
  readonly name: ReactNode;
  /** That name as plain text — the apply control's accessible name. */
  readonly viewName: string;
  /** Whether the name slot currently holds the rename input. */
  readonly isEditing: boolean;
  /** Whether this is the view the table opens with. */
  readonly isDefault: boolean;
  /**
   * Whether this reader may change it. A team view someone else owns is
   * read-only, and the row must SHOW that: every control arrives without a
   * handler, so a kit that renders them disabled says "not yours" rather than
   * leaving a button that silently does nothing.
   */
  readonly readOnly: boolean;
  /** The badge caption for the default view. */
  readonly defaultLabel: string;
  /** The badge caption for a view this reader cannot change. */
  readonly readOnlyLabel: string;
  /** Apply it — what clicking the name does. */
  readonly onApply: () => void;
  /** What applying is called, for the name control's tooltip. */
  readonly applyLabel: string;
  /** The cluster, in order: rename, up, down, default, delete. */
  readonly controls: readonly SavedViewRowControl[];
  /**
   * The row's layout, owned by the chrome so a panel reads the same in every
   * kit: `row` on the row itself, `caption` on the group holding the name and
   * its badges, `controls` on the cluster, and `control` on each button. The
   * kit supplies the components; these supply the shape.
   */
  readonly layout: {
    readonly row: CSSProperties;
    readonly caption: CSSProperties;
    readonly controls: CSSProperties;
    readonly control: CSSProperties;
  };
  /** Spread onto the row — the public part name. */
  readonly "data-adapttable-part": "saved-view-row";
}

/**
 * Props an adapter's rename input receives.
 *
 * @public
 */
export interface SavedViewsPanelInputProps {
  /** Accessible name. */
  readonly label: string;
  /**
   * Attach to the underlying input element. The panel takes focus through
   * this rather than through `autoFocus`: the browser attribute fires once at
   * mount whether or not the element was the point of the interaction, which
   * is why it reads as an accessibility problem. Here the focus follows a
   * deliberate click on Rename.
   *
   * Kits whose input component hands back something other than the DOM node —
   * antd's `InputRef`, for one — unwrap it before calling this.
   */
  readonly ref: (element: HTMLInputElement | null) => void;
  /** Current value. */
  readonly value: string;
  /** Called with the new value. */
  readonly onChange: (next: string) => void;
  /** Enter commits, Escape abandons — bind both. */
  readonly onCommit: () => void;
  /** Abandons the edit. */
  readonly onCancel: () => void;
}

/**
 * Props an adapter's empty state receives.
 *
 * @public
 */
export interface SavedViewsPanelEmptyProps {
  /** Body text under the heading. */
  readonly message: string;
}

/**
 * The kit-native pieces the panel is built from.
 *
 * @public
 */
export interface SavedViewsPanelSlots {
  /** The titled card. */
  readonly Surface: (props: SavedViewsPanelSurfaceProps) => ReactNode;
  /** One view. */
  readonly Row: (props: SavedViewsPanelRowProps) => ReactNode;
  /** The inline rename box. */
  readonly Input: (props: SavedViewsPanelInputProps) => ReactNode;
  /** Shown when nothing has been saved yet. */
  readonly Empty: (props: SavedViewsPanelEmptyProps) => ReactNode;
}

/**
 * What the panel needs to render.
 *
 * @public
 */
export interface SavedViewsPanelChromeProps {
  /** The saved views, in list order. */
  views: readonly SavedView[];
  /** Apply one. */
  onApply: (name: string) => void;
  /** Rename one. */
  onRename: (from: string, to: string) => void;
  /** Move one a step. */
  onMove: (name: string, delta: -1 | 1) => void;
  /** Make one the default, or clear it. */
  onSetDefault: (name: string) => void;
  /** Delete one. */
  onRemove: (name: string) => void;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** Anything of yours that belongs inside the card, under the list. */
  footer?: ReactNode;
  /** The kit's controls. */
  slots: SavedViewsPanelSlots;
  /** Class for the element. */
  className?: string;
}

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
  const labels = resolveLabels(labelsProp);
  const { Surface, Row, Input, Empty } = slots;
  // Which view is being renamed, and the draft. Held here rather than by the
  // host: a half-typed name is the panel's business, not the table's.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Focus when the element arrives rather than in an effect: kits portal or
  // mount their inputs a tick later, and an effect would run too early.
  const focusOnArrival = (element: HTMLInputElement | null) => {
    element?.focus();
  };

  /** A handler, or `undefined` when this reader may not make that change. */
  const allowed = (view: SavedView, run: () => void) =>
    view.readOnly === true ? undefined : run;

  const commit = () => {
    if (editing !== null) onRename(editing, draft);
    setEditing(null);
  };

  /** The cluster for one view, in the order every kit renders it. */
  const controlsFor = (
    view: SavedView,
    index: number
  ): readonly SavedViewRowControl[] => [
    {
      key: "rename",
      label: labels.renameView,
      icon: glyph(PENCIL),
      onPress:
        editing === view.name
          ? undefined
          : allowed(view, () => {
              setEditing(view.name);
              setDraft(view.name);
            }),
    },
    {
      key: "moveUp",
      label: labels.moveViewUp,
      icon: glyph(ARROW_UP),
      onPress:
        index > 0
          ? allowed(view, () => {
              onMove(view.name, -1);
            })
          : undefined,
    },
    {
      key: "moveDown",
      label: labels.moveViewDown,
      icon: glyph(ARROW_DOWN),
      onPress:
        index < views.length - 1
          ? allowed(view, () => {
              onMove(view.name, 1);
            })
          : undefined,
    },
    {
      key: "default",
      label: labels.setDefaultView,
      icon: glyph(STAR, view.isDefault === true),
      pressed: view.isDefault === true,
      onPress: allowed(view, () => {
        onSetDefault(view.name);
      }),
    },
    {
      key: "remove",
      label: labels.deleteView,
      icon: glyph(TRASH),
      danger: true,
      onPress: allowed(view, () => {
        onRemove(view.name);
      }),
    },
  ];

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
                onChange={setDraft}
                onCommit={commit}
                onCancel={() => {
                  setEditing(null);
                }}
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

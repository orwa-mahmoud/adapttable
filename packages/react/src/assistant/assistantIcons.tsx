/**
 * The assistant's glyphs.
 *
 * These are content handed to a kit's own button, not controls drawn in core:
 * the kit still renders the element the reader clicks. They inherit
 * `currentColor` and size in `em`, so each kit's text colour and control size
 * carry them without a per-kit copy.
 */
import type { ReactElement } from "react";

const BASE = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

/**
 * The assistant's face, for a host that has not supplied one.
 *
 * An avatar, not an icon: filled shapes that fill their circle, because a
 * hairline glyph floating in the middle of one reads as a button that lost
 * its label. It is drawn in the current colour, so the circle around it — and
 * so the kit's own accent — carries it without naming a second colour.
 *
 * @internal
 */
export function AssistantAvatar(): ReactElement {
  return (
    <svg
      viewBox="0 0 40 40"
      width="100%"
      height="100%"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {/* The aerial, which is what makes a rounded square read as a head
          rather than a card. */}
      <circle cx="20" cy="8.5" r="2.6" />
      <rect x="19" y="10.5" width="2" height="3.5" rx="1" />
      <rect x="9" y="13.5" width="22" height="17" rx="6" />
      {/* Eyes punched out of the head rather than drawn over it, so they are
          the ground showing through and cannot fight the fill for contrast. */}
      <circle
        cx="15.6"
        cy="21"
        r="2.2"
        fill="var(--adapttable-assistant-eye, #fff)"
      />
      <circle
        cx="24.4"
        cy="21"
        r="2.2"
        fill="var(--adapttable-assistant-eye, #fff)"
      />
      <rect
        x="16.5"
        y="25.4"
        width="7"
        height="1.8"
        rx="0.9"
        fill="var(--adapttable-assistant-eye, #fff)"
      />
      {/* Ears, which stop the head floating free of the circle's edge. */}
      <rect x="5.5" y="18.5" width="2.6" height="7" rx="1.3" />
      <rect x="31.9" y="18.5" width="2.6" height="7" rx="1.3" />
    </svg>
  );
}

/**
 * The reader's face, for a host that has not supplied one.
 *
 * A silhouette rather than a photograph or initials: the panel does not know
 * who is reading, and inventing a face or a letter for them would be a guess
 * printed beside everything they say.
 *
 * @internal
 */
export function PersonAvatar(): ReactElement {
  return (
    <svg
      viewBox="0 0 40 40"
      width="100%"
      height="100%"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="15" r="6.8" />
      {/* Shoulders that run off the bottom of the circle, which is what makes
          a silhouette read as a person rather than a lollipop. */}
      <path d="M20 24.2c-6.6 0-12 4.6-12 10.3V40h24v-5.5c0-5.7-5.4-10.3-12-10.3Z" />
    </svg>
  );
}

/** Settings. @internal */
export function SettingsIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

/** Close. @internal */
export function CloseIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/** Send. @internal */
export function SendIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
    </svg>
  );
}

/** Stop a turn in flight. @internal */
export function StopIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * One glyph per kind of thing the assistant does.
 *
 * A row reading "Filter applied · Status is Active" is a sentence to parse;
 * a funnel beside it is recognised before it is read, which is what lets a
 * reader scan four actions instead of reading them. Every kind a receipt can
 * carry is here — a kind with no glyph would put an unexplained gap in the
 * column the others line up in.
 *
 * These are strokes on a 24-grid, drawn in the current colour at the size the
 * text around them sets, so a kit's own palette and control size carry them.
 */
const KIND_PATHS: Record<string, string> = {
  // A funnel: what a filter does to a table, in one shape.
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3Z",
  // Two arrows facing opposite ways, which is the direction question a sort
  // answers — not a list, which is what every other kind here already is.
  sort: "M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4",
  group: "M3 5h8v6H3zM13 5h8v6h-8zM3 13h8v6H3zM13 13h8v6h-8z",
  // Going one way or the other through something longer than the screen.
  page: "M10 6l-4 6 4 6M16 6l4 6-4 6",
  // A sigma: the symbol the reader already associates with a total.
  aggregate: "M18 4H6l7 8-7 8h12",
  select:
    "M21 11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9M9 12l3 3 9-9",
  pin: "M12 17v5M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z",
  // The same pin, held against the rows it holds in place.
  pinRow:
    "M13 14v4M10.5 4h5l-.8 5 2.3 2.3V14h-8v-2.7L11.3 9l-.8-5ZM3 8h4M3 12h4M3 16h4",
  read: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  export: "M12 3v12M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z",
  add: "M12 5v14M5 12h14",
  delete:
    "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  reorder: "M9 6h12M9 12h12M9 18h12M3 8l2-2 2 2M3 16l2 2 2-2",
  // The host's own capability: a spark, because nothing here knows what it
  // does and a shape that guessed would be wrong for most of them.
  operation: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
};

/**
 * The mic, with a ring while it is listening.
 *
 * The ring is the only motion in the composer, and it is drawn as a static
 * second stroke rather than an animation — a pulsing control is exactly what
 * `prefers-reduced-motion` exists to stop, and a kit that wants motion adds it
 * where it owns the CSS.
 *
 * @internal
 */
export function MicIcon({
  listening,
}: {
  readonly listening?: boolean;
}): ReactElement {
  return (
    <svg {...BASE}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      {listening ? <circle cx="12" cy="8" r="1.5" fill="currentColor" /> : null}
    </svg>
  );
}

/**
 * A glyph for a suggested prompt, or nothing when the kind is unknown.
 *
 * @param kind - The prompt's kind, from its presentation metadata.
 * @internal
 */
export function SuggestionIcon({
  kind,
}: {
  readonly kind?: string;
}): ReactElement | null {
  const path = kind ? KIND_PATHS[kind] : undefined;
  if (!path) return null;
  return (
    <svg {...BASE}>
      <path d={path} />
    </svg>
  );
}

/**
 * The examples trigger: a lightbulb, for the prompts a reader can start from.
 *
 * @internal
 */
export function ExamplesIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

/**
 * Put this back: an arrow turning left into a hook.
 *
 * Drawn as two strokes — a head and the path it came from — because a single
 * near-closed arc renders as a plain circle at the size a row gives it, which
 * tells a reader nothing about what the control does. The word travels beside
 * it for the same reason.
 *
 * @internal
 */
export function UndoIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h7a6 6 0 0 1 6 6v3" />
    </svg>
  );
}

/**
 * What a turn did: a short list, for the control that reveals one.
 *
 * @internal
 */
export function ActionsIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <path d={KIND_PATHS.operation} />
    </svg>
  );
}

/**
 * A hue per kind, so a list of actions is told apart before it is read.
 *
 * One accent for every tile makes a column of identically coloured squares,
 * which carries no more than no colour at all. These are angles rather than
 * colours: lightness and chroma are fixed below, so every tile is the same
 * weight on the page and the same contrast in light and in dark.
 */
const KIND_HUE: Record<string, number> = {
  filter: 295,
  sort: 150,
  search: 230,
  group: 45,
  page: 250,
  aggregate: 330,
  select: 195,
  pin: 20,
  pinRow: 20,
  read: 215,
  export: 175,
  edit: 270,
  add: 140,
  delete: 25,
  reorder: 95,
  operation: 260,
};

/**
 * The glyph for one action, on a tile of its own.
 *
 * The tile is what makes a column of actions scannable: same size, same
 * place, one recognisable shape each, so four of them read as a list of
 * things rather than four lines of prose. It is tinted from the kit's accent
 * rather than given a colour here, so a Mantine table's actions are Mantine
 * blue and an antd table's are antd's — the same rule the rest of the panel
 * follows.
 *
 * @param kind - What the action was, from the receipt's subject.
 * @internal
 */
export function ReceiptIcon({
  kind,
}: {
  readonly kind?: string;
}): ReactElement {
  const hue = (kind ? KIND_HUE[kind] : undefined) ?? KIND_HUE.operation;
  // Mid lightness and moderate chroma: legible on a white card and on a dark
  // one, without a second colour per theme.
  const ink = `oklch(0.58 0.17 ${String(hue)})`;
  return (
    <span
      aria-hidden="true"
      data-adapttable-part="assistant-receipt-icon"
      data-kind={kind}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        inlineSize: "2.3em",
        blockSize: "2.3em",
        flexShrink: 0,
        // Squircle rather than circle: a circle beside the round speaker mark
        // reads as a second speaker, and these are things the turn did.
        borderRadius: "0.7em",
        background: `color-mix(in oklab, ${ink} 16%, transparent)`,
        color: ink,
        fontSize: "0.95em",
      }}
    >
      {/* An unknown kind still gets its tile, so the column does not break
          where a host capability sits. */}
      <svg {...BASE} width="1.3em" height="1.3em">
        <path
          d={(kind ? KIND_PATHS[kind] : undefined) ?? KIND_PATHS.operation}
        />
      </svg>
    </span>
  );
}

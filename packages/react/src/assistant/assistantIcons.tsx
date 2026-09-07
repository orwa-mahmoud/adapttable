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

/** The assistant's own mark: a conversation with a spark in it. @internal */
export function AssistantIcon(): ReactElement {
  return (
    <svg {...BASE}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
      <path d="m12 8.6.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8Z" />
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

/** Suggested prompt kinds, so a card carries a hint of what it will do. */
const SUGGESTION_PATHS: Record<string, string> = {
  filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3Z",
  sort: "M3 6h13M3 12h9M3 18h5M17 10l3-3 3 3M20 7v13",
  group: "M3 5h8v6H3zM13 5h8v6h-8zM3 13h8v6H3zM13 13h8v6h-8z",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z",
};

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
  const path = kind ? SUGGESTION_PATHS[kind] : undefined;
  if (!path) return null;
  return (
    <svg {...BASE}>
      <path d={path} />
    </svg>
  );
}

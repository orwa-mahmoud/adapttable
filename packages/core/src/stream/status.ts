/**
 * What a live connection is doing, in the words a host can show a user.
 *
 * Kept in its own module because the status is the part a table renders —
 * a badge, a banner, a spinner — while the socket machinery beside it is
 * only ever imported by a host that actually opens one.
 */

/** The connection's state, as the host sees it. */
export type RowPatchStreamStatus =
  /** No url wired, or `enabled: false`. Nothing is open and nothing will be. */
  | "idle"
  /** A socket is being opened for the first time. */
  | "connecting"
  /** Open and receiving. */
  | "open"
  /** Dropped, and a retry is scheduled. */
  | "reconnecting"
  /** Given up — the retry budget is spent, or the environment has no socket. */
  | "error"
  /** The host closed it. Final: nothing reopens on its own. */
  | "closed";

/** Whether this status means a socket is currently carrying patches. */
export function isStreamLive(status: RowPatchStreamStatus): boolean {
  return status === "open";
}

/**
 * Whether a status is one the host can do nothing about.
 *
 * `error` and `closed` are terminal: the connector will not try again by
 * itself, so a host that wants another attempt has to ask for one.
 */
export function isStreamSettled(status: RowPatchStreamStatus): boolean {
  return status === "error" || status === "closed";
}

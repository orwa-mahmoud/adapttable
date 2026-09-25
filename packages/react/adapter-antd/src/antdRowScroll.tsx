/**
 * Find's row scroll for antd.
 *
 * antd renders its own body — the desktop rows through antd's virtual
 * `<Table>`, the mobile cards and grouped rows through the keyed window — so
 * it cannot take the shared virtualize body that provides `RowScrollContext`.
 * These pieces let antd provide it itself: whichever window is live brings
 * the row find walks to into view.
 */
import type { KeyedWindow } from "@adapttable/react/adapter";
import type { GetRef, Table } from "antd";
import { type RefObject, useEffect, useMemo, useRef } from "react";

/** antd's `<Table>` handle: its scroll and its root element. */
export type AntdTableRef = GetRef<typeof Table>;

/** Scroll one entry, by key, into a keyed window. */
type KeyScroll = (key: string) => void;

/** Where each of antd's windows keeps its scroll while it is live. */
export interface AntdRowScroll {
  /** The desktop `<Table>`. */
  readonly table: RefObject<AntdTableRef | null>;
  /** The mobile card window. */
  readonly cards: RefObject<KeyScroll | null>;
  /** The grouped-entry window. */
  readonly groups: RefObject<KeyScroll | null>;
}

/** One stable set of scroll handles for a table. */
export function useAntdRowScroll(): AntdRowScroll {
  const table = useRef<AntdTableRef | null>(null);
  const cards = useRef<KeyScroll | null>(null);
  const groups = useRef<KeyScroll | null>(null);
  return useMemo(() => ({ table, cards, groups }), []);
}

/**
 * Bring the row with `key` into whichever window is live. A row already
 * rendered is left where it is.
 */
export function scrollAntdRow(scroll: AntdRowScroll, key: string): void {
  const keyed = scroll.groups.current ?? scroll.cards.current;
  if (keyed) {
    keyed(key);
    return;
  }
  const table = scroll.table.current;
  if (!table) return;
  const rendered = Array.from(
    table.nativeElement.querySelectorAll<HTMLElement>("[data-row-key]")
  ).some((row) => row.dataset.rowKey === key);
  if (!rendered) table.scrollTo({ key });
}

/**
 * Hold a keyed window's scroll in `target` while the window is on, so find
 * can reach an entry outside it.
 */
export function KeyedScrollRegistration({
  target,
  keys,
  keyed,
}: Readonly<{
  target: RefObject<KeyScroll | null>;
  keys: readonly string[];
  keyed: KeyedWindow;
}>): null {
  const { enabled, indices, scrollToIndex } = keyed;
  useEffect(() => {
    if (!enabled || !scrollToIndex) return;
    const scroll: KeyScroll = (key) => {
      const index = keys.indexOf(key);
      if (index >= 0 && !indices.includes(index)) scrollToIndex(index);
    };
    target.current = scroll;
    return () => {
      if (target.current === scroll) target.current = null;
    };
  }, [enabled, indices, keys, scrollToIndex, target]);
  return null;
}

/** Follow the transcript only when the reader was already near its end. */
import {
  afterRenderEffect,
  assertInInjectionContext,
  type Signal,
  signal,
  untracked,
} from "@angular/core";
/** Scrolling behavior owned by the chrome. @public */
export interface ConversationScroll {
  readonly hasUnseen: Signal<boolean>;
  readonly jumpToLatest: () => void;
  readonly onScroll: () => void;
}
/** Preserve an earlier reading position; 48px is the shared near-bottom threshold. @public */
export function injectConversationScroll(
  count: Signal<number>,
  element: Signal<HTMLElement | undefined>
): ConversationScroll {
  assertInInjectionContext(injectConversationScroll);
  let atBottom = true;
  let previousCount: number | undefined;
  const hasUnseen = signal(false);
  const onScroll = () => {
    const el = element();
    if (!el) return;
    atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 48;
    if (atBottom) hasUnseen.set(false);
  };
  const jumpToLatest = () => {
    const el = element();
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottom = true;
    hasUnseen.set(false);
  };
  afterRenderEffect(() => {
    const next = count();
    if (next === previousCount) return;
    previousCount = next;
    if (next === 0) return;
    const el = untracked(element);
    if (!el) return;
    if (atBottom) el.scrollTop = el.scrollHeight;
    else hasUnseen.set(true);
  });
  return { hasUnseen: hasUnseen.asReadonly(), jumpToLatest, onScroll };
}

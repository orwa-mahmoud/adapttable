/**
 * Scrolling a conversation without stealing the reader's place in it.
 *
 * A transcript that always jumps to the bottom makes an earlier result
 * impossible to read: a reply arrives while someone is inspecting what the
 * last one did, and the panel yanks them away. So it follows only when they
 * were already at the bottom, and otherwise offers to take them there.
 */
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/** Within this many pixels of the end counts as "at the bottom". */
const NEAR_BOTTOM = 48;

/** What {@link useConversationScroll} gives the chrome. @public */
export interface ConversationScroll {
  /** Attach to the scrolling element. */
  readonly ref: RefObject<HTMLDivElement | null>;
  /** True when a message arrived while the reader was reading further up. */
  readonly hasUnseen: boolean;
  /** Jump to the newest message and clear {@link hasUnseen}. */
  readonly jumpToLatest: () => void;
  /** Call on scroll so the hook can track where the reader is. */
  readonly onScroll: () => void;
}

/**
 * Follow new messages only when the reader is already at the bottom.
 *
 * @param count - How many messages the transcript holds.
 * @returns The ref to attach, and the unseen-message affordance.
 *
 * @public
 */
export function useConversationScroll(count: number): ConversationScroll {
  const ref = useRef<HTMLDivElement | null>(null);
  const atBottom = useRef(true);
  const [hasUnseen, setHasUnseen] = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottom.current = distance <= NEAR_BOTTOM;
    if (atBottom.current) setHasUnseen(false);
  }, []);

  const jumpToLatest = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    atBottom.current = true;
    setHasUnseen(false);
  }, []);

  useEffect(() => {
    if (count === 0) return;
    const el = ref.current;
    if (!el) return;
    if (atBottom.current) {
      el.scrollTop = el.scrollHeight;
      return;
    }
    setHasUnseen(true);
  }, [count]);

  return { ref, hasUnseen, jumpToLatest, onScroll };
}

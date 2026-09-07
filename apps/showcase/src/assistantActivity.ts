/**
 * Whether an assistant conversation is currently in the reader's way.
 *
 * The star prompt is a centered modal on a timer. It has no idea the AI demo
 * exists, and the AI demo has no business importing it, so they meet here: a
 * one-value store the demo sets while its window is open or a turn is in
 * flight, and the prompt reads before it decides to appear.
 *
 * Suppression only defers. Interrupting someone mid-conversation to ask for a
 * GitHub star is the thing to avoid; never asking at all is not.
 */
type Listener = () => void;

let active = false;
const listeners = new Set<Listener>();

/** Mark the assistant as occupying the screen, or free again. @internal */
export function setAssistantActive(next: boolean): void {
  if (active === next) return;
  active = next;
  for (const listener of listeners) listener();
}

/** Whether the assistant is on screen right now. @internal */
export function assistantActive(): boolean {
  return active;
}

/** Watch for the assistant opening or closing. @internal */
export function subscribeAssistantActive(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

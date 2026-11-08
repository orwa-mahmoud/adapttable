import { nextTick } from "vue";

/**
 * Run work after Vue commits the DOM. The tick's promise is settled here so
 * a failure is thrown instead of being discarded.
 */
export function scheduleTick(work: () => void | Promise<void>): void {
  nextTick(work).catch((error: unknown) => {
    throw error instanceof Error ? error : new Error(String(error));
  });
}

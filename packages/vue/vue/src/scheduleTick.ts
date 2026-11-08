import { nextTick } from "vue";

/**
 * The error a failed tick rethrows: the failure itself, or an `Error` that
 * carries a thrown non-error value.
 */
export function tickFailure(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Run work after Vue commits the DOM. The tick's promise is settled here so
 * a failure is thrown instead of being discarded.
 *
 * @public
 */
export function scheduleTick(work: () => void | Promise<void>): void {
  nextTick(work).catch((error: unknown) => {
    throw tickFailure(error);
  });
}

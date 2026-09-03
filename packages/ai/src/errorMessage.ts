/** Message for a thrown value. Host hooks may reject with a string. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

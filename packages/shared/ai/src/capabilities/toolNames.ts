/** Build a reversible OpenAI function-name map and detect dot/underscore collisions. @public */
export function openAiToolNameMap(
  keys: readonly string[]
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const key of keys) {
    const encoded = key.replaceAll(".", "_");
    const existing = map.get(encoded);
    if (existing !== undefined && existing !== key) {
      throw new Error(
        `OpenAI tool name collision: "${existing}" and "${key}" both encode to "${encoded}"`
      );
    }
    map.set(encoded, key);
  }
  return map;
}

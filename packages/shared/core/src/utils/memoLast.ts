/**
 * A one-slot cache: the last result, kept while every argument is the same
 * (by `Object.is`). The shape a store uses so a value whose inputs did not
 * change keeps its identity across reads.
 *
 * @internal
 */
/* @__NO_SIDE_EFFECTS__ */
export function memoLast<TArgs extends readonly unknown[], TResult>(
  compute: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  let last: { args: TArgs; result: TResult } | undefined;
  return (...args: TArgs): TResult => {
    if (
      last?.args.length === args.length &&
      last.args.every((value, index) => Object.is(value, args[index]))
    ) {
      return last.result;
    }
    const result = compute(...args);
    last = { args, result };
    return result;
  };
}

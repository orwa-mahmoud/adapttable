/** Optional process concurrency for the repository's check runners. */

/** Read a positive integer without changing an unset runner's default. */
export function checkConcurrency(
  value = process.env.ADAPTTABLE_CHECK_CONCURRENCY
) {
  if (value === undefined) return undefined;
  const concurrency = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(concurrency)) {
    throw new Error("ADAPTTABLE_CHECK_CONCURRENCY must be a positive integer");
  }
  return concurrency;
}

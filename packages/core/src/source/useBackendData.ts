/**
 * Alias module for the v1 `useBackendData` name — the hook is
 * `useQuerySource` in v2 (the bring-your-own-query-library source
 * builder). Deleted before the 2.0.0 release.
 */
export {
  useQuerySource as useBackendData,
  type UseQuerySourceOptions as UseBackendDataOptions,
} from "./useQuerySource";

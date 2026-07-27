// The mount-stagger hook now lives in `@adapttable/core` so every adapter can
// use it. Re-exported here so the `@adapttable/mantine` import path (and this
// package's internal callers) keep working unchanged.
export {
  type MountStaggerOptions,
  useMountStagger,
} from "@adapttable/core/adapter";

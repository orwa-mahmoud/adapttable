import { useChangedCellFlash } from "@adapttable/core/stream";
import { type ReactNode, useMemo, useRef, useState } from "react";

import { PatchSinkProvider } from "./patchSink";

/**
 * Feature Lab's cell-flash hook. Lives here so `/` never imports the
 * stream module.
 *
 * `useChangedCellFlash` keeps marks in a ref and only bumps this
 * component. `generation` is part of the sink so the context value
 * changes and the table paints `data-flash`.
 */
export function LabCellFlash({
  enabled,
  children,
}: Readonly<{ enabled: boolean; children: ReactNode }>) {
  const flash = useChangedCellFlash({ enabled });
  const isFlashingRef = useRef(flash.isFlashing);
  isFlashingRef.current = flash.isFlashing;
  const mark = flash.mark;
  const [generation, setGeneration] = useState(0);
  const sink = useMemo(
    () => ({
      onEvents: (events: Parameters<typeof mark>[0]) => {
        mark(events);
        setGeneration((n) => n + 1);
      },
      isFlashingRef,
      generation,
    }),
    [mark, generation]
  );
  return <PatchSinkProvider value={sink}>{children}</PatchSinkProvider>;
}

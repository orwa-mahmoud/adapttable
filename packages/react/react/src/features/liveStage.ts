/**
 * What a live stage receives and hands on.
 *
 * The live values are the controllers the table renders with once its chrome
 * is built. Each starts inert; a composed feature's stage replaces the one it
 * writes, reading what the stages before it wrote, and passes the grown set
 * on. The base walks the stages and names none of them.
 */
import type { ReactNode } from "react";

import type { ExportHandlerState } from "../export/useExportHandler";
import type { FindInTableState } from "../find/useFindInTable";
import type { GridFocusState } from "../focus/useGridFocus";
import type { FullscreenState } from "../layout/useFullscreen";
import type { DataTableShellResult } from "../useDataTableShell";

/**
 * The live values, one per stage that can write it.
 *
 * @public
 */
export interface ShellLive<TRow> {
  /** Find in table: matches and the bar's state. */
  readonly find: FindInTableState;
  /** The keyboard grid: focus, range and cell attributes. */
  readonly gridFocus: GridFocusState;
  /** The export control's state and handler. */
  readonly exportHandler: ExportHandlerState;
  /** Fullscreen state. */
  readonly fullscreen: FullscreenState;
  /** Figures over the selected range. */
  readonly stats: DataTableShellResult<TRow>["selectionStats"];
}

/**
 * What a live stage is rendered with.
 *
 * @public
 */
export interface LiveStageProps<TRow> {
  /** The finished shell. */
  readonly shell: DataTableShellResult<TRow>;
  /** The live values written so far. */
  readonly live: ShellLive<TRow>;
  /** Renders the rest of the walk with the values this stage grew. */
  readonly children: (live: ShellLive<TRow>) => ReactNode;
}

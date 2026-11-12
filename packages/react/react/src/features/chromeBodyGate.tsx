/**
 * Mount the chrome-body hooks in-tree, never in the parent shell.
 *
 * The virtualize feature fills {@link CHROME_BODY} with a child that calls
 * TanStack. The plain path mounts a sibling that never imports it. First
 * paint already knows which child to mount — features are static — so SSR
 * and hydration see the same tree.
 */
import { overlayChromeExtras } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { ForcedColorsStyle } from "../a11y/forcedColors";
import type { TableChrome } from "../chrome/tableChromeContract";
import type { ComposedTableProps } from "../props";
import { TableStoreContext } from "../state/tableStoreContext";
import {
  type DataTableShellResult,
  finishDataTableShell,
} from "../useDataTableShell";
import type { ChromeBodyData } from "../virtual/chromeBodyShared";
import { usePlainChromeBodyData } from "../virtual/usePlainChromeBodyData";
import { ChromeExtrasGate } from "./chromeExtrasGate";
import { FeatureSlot, useFeatureSlotFilled } from "./providers";
import { HistoryLiveGate, ShellLiveGate } from "./shellLiveGate";
import { CHROME_BODY, type ChromeBodySlotProps } from "./slotKeys";

/**
 * Resolve chrome-body data, then finish the table.
 *
 * @public
 */
export function ChromeBodyGate<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (body: ChromeBodyData<TRow>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CHROME_BODY);
  if (filled) {
    const slotProps = {
      chrome,
      props,
      children,
    } satisfies ChromeBodySlotProps<TRow>;
    return <FeatureSlot slot={CHROME_BODY} props={slotProps} />;
  }
  return (
    <PlainChromeBody chrome={chrome} props={props}>
      {children}
    </PlainChromeBody>
  );
}

function PlainChromeBody<TRow>({
  chrome,
  props,
  children,
}: {
  readonly chrome: TableChrome<TRow>;
  readonly props: ComposedTableProps<TRow>;
  readonly children: (body: ChromeBodyData<TRow>) => ReactNode;
}): ReactNode {
  const body = usePlainChromeBodyData(chrome, props);
  return children(body);
}

/**
 * Finish a shell with extras, the in-tree chrome-body path, and live
 * interaction hooks.
 *
 * A mock that already wrote `tableProps.rowEntries` sets
 * `skipChromeBody` so this does not overwrite the injected window.
 * History, extras and find/grid/export still run — those mocks still
 * need real interaction state when the matching feature is composed.
 *
 * @public
 */
export function DataTableShellView<TRow>({
  shell,
  children,
}: {
  readonly shell: DataTableShellResult<TRow>;
  readonly children: (view: DataTableShellResult<TRow>) => ReactNode;
}): ReactNode {
  return (
    <TableStoreContext.Provider value={shell.tableStore}>
      <ForcedColorsStyle />
      <HistoryLiveGate shell={shell}>
        {(withHistory) => (
          <ChromeExtrasGate
            chrome={withHistory.chrome}
            props={withHistory.chromeProps}
          >
            {(chrome) => {
              const withExtras = overlayChromeExtras(withHistory, chrome);
              const afterBody = (view: DataTableShellResult<TRow>) => (
                <ShellLiveGate shell={view}>{children}</ShellLiveGate>
              );
              if (shell.skipChromeBody === true) {
                return afterBody(withExtras);
              }
              return (
                <ChromeBodyGate chrome={chrome} props={withExtras.chromeProps}>
                  {(body) => afterBody(finishDataTableShell(withExtras, body))}
                </ChromeBodyGate>
              );
            }}
          </ChromeExtrasGate>
        )}
      </HistoryLiveGate>
    </TableStoreContext.Provider>
  );
}

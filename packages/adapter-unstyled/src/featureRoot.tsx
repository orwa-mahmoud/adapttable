import {
  CONTEXT_MENU_LIVE,
  type ContextMenuLiveSlotProps,
  FeatureSlot,
  SIDE_PANEL,
  useFeatureSlotFilled,
} from "@adapttable/core/adapter";
import type { ReactNode } from "react";

export function ContextMenuLiveGate({
  props,
  children,
}: {
  readonly props: Omit<ContextMenuLiveSlotProps<never>, "children">;
  readonly children: (regionProps: Record<string, unknown>) => ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(CONTEXT_MENU_LIVE);
  if (!filled) return children({});
  return (
    <FeatureSlot slot={CONTEXT_MENU_LIVE} props={{ ...props, children }} />
  );
}

export function OptionalSidePanel({
  side,
  body,
  panel,
}: {
  readonly side?: "start" | "end";
  readonly body: ReactNode;
  readonly panel: ReactNode;
}): ReactNode {
  const filled = useFeatureSlotFilled(SIDE_PANEL);
  if (!filled || panel == null || panel === false) return body;
  return (
    <div
      data-adapttable-part="table-region"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        flexDirection: side === "start" ? "row-reverse" : "row",
      }}
    >
      <div
        data-adapttable-part="table-region-main"
        style={{ flex: 1, minWidth: 0 }}
      >
        {body}
      </div>
      {panel}
    </div>
  );
}

import { Skeleton, Table } from "antd";

import { SR_ONLY } from "./srOnly";

function skeletonLineWidth(isActions: boolean, index: number): string {
  if (isActions) return "72px";
  if (index === 0) return "70%";
  return "55%";
}

function skeletonWidth(index: number, total: number): string {
  if (index === 0) return "34%";
  if (index === total - 1) return "12%";
  return `${Math.max(12, Math.floor(72 / Math.max(total - 2, 1)))}%`;
}

export function SkeletonTable({
  columnCount,
  rowCount,
  loadingLabel,
  size,
  bordered,
  hasActions,
}: Readonly<{
  columnCount: number;
  rowCount: number;
  loadingLabel: string;
  size: "small" | "middle" | "large";
  bordered: boolean;
  hasActions?: boolean;
}>) {
  const dataColumns = Math.max(columnCount, 1);
  const totalColumns = dataColumns + (hasActions ? 1 : 0);
  const skeletonColumns = Array.from({ length: totalColumns }, (_, i) => {
    const isActions = Boolean(hasActions && i === totalColumns - 1);
    const width = isActions ? "96px" : skeletonWidth(i, dataColumns);
    const lineWidth = skeletonLineWidth(isActions, i);
    return {
      key: `skeleton-${i}`,
      width,
      title: (
        <Skeleton.Input active size="small" style={{ width: lineWidth }} />
      ),
      render: () => (
        <Skeleton.Input active size="small" style={{ width: lineWidth }} />
      ),
    };
  });
  const rows = Array.from({ length: rowCount }, (_, i) => ({
    key: `row-${i}`,
  }));
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <Table
        columns={skeletonColumns}
        dataSource={rows}
        pagination={false}
        size={size}
        bordered={bordered}
      />
      <span style={SR_ONLY}>{loadingLabel}</span>
    </div>
  );
}

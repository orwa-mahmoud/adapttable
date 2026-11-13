/**
 * The bulk action bar, decided by the binding and drawn as antd's `Alert`
 * with an `action` slot (the pattern antd's own Table docs use for batch
 * operations).
 */
import {
  createBulkBar,
  type KitBulkBarFrameProps,
  type KitBulkButtonProps,
  type KitBulkTextProps,
} from "@adapttable/react/adapter";
import { Alert, Button as AntButton, Space, Typography } from "antd";
import { isValidElement } from "react";

import { isDangerColor } from "../colors";

/** The count or the scope offer as the message; failures turn it red. */
function Frame({
  count,
  scope,
  clear,
  actions,
  error,
  ...rest
}: Readonly<KitBulkBarFrameProps>) {
  "use no memo";
  return (
    <Alert
      {...rest}
      type={error ? "error" : "info"}
      banner
      title={
        scope ? (
          <Space size={4} wrap {...scope.attributes}>
            {scope.text}
            {scope.button}
          </Space>
        ) : (
          count
        )
      }
      description={error ?? undefined}
      action={
        <Space size="small" wrap>
          {clear}
          {actions}
        </Space>
      }
    />
  );
}

function Text({ kind, children, ...rest }: Readonly<KitBulkTextProps>) {
  "use no memo";
  if (kind === "scope")
    return <Typography.Text {...rest}>{children}</Typography.Text>;
  if (kind === "error") return <span {...rest}>{children}</span>;
  return <>{children}</>;
}

function Button({
  kind,
  busy: _busy,
  icon,
  color,
  reason,
  children,
  ...rest
}: Readonly<KitBulkButtonProps>) {
  "use no memo";
  if (kind === "action") {
    return (
      <AntButton
        size="small"
        type="primary"
        danger={isDangerColor(color)}
        icon={isValidElement(icon) ? icon : undefined}
        title={reason}
        {...rest}
      >
        {children}
      </AntButton>
    );
  }
  return (
    <AntButton size="small" type={kind === "clear" ? "text" : "link"} {...rest}>
      {children}
    </AntButton>
  );
}

/** The bulk action bar, with antd's alert, text and buttons. */
export const BulkBar = /* @__PURE__ */ createBulkBar({ Frame, Text, Button });

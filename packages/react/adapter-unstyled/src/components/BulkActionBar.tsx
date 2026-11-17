/** The bulk action bar, decided by the binding and drawn with native controls. */
import {
  createBulkBar,
  type KitBulkBarFrameProps,
  type KitBulkButtonProps,
  type KitBulkTextProps,
} from "@adapttable/react/adapter";

import { useClassOfPart } from "./classNamesContext";

/** The count, then the scope offer, the clear button, the actions, the error. */
function Frame({
  count,
  scope,
  clear,
  actions,
  error,
  ...rest
}: Readonly<KitBulkBarFrameProps>) {
  "use no memo";
  const className = useClassOfPart(rest["data-adapttable-part"]);
  const bannerClassName = useClassOfPart(
    scope?.attributes["data-adapttable-part"]
  );
  return (
    <div {...rest} className={className}>
      {count}
      {scope && (
        <div {...scope.attributes} className={bannerClassName}>
          {scope.text}
          {scope.button}
        </div>
      )}
      {clear}
      {actions}
      {error}
    </div>
  );
}

/** The count is a live `output`, announced as the selection changes. */
function Text({ kind, ...rest }: Readonly<KitBulkTextProps>) {
  "use no memo";
  const className = useClassOfPart(rest["data-adapttable-part"]);
  if (kind === "count") return <output {...rest} />;
  return <span {...rest} className={className} />;
}

function Button({
  kind: _kind,
  busy: _busy,
  icon,
  color,
  reason,
  children,
  ...rest
}: Readonly<KitBulkButtonProps>) {
  "use no memo";
  const className = useClassOfPart(rest["data-adapttable-part"]);
  return (
    <button
      type="button"
      title={reason}
      data-color={color}
      className={className}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/** Selection toolbar with native bulk-action buttons. */
export const BulkBar = /* @__PURE__ */ createBulkBar({ Frame, Text, Button });

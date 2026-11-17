/** Group rows and cards, drawn by the binding with native elements. */
import {
  createGroupHeader,
  type KitCheckboxProps,
  type KitGroupCardProps,
  type KitGroupLook,
  type KitGroupTextProps,
  type KitGroupToggleProps,
} from "@adapttable/react/adapter";
import type { CSSProperties } from "react";

import { useClassNames, useClassOfPart } from "./classNamesContext";
import { Cell, Row } from "./DesktopTable";
import { ChevronIcon } from "./icons";
import { GroupMoreButton } from "./kitControls";
import { Checkbox as NativeCheckbox } from "./kitPrimitives";

const ROTATED: CSSProperties = {
  display: "inline-flex",
  transform: "rotate(90deg)",
  transition: "transform 150ms ease",
};
const UPRIGHT: CSSProperties = { ...ROTATED, transform: "rotate(0deg)" };

/** A native button with a chevron that turns as the group opens. */
function Toggle({ expanded, label, onToggle }: Readonly<KitGroupToggleProps>) {
  "use no memo";
  return (
    <button
      type="button"
      data-adapttable-part="group-toggle"
      aria-expanded={expanded}
      aria-label={label}
      className={useClassNames().groupToggle}
      onClick={onToggle}
    >
      <span style={expanded ? ROTATED : UPRIGHT}>
        <ChevronIcon size={14} />
      </span>
    </button>
  );
}

const MUTED: CSSProperties = { opacity: 0.65 };
const AT_END: CSSProperties = { marginInlineStart: "auto" };

/** Inline text; the count and a subtotal's caption are muted. */
function Text({ kind, style, ...rest }: Readonly<KitGroupTextProps>) {
  "use no memo";
  const classNames = useClassNames();
  if (kind === "count" || kind === "caption")
    return (
      <span
        className={classNames.groupCount}
        style={{ ...MUTED, ...style }}
        {...rest}
      />
    );
  if (kind === "aggregate")
    return (
      <span
        className={classNames.groupAggregate}
        style={{ ...AT_END, ...style }}
        {...rest}
      />
    );
  return <span className={classNames.groupLabel} style={style} {...rest} />;
}

/** The group's select-all, with the class of its part. */
function Checkbox(props: Readonly<KitCheckboxProps>) {
  "use no memo";
  return (
    <NativeCheckbox
      className={useClassOfPart(props["data-adapttable-part"])}
      {...props}
    />
  );
}

const SEMIBOLD: CSSProperties = { fontWeight: 600 };

function Card({
  compact: _compact,
  head,
  aggregates,
  ...data
}: Readonly<KitGroupCardProps>) {
  "use no memo";
  return (
    <div {...data} className={useClassNames().groupCard} style={SEMIBOLD}>
      {head}
      {aggregates}
    </div>
  );
}

const LINE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const LOOK: KitGroupLook = {
  row: {},
  labelCell: SEMIBOLD,
  head: { ...LINE, width: "100%" },
  cardHead: LINE,
  cardAggregate: { display: "flex", gap: 8, marginTop: 4 },
};

const useLook = (): KitGroupLook => LOOK;

export const { GroupHeaderRow, GroupHeaderCard } =
  /* @__PURE__ */ createGroupHeader({
    Row,
    Cell,
    Checkbox,
    Toggle,
    Text,
    Card,
    MoreButton: GroupMoreButton,
    useLook,
  });

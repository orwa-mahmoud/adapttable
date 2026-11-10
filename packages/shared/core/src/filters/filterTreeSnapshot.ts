/**
 * Snapshots of a filter tree, so a binding can tell whether the tree a host
 * passes still filters the same way as the one it last applied.
 */
import type { QueryCondition, QueryFilterGroup } from "../contracts/query";
import { isFilterGroup } from "../source/queryContract";

/**
 * An operand value compared by value in a snapshot.
 *
 * @public
 */
export type FilterOperandPrimitive =
  string | number | boolean | bigint | symbol | null | undefined;
/**
 * One operand as recorded: a flat primitive array copied item by item, or any
 * other value kept by identity.
 *
 * @public
 */
export type FilterOperandSnapshot =
  | {
      readonly kind: "array";
      readonly values: readonly FilterOperandPrimitive[];
    }
  | { readonly kind: "identity"; readonly value: unknown };
/**
 * A filter tree as it stood: each condition's key, operator and operand, with
 * a flat primitive array copied and any other operand kept by identity.
 *
 * @public
 */
export interface FilterTreeSnapshot {
  readonly combinator: QueryFilterGroup["combinator"];
  readonly conditions: readonly FilterTreeSnapshotNode[];
}
/**
 * One node of a recorded filter tree: a nested group, or a condition's key,
 * operator and operand.
 *
 * @public
 */
export type FilterTreeSnapshotNode =
  | { readonly kind: "group"; readonly group: FilterTreeSnapshot }
  | {
      readonly kind: "condition";
      readonly key: string;
      readonly op: string;
      readonly operand: FilterOperandSnapshot;
    };
function primitiveOperand(value: unknown): value is FilterOperandPrimitive {
  return (
    value === null || (typeof value !== "object" && typeof value !== "function")
  );
}
/** Snapshot flat primitive arrays without evaluating accessors or custom operands. */
function primitiveArray(
  value: unknown
): readonly FilterOperandPrimitive[] | undefined {
  try {
    if (
      !Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Array.prototype
    )
      return undefined;
    const length: unknown = Object.getOwnPropertyDescriptor(
      value,
      "length"
    )?.value;
    if (typeof length !== "number" || !Number.isInteger(length) || length < 0)
      return undefined;
    if (Reflect.ownKeys(value).length !== length + 1) return undefined;
    const values: FilterOperandPrimitive[] = [];
    for (let index = 0; index < length; index++) {
      const property = Object.getOwnPropertyDescriptor(value, index);
      const item: unknown = property?.value;
      if (!property || !("value" in property) || !primitiveOperand(item))
        return undefined;
      values.push(item);
    }
    return values;
  } catch {
    // A proxy may reject inspection. Its identity is still a valid opaque operand.
    return undefined;
  }
}
function operandSnapshot(value: unknown): FilterOperandSnapshot {
  const values = primitiveArray(value);
  return values ? { kind: "array", values } : { kind: "identity", value };
}
function filterNodeSnapshot(
  node: QueryCondition | QueryFilterGroup
): FilterTreeSnapshotNode {
  return isFilterGroup(node)
    ? { kind: "group", group: filterTreeSnapshot(node) }
    : {
        kind: "condition",
        key: node.key,
        op: node.op,
        operand: operandSnapshot(node.value),
      };
}
/**
 * Record a filter tree so a later tree can be compared with it, even when the
 * host mutated the original in place.
 *
 * @param tree - The tree to record.
 * @returns Its snapshot.
 *
 * @public
 */
export function filterTreeSnapshot(tree: QueryFilterGroup): FilterTreeSnapshot {
  return {
    combinator: tree.combinator,
    conditions: tree.conditions.map(filterNodeSnapshot),
  };
}
function sameOperand(value: unknown, snapshot: FilterOperandSnapshot): boolean {
  if (snapshot.kind === "identity") return Object.is(value, snapshot.value);
  const values = primitiveArray(value);
  return (
    values?.length === snapshot.values.length &&
    values.every((item, index) => Object.is(item, snapshot.values[index]))
  );
}
function sameFilterNode(
  node: QueryCondition | QueryFilterGroup,
  snapshot: FilterTreeSnapshotNode | undefined
): boolean {
  if (!snapshot) return false;
  if (snapshot.kind === "group")
    return isFilterGroup(node) && sameFilterTree(node, snapshot.group);
  return (
    !isFilterGroup(node) &&
    node.key === snapshot.key &&
    node.op === snapshot.op &&
    sameOperand(node.value, snapshot.operand)
  );
}
/**
 * Whether a tree still matches a snapshot: the same combinators, keys and
 * operators, flat primitive operands equal item by item, and any other operand
 * the same object.
 *
 * @param tree - The current tree.
 * @param snapshot - A snapshot taken earlier, if any.
 * @returns Whether nothing that filters has changed.
 *
 * @public
 */
export function sameFilterTree(
  tree: QueryFilterGroup,
  snapshot: FilterTreeSnapshot | undefined
): boolean {
  return (
    tree.combinator === snapshot?.combinator &&
    tree.conditions.length === snapshot.conditions.length &&
    tree.conditions.every((node, index) =>
      sameFilterNode(node, snapshot.conditions[index])
    )
  );
}

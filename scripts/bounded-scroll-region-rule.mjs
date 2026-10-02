// Only these mobile-card scroll wrappers may opt into the region allowance.
export const BOUNDED_SCROLL_REGION_FILES = [
  "packages/react/adapter-unstyled/src/components/MobileCards.tsx",
  "packages/react/adapter-antd/src/components/MobileCards.tsx",
  "packages/react/adapter-base-ui/src/components/MobileCards.tsx",
  "packages/react/adapter-chakra/src/components/MobileCards.tsx",
  "packages/react/adapter-mantine/src/components/MobileCards.tsx",
  "packages/react/adapter-mui/src/components/MobileCards.tsx",
  "packages/react/adapter-radix/src/components/MobileCards.tsx",
];

function attributeValue(node, name) {
  const attribute = node.attributes.find(
    (item) => item.type === "JSXAttribute" && item.name.name === name
  );
  const value = attribute?.value;
  return value?.type === "JSXExpressionContainer" ? value.expression : value;
}

function isIdentifier(node, name) {
  return (
    node?.type === "Identifier" && (name === undefined || node.name === name)
  );
}

function isLiteral(node, value) {
  return node?.type === "Literal" && node.value === value;
}

function hasName(value) {
  if (value?.type === "Literal") {
    return typeof value.value === "string" && value.value.trim().length > 0;
  }
  // The table's resolved label is either passed as a prop or read directly
  // from getTableProps(). Empty, undefined and conditional labels don't qualify.
  return (
    (isIdentifier(value) && value.name !== "undefined") ||
    value?.type === "MemberExpression"
  );
}

function guardedHeight(tabIndex) {
  if (
    tabIndex?.type !== "ConditionalExpression" ||
    !isIdentifier(tabIndex.consequent, "undefined") ||
    !isLiteral(tabIndex.alternate, 0)
  ) {
    return undefined;
  }
  const test = tabIndex.test;
  if (
    test.type !== "BinaryExpression" ||
    test.operator !== "==" ||
    !isLiteral(test.right, null)
  ) {
    return undefined;
  }
  return test.left.type === "ChainExpression"
    ? test.left.expression
    : test.left;
}

function isStyleHeight(height, style) {
  return (
    height?.type === "MemberExpression" &&
    !height.computed &&
    isIdentifier(height.property, "maxHeight") &&
    isIdentifier(style) &&
    isIdentifier(height.object, style.name)
  );
}

function isHelperHeight(height, style) {
  return (
    isIdentifier(height) &&
    style?.type === "CallExpression" &&
    isIdentifier(style.callee, "mobileCardListStyle") &&
    style.arguments.length === 1 &&
    isIdentifier(style.arguments[0], height.name)
  );
}

/**
 * Keep the upstream region option honest: a named div is a keyboard stop only
 * while the same maxHeight used by its applied scroll style is non-null.
 * Deliberately recognize the two readable adapter patterns, not arbitrary
 * expressions or prop spreads that could hide an unbounded tab stop.
 * @type {import("eslint").Rule.RuleModule}
 */
export const boundedScrollRegionRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      wrapper: "A mobile-card scroll region must be a native div wrapper.",
      name: "A mobile-card scroll region must have a nonempty accessible name.",
      bounded:
        "Use tabIndex={height == null ? undefined : 0} with the same height in mobileCardListStyle(height), or guard the applied style's maxHeight. Do not spread wrapper props.",
    },
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (!isLiteral(attributeValue(node, "role"), "region")) return;

        if (node.name.type !== "JSXIdentifier" || node.name.name !== "div") {
          context.report({ node, messageId: "wrapper" });
        }
        if (
          !hasName(attributeValue(node, "aria-label")) &&
          !hasName(attributeValue(node, "aria-labelledby"))
        ) {
          context.report({ node, messageId: "name" });
        }
        const height = guardedHeight(attributeValue(node, "tabIndex"));
        const style = attributeValue(node, "style");
        if (
          node.attributes.some((item) => item.type === "JSXSpreadAttribute") ||
          !(isHelperHeight(height, style) || isStyleHeight(height, style))
        ) {
          context.report({ node, messageId: "bounded" });
        }
      },
    };
  },
};

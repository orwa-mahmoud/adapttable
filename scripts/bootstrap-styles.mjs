/**
 * Consolidate Bootstrap's repeated base rules and kit supplements in each
 * conditional context. Later declarations remain the winning values; media
 * queries, keyframes and distinct selectors keep their own rules.
 *
 * @param {import("postcss").Root} css
 */
export function consolidateBootstrapRules(css) {
  /** @type {WeakMap<import("postcss").Container, Map<string, import("postcss").Rule>>} */
  const containers = new WeakMap();
  css.walkRules((rule) => {
    const parent = rule.parent;
    if (!parent) return;
    let selectors = containers.get(parent);
    if (!selectors) {
      selectors = new Map();
      containers.set(parent, selectors);
    }
    const first = selectors.get(rule.selector);
    if (!first) {
      selectors.set(rule.selector, rule);
      return;
    }
    for (const node of [...rule.nodes]) {
      if (node.type === "decl") {
        const important = first.nodes.some(
          (previous) =>
            previous.type === "decl" &&
            previous.prop === node.prop &&
            previous.important
        );
        if (important && !node.important) {
          node.remove();
          continue;
        }
        first.walkDecls(node.prop, (previous) => {
          previous.remove();
        });
      }
      first.append(node);
    }
    rule.remove();
  });
  // These upstream RTLCSS directives contain disabled CSS, not executable
  // rules. The scoped build supplies its RTL behavior explicitly.
  css.walkComments((comment) => {
    if (comment.text.trim().startsWith("rtl:raw:")) comment.remove();
  });
}

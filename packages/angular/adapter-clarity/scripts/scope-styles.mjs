/** Scope upstream Clarity CSS without leaking resets, fonts or animations. */
export function scopeStyles(css, postcss) {
  const tree = postcss.parse(
    css.replace(/\/\*# sourceMappingURL=[\s\S]*?\*\//gu, "")
  );
  const scope = ".adapttable-clarity";
  const root = `${scope}:not(${scope} *)`;
  // The upstream font faces embed SIL OFL fonts. This distribution deliberately
  // uses the host system font and does not redistribute those font bytes.
  tree.walkAtRules(/^(font-face|charset)$/u, (rule) => rule.remove());
  const animations = new Map();
  tree.walkAtRules(/keyframes$/u, (rule) => {
    const name = `adapttable-clarity-${rule.params}`;
    animations.set(rule.params, name);
    rule.params = name;
  });
  tree.walkDecls(/animation/u, (decl) => {
    decl.value = decl.value.replace(
      /[\w-]+/gu,
      (word) => animations.get(word) ?? word
    );
  });
  tree.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/u.test(rule.parent.name))
      return;
    rule.selectors = rule.selectors.map((selector) => {
      if (selector.includes(":root") || selector.includes(":host")) {
        return selector
          .replace(/:where\(:root,\s*:host\)/gu, root)
          .replace(/:root|:host/gu, root)
          .replace(`${root} [cds-theme]`, `${scope}[cds-theme]`);
      }
      if (/^(html|body)$/u.test(selector)) return root;
      return `${scope} ${selector.replace(/^(html|body)\s+/u, "")}`;
    });
  });
  return tree.toString();
}

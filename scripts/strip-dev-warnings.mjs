/**
 * Compile a package's development warnings out of its production build.
 *
 * A warning gated at runtime still ships its message: the bundle carries every
 * string whether or not it can ever print. The production build therefore
 * drops each warning statement — the call and its message — from the source
 * before bundling, and the development build keeps them. Only a statement can
 * go: a warning used as a value has no empty replacement, so the build fails
 * on one rather than leave its text behind.
 */
import { Rolldown } from "tsdown";

/**
 * Every node of an ESTree program, with its parent.
 *
 * @param {object} node
 * @param {(node: object, parent: object | undefined) => void} visit
 * @param {object | undefined} parent
 */
function walk(node, visit, parent = undefined) {
  visit(node, parent);
  for (const value of Object.values(node)) {
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        child &&
        typeof child === "object" &&
        typeof child.type === "string"
      ) {
        walk(child, visit, node);
      }
    }
  }
}

/**
 * The warning calls in a program: the statements a production build drops,
 * and any call it cannot drop because it is used as a value.
 *
 * @param {object} program
 * @param {string} callee
 */
export function warningCalls(program, callee) {
  const statements = [];
  const values = [];
  walk(program, (node, parent) => {
    if (
      node.type !== "CallExpression" ||
      node.callee.type !== "Identifier" ||
      node.callee.name !== callee
    ) {
      return;
    }
    if (parent?.type === "ExpressionStatement") statements.push(parent);
    else values.push(node);
  });
  return { statements, values };
}

/**
 * The plugin.
 *
 * @param {{ callee: string, include: (id: string) => boolean }} options -
 *   The warning function's name, and which modules' calls are dropped.
 */
export function stripDevWarnings({ callee, include }) {
  let sourcesSeen = 0;
  let dropped = 0;
  return {
    name: "adapttable:strip-dev-warnings",
    transform(code, id) {
      if (!include(id)) return null;
      sourcesSeen += 1;
      if (!code.includes(`${callee}(`)) return null;
      const lang = id.endsWith(".tsx") ? "tsx" : "ts";
      const { statements, values } = warningCalls(
        this.parse(code, { lang }),
        callee
      );
      if (values.length > 0) {
        const at = values.map((node) => String(node.start)).join(", ");
        throw new Error(
          `${id}: ${callee}() is used as a value at offset ${at}; the production build can only drop a statement`
        );
      }
      if (statements.length === 0) return null;
      const edited = new Rolldown.RolldownMagicString(code);
      // An empty block keeps an unbraced `if (…) warn(…)` well formed.
      for (const statement of statements) {
        edited.overwrite(statement.start, statement.end, "{}");
      }
      dropped += statements.length;
      // The bundler takes a plain source map object.
      const map = JSON.parse(JSON.stringify(edited.generateMap()));
      return { code: edited.toString(), map };
    },
    buildEnd(error) {
      // A build that already failed reports its own error.
      if (error) return;
      if (sourcesSeen > 0 && dropped === 0) {
        throw new Error(
          `strip-dev-warnings: no ${callee}() statement was dropped; the production build would ship every warning`
        );
      }
    },
  };
}

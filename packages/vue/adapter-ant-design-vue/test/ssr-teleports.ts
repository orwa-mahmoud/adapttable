import type { SSRContext } from "vue/server-renderer";

/** Install the actual server teleport payload before hydrating an Ant Design Vue app. */
export function installSsrTeleports(context: SSRContext): () => void {
  const nodes: Node[] = [];
  for (const [target, markup] of Object.entries(context.teleports ?? {})) {
    if (target === "body") {
      const template = document.createElement("template");
      template.innerHTML = markup;
      nodes.push(...template.content.childNodes);
      document.body.append(template.content);
      continue;
    }
    throw new Error(`Unsupported SSR teleport target: ${target}`);
  }
  return () => nodes.forEach((node) => node.parentNode?.removeChild(node));
}

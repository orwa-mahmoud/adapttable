import type { SSRContext } from "vue/server-renderer";

/** Install the actual server teleport payload before hydrating an Element Plus app. */
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
    if (!target.startsWith("#el-popper-container-"))
      throw new Error(`Unsupported SSR teleport target: ${target}`);
    if (document.querySelector(target))
      throw new Error(`SSR teleport target already exists: ${target}`);
    const container = document.createElement("div");
    container.id = target.slice(1);
    container.innerHTML = markup;
    document.body.append(container);
    nodes.push(container);
  }
  return () => nodes.forEach((node) => node.parentNode?.removeChild(node));
}

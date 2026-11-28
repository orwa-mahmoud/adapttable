/**
 * Where an Ant Design Vue overlay mounts. By default it stays beside its
 * trigger, inside the surface that owns it, so an outside click on a filter
 * panel never mistakes the menu for the page. A caller that portals names its
 * own element or selector; Ant Design Vue otherwise falls back to the body.
 */
export function popupContainer(
  teleported: boolean,
  appendTo?: HTMLElement | string
): ((trigger?: HTMLElement) => HTMLElement) | undefined {
  if (teleported) {
    if (appendTo === undefined) return undefined;
    return (trigger) => {
      if (typeof appendTo !== "string") return appendTo;
      const owner = trigger?.ownerDocument ?? document;
      return owner.querySelector<HTMLElement>(appendTo) ?? owner.body;
    };
  }
  return (trigger) =>
    trigger?.parentElement ?? trigger?.ownerDocument.body ?? document.body;
}

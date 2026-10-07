import type { RowPairMeasureController } from "@adapttable/core/binding";

import type { ElementRef } from "../attrs";

type Layout = "desktop" | "mobile";
type Half = Parameters<RowPairMeasureController["attach"]>[1];
interface RefOwner {
  readonly layout: Layout;
  readonly key: string;
  readonly index: number;
  readonly row: ElementRef<Element>;
  readonly detail: ElementRef<Element>;
  seen: number;
}
interface Attachment {
  readonly owner: RefOwner;
  readonly half: Half;
  readonly node: Element;
}

/** Stable native ref owners for one logical window; no table state is stored. */
export class VirtualRowRefs {
  readonly #attach: RowPairMeasureController["attach"];
  readonly #active: () => boolean;
  readonly #layout: () => Layout;
  readonly #desktop = new Map<string, RefOwner>();
  readonly #mobile = new Map<string, RefOwner>();
  readonly #positions = new Map<number, Partial<Record<Half, Attachment>>>();
  readonly #nodes = new WeakMap<Element, Attachment>();
  #projection = 0;
  #disposed = false;

  constructor(
    attach: RowPairMeasureController["attach"],
    active: () => boolean,
    layout: () => Layout
  ) {
    this.#attach = attach;
    this.#active = active;
    this.#layout = layout;
  }

  begin(): void {
    this.#projection += 1;
  }

  ref(
    layout: Layout,
    key: string,
    index: number,
    half: Half
  ): ElementRef<Element> {
    const cache = layout === "desktop" ? this.#desktop : this.#mobile;
    let owner = cache.get(key);
    if (owner?.index !== index) {
      const next: RefOwner = {
        layout,
        key,
        index,
        seen: this.#projection,
        row: (node) => this.#receive(next, "row", node),
        detail: (node) => this.#receive(next, "detail", node),
      };
      owner = next;
      cache.set(key, owner);
    }
    owner.seen = this.#projection;
    return owner[half];
  }

  finish(): void {
    for (const cache of [this.#desktop, this.#mobile])
      for (const [key, owner] of cache)
        if (owner.seen !== this.#projection) cache.delete(key);
  }

  dispose(): void {
    this.#disposed = true;
    // Retire complete rows first: a departing detail is not a shorter live row.
    for (const half of ["row", "detail"] as const)
      for (const parts of [...this.#positions.values()]) {
        const attached = parts[half];
        if (attached) this.#release(attached);
      }
    this.#desktop.clear();
    this.#mobile.clear();
  }

  #receive(owner: RefOwner, half: Half, node: Element | null): void {
    const previous = this.#positions.get(owner.index)?.[half];
    if (node === null) {
      if (previous?.owner === owner) this.#release(previous);
      return;
    }
    const cache = owner.layout === "desktop" ? this.#desktop : this.#mobile;
    if (
      this.#disposed ||
      !this.#active() ||
      this.#layout() !== owner.layout ||
      cache.get(owner.key) !== owner
    )
      return;
    // A keyed native node can move before its former ref receives null. Retire
    // that observation before registering its new index or callback owner.
    const former = this.#nodes.get(node);
    if (former && (former.owner !== owner || former.half !== half))
      this.#release(former);
    if (previous && previous !== former) this.#release(previous);
    const attached = { owner, half, node };
    const parts = this.#positions.get(owner.index) ?? {};
    parts[half] = attached;
    this.#positions.set(owner.index, parts);
    this.#nodes.set(node, attached);
    this.#attach(owner.index, half, node);
  }

  #release(attached: Attachment): void {
    const { owner, half, node } = attached;
    const parts = this.#positions.get(owner.index);
    if (parts?.[half] !== attached) return;
    delete parts[half];
    if (!parts.row && !parts.detail) this.#positions.delete(owner.index);
    if (this.#nodes.get(node) === attached) this.#nodes.delete(node);
    this.#attach(owner.index, half, null);
  }
}

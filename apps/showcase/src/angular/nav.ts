/** Angular's showcase header, shared by live, lab and adapter pages. */
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from "@angular/core";

import {
  FRAMEWORK_STORAGE_KEY,
  frameworkDemoTarget,
  SITE_FRAMEWORKS,
} from "../../../../scripts/framework-navigation.mjs";
import {
  docsUrl,
  featuresOf,
  kitAccent,
  SHOWCASE_ADAPTERS,
} from "../matrix/content";
import { navigationMenuShift } from "../navGeometry";
import { SHOWCASE_DARK } from "./showcaseKit";
import { AdaptShowcaseWordmark } from "./wordmark";

@Component({
  selector: "adapt-showcase-nav",
  imports: [AdaptShowcaseWordmark],
  templateUrl: "./nav.html",
  host: { style: "display: contents" },
})
export class AdaptShowcaseNav {
  readonly active = input.required<string>();
  readonly kit = input.required<string>();
  readonly beforeNavigate = input<() => boolean>(() => true);
  readonly dark = inject(SHOWCASE_DARK);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly open = signal(false);
  readonly shift = signal(0);
  private layoutFrame = 0;
  private pendingFocus: number | null = null;
  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.layoutFrame));
  }
  toggleMenu(): void {
    this.open.update((value) => !value);
    this.layoutMenu();
  }
  @HostListener("window:resize")
  layoutMenu(): void {
    cancelAnimationFrame(this.layoutFrame);
    if (!this.open()) {
      this.shift.set(0);
      return;
    }
    this.layoutFrame = requestAnimationFrame(() => {
      const box = this.element.nativeElement
        .querySelector(".nav__menu")
        ?.getBoundingClientRect();
      if (!box || !this.open()) return;
      this.shift.set(
        navigationMenuShift(
          { left: box.left - this.shift(), right: box.right - this.shift() },
          document.documentElement.clientWidth
        )
      );
      if (this.pendingFocus !== null) {
        this.focusItem(this.pendingFocus);
        this.pendingFocus = null;
      }
    });
  }
  private focusItem(index: number): void {
    const items = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLAnchorElement>(
        ".nav__menu a"
      )
    );
    if (!items.length) return;
    items[((index % items.length) + items.length) % items.length]?.focus();
  }
  triggerKey(event: KeyboardEvent): void {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = event.key === "ArrowDown" ? 0 : -1;
    if (this.open()) {
      this.focusItem(index);
      return;
    }
    this.pendingFocus = index;
    this.open.set(true);
    this.layoutMenu();
  }
  menuKey(event: KeyboardEvent): void {
    const items = Array.from(
      this.element.nativeElement.querySelectorAll<HTMLAnchorElement>(
        ".nav__menu a"
      )
    );
    const index = items.findIndex((item) => item === document.activeElement);
    const moves: Readonly<Record<string, number>> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: -1,
    };
    const next = moves[event.key];
    if (next !== undefined) {
      event.preventDefault();
      this.focusItem(next);
    }
    if (event.key === "Tab") this.escape();
  }
  readonly frameworks = SITE_FRAMEWORKS;
  readonly adapters = SHOWCASE_ADAPTERS.filter(
    (adapter) => adapter.framework === "angular" && adapter.built !== false
  );
  readonly docs = docsUrl("getting-started", "angular");
  readonly repo = "https://github.com/orwa-mahmoud/adapttable";
  readonly deployed = /^\/angular\/demo(?:\/|$)/.test(window.location.pathname);
  href(page: string): string {
    if (this.deployed) return `/angular/demo/${page ? page + "/" : ""}`;
    if (!page) return "/angular-main/";
    return page === "all-options" ? "/angular-all-options/" : `/${page}/`;
  }
  demoHref(page: string): string {
    return `${this.href(page)}?kit=${encodeURIComponent(this.kit())}`;
  }
  features() {
    const adapter = this.adapters.find((item) => item.key === this.kit());
    return adapter ? featuresOf(adapter) : [];
  }
  accent(adapter: (typeof this.adapters)[number]): string {
    return kitAccent(adapter, this.dark());
  }
  switchPage(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const selected = event.target.value;
    const destinations = [
      this.demoHref(""),
      this.demoHref("all-options"),
      this.href(this.kit() + "/ai"),
      ...this.adapters.map((adapter) => this.href(adapter.key)),
      ...this.features().map((feature) =>
        this.href(this.kit() + "/" + feature.slug)
      ),
    ];
    const destination = destinations.find((href) => href === selected);
    if (destination && this.beforeNavigate()())
      window.location.assign(destination);
  }
  switchFramework(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    if (!this.beforeNavigate()()) {
      event.target.value = "angular";
      return;
    }
    const framework = event.target.value;
    try {
      localStorage.setItem(FRAMEWORK_STORAGE_KEY, framework);
    } catch {
      /* Storage is optional. */
    }
    window.location.assign(
      frameworkDemoTarget(
        window.location.pathname + window.location.search,
        framework,
        SHOWCASE_ADAPTERS,
        featuresOf
      ).href
    );
  }
  @HostListener("document:click", ["$event"])
  outside(event: MouseEvent): void {
    if (
      event.target instanceof Node &&
      !this.element.nativeElement
        .querySelector(".nav__group")
        ?.contains(event.target)
    )
      this.open.set(false);
  }
  @HostListener("document:keydown.escape")
  escape(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.element.nativeElement
      .querySelector<HTMLButtonElement>(".nav__trigger")
      ?.focus();
  }
}

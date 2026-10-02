/**
 * Applies an attribute record from `@adapttable/core`'s prop getters to the
 * host or a kit-supplied inner element, so a template writes
 * `[adaptAttrs]="table.tableAttrs()"` instead of binding each attribute by hand.
 */
import {
  afterEveryRender,
  type AfterRenderRef,
  type AfterViewChecked,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  Renderer2,
  RendererStyleFlags2,
} from "@angular/core";

import { primitiveText } from "./columnDef";

/**
 * An attribute record: attribute values, an optional `style` object, event
 * handlers (`onClick`, `onChange`, `onKeyDown`, `onFocus` and the mouse
 * presses) and an optional `ref` that receives the element.
 *
 * @public
 */
export type Attrs = Readonly<Record<string, unknown>>;

/** The DOM event each handler key listens to. */
const EVENTS: Readonly<Record<string, string>> = {
  onClick: "click",
  // A prop getter's `onChange` follows every keystroke.
  onChange: "input",
  onKeyDown: "keydown",
  onFocus: "focus",
  onBlur: "blur",
  onDragStart: "dragstart",
  onDragOver: "dragover",
  onDrop: "drop",
  onDragEnd: "dragend",
  onMouseDown: "mousedown",
  onMouseEnter: "mouseenter",
  onMouseUp: "mouseup",
  onPointerDown: "pointerdown",
  onDoubleClick: "dblclick",
};

/**
 * Boolean keys set as DOM properties rather than attributes, so a checkbox
 * follows the record after the user has clicked it.
 */
const PROPERTIES = new Set(["checked", "indeterminate"]);

/** Record keys spelled the React way, and the attribute each one names. */
const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  tabIndex: "tabindex",
};

/**
 * Enumerated attributes whose boolean is written as `"true"` / `"false"`:
 * an empty `draggable` is not draggable.
 */
const ENUMERATED = new Set(["draggable", "spellcheck", "contenteditable"]);

/**
 * Style properties whose number is a plain number, not a length — React's
 * list, so a style record means the same in every binding.
 */
const UNITLESS = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "columnCount",
  "columns",
  "fillOpacity",
  "flex",
  "flexGrow",
  "flexShrink",
  "floodOpacity",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
]);

/** A style key as CSS spells it: `insetInlineStart` → `inset-inline-start`. */
function cssProperty(key: string): string {
  if (key.startsWith("--")) return key;
  return key.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** A style value as CSS reads it: a length's number in pixels. */
function cssValue(key: string, value: unknown): unknown {
  if (typeof value !== "number" || key.startsWith("--") || UNITLESS.has(key)) {
    return value;
  }
  return `${String(value)}px`;
}

/** The attribute text for a value, or `null` to remove the attribute. */
function attributeText(name: string, value: unknown): string | null {
  // ARIA states are tokens: `aria-selected="false"` says something.
  if (typeof value === "boolean" && ENUMERATED.has(name)) {
    return String(value);
  }
  if (typeof value === "boolean" && !name.startsWith("aria-")) {
    return value ? "" : null;
  }
  return primitiveText(value);
}

/**
 * Apply an attribute record to an element and keep it in step: a key
 * that leaves the record is removed, a style that leaves it is cleared, and
 * a handler is replaced when the record's changes.
 *
 * `value` is set as the property, so an input's text follows the record.
 *
 * @public
 */
@Directive({ selector: "[adaptAttrs]" })
export class AdaptAttrs implements AfterViewChecked {
  /** The attributes to apply. */
  readonly adaptAttrs = input.required<Attrs>();

  /**
   * An inner element, or a stable getter resolved after Angular checks the
   * kit's view. Omitted or `undefined` uses the directive's host; `null`
   * waits without applying the record anywhere.
   */
  readonly adaptAttrsTarget = input<
    HTMLElement | null | undefined | (() => HTMLElement | null)
  >();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly injector = inject(Injector);
  private afterRender: AfterRenderRef | undefined;
  private target: HTMLElement | null = null;
  private attrs: Attrs | undefined;
  private attributes = new Set<string>();
  private styles = new Set<string>();
  private readonly properties = new Set<string>();
  private readonly handlers = new Map<string, (event: Event) => void>();
  private readonly listening = new Map<string, () => void>();
  private ref: ((element: HTMLElement | null) => void) | undefined;

  constructor() {
    effect(() => this.refresh());
    inject(DestroyRef).onDestroy(() => {
      this.afterRender?.destroy();
      this.afterRender = undefined;
      this.releaseTarget();
    });
  }

  /** Generated elements can change during a kit's view update, including SSR. */
  ngAfterViewChecked(): void {
    if (typeof this.adaptAttrsTarget() === "function") {
      // A kit may refresh only its own OnPush view. In the browser, observe
      // that render too; the view hook below still supplies the server path.
      this.afterRender ??= afterEveryRender(() => this.refresh(), {
        injector: this.injector,
      });
    } else {
      this.afterRender?.destroy();
      this.afterRender = undefined;
    }
    this.refresh();
  }

  private refresh(): void {
    const attrs = this.adaptAttrs();
    const supplied = this.adaptAttrsTarget();
    const resolved = typeof supplied === "function" ? supplied() : supplied;
    const target =
      resolved === undefined ? this.element.nativeElement : resolved;
    if (target === this.target && attrs === this.attrs) return;
    this.apply(attrs, target);
    this.attrs = attrs;
  }

  private apply(attrs: Attrs, target: HTMLElement | null): void {
    if (target !== this.target) {
      this.releaseTarget();
      this.target = target;
    }
    if (target === null) return;
    const attributes = new Set<string>();
    let styles = new Set<string>();
    for (const [name, value] of Object.entries(attrs)) {
      const event = EVENTS[name];
      if (event) this.handle(target, name, event, value);
      else if (name === "style") styles = this.applyStyle(target, value);
      else if (name === "ref") continue;
      else if (name === "value") this.setProperty(target, name, value ?? "");
      else if (PROPERTIES.has(name)) {
        this.setProperty(target, name, value === true);
      } else {
        const attribute = ATTRIBUTE_NAMES[name] ?? name;
        if (this.applyAttribute(target, attribute, value)) {
          attributes.add(attribute);
        }
      }
    }
    this.prune(target, attrs, attributes, styles);
    this.attachRef(target, attrs.ref);
  }

  /** Release the previous target before another element receives the record. */
  private releaseTarget(): void {
    for (const stopListening of this.listening.values()) stopListening();
    this.listening.clear();
    this.handlers.clear();
    this.ref?.(null);
    this.ref = undefined;
    if (this.target) this.prune(this.target, {}, new Set(), new Set());
    this.target = null;
  }

  /** Hand the element to a record's `ref`, and release the one it replaced. */
  private attachRef(target: HTMLElement, value: unknown): void {
    const ref =
      typeof value === "function"
        ? (value as (element: HTMLElement | null) => void)
        : undefined;
    if (ref === this.ref) return;
    this.ref?.(null);
    this.ref = ref;
    ref?.(target);
  }

  private setProperty(target: HTMLElement, name: string, value: unknown): void {
    this.renderer.setProperty(target, name, value);
    this.properties.add(name);
  }

  /** Set one attribute; `false` when the value removes it. */
  private applyAttribute(
    target: HTMLElement,
    name: string,
    value: unknown
  ): boolean {
    const text = attributeText(name, value);
    if (text === null) return false;
    this.renderer.setAttribute(target, name, text);
    return true;
  }

  /** Set a style object's properties; returns the ones it set. */
  private applyStyle(target: HTMLElement, style: unknown): Set<string> {
    const set = new Set<string>();
    const entries = Object.entries((style ?? {}) as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (value === undefined || value === null) continue;
      const property = cssProperty(key);
      set.add(property);
      this.renderer.setStyle(
        target,
        property,
        cssValue(key, value),
        RendererStyleFlags2.DashCase
      );
    }
    return set;
  }

  /** Remove what the previous record set and this one does not. */
  private prune(
    target: HTMLElement,
    attrs: Attrs,
    attributes: Set<string>,
    styles: Set<string>
  ): void {
    for (const name of this.attributes) {
      if (!attributes.has(name)) this.renderer.removeAttribute(target, name);
    }
    for (const property of this.styles) {
      if (!styles.has(property)) {
        this.renderer.removeStyle(
          target,
          property,
          RendererStyleFlags2.DashCase
        );
      }
    }
    for (const name of this.properties) {
      if (!(name in attrs)) {
        this.renderer.setProperty(target, name, name === "value" ? "" : false);
        this.properties.delete(name);
      }
    }
    for (const name of this.handlers.keys()) {
      if (!(name in attrs)) this.handlers.delete(name);
    }
    this.attributes = attributes;
    this.styles = styles;
  }

  private handle(
    target: HTMLElement,
    name: string,
    eventName: string,
    value: unknown
  ): void {
    if (typeof value !== "function") {
      this.handlers.delete(name);
      return;
    }
    this.handlers.set(name, value as (event: Event) => void);
    if (this.listening.has(name)) return;
    this.listening.set(
      name,
      this.renderer.listen(target, eventName, (event) => {
        this.handlers.get(name)?.(event as Event);
      })
    );
  }
}

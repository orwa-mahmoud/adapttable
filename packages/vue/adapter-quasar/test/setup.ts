import { afterAll } from "vitest";

const orientation = Object.getOwnPropertyDescriptor(
  window.screen,
  "orientation"
);
// jsdom does not implement the browser's ScreenOrientation API.
Object.defineProperty(window.screen, "orientation", {
  configurable: true,
  value: Object.assign(new EventTarget(), {
    angle: 0,
    type: "landscape-primary",
  }),
});

afterAll(() => {
  if (orientation)
    Object.defineProperty(window.screen, "orientation", orientation);
  else Reflect.deleteProperty(window.screen, "orientation");
});

const scrollTo = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTo");
Object.defineProperty(Element.prototype, "scrollTo", {
  configurable: true,
  value(this: Element, options: ScrollToOptions | number, y?: number) {
    this.scrollLeft =
      typeof options === "number" ? options : (options.left ?? this.scrollLeft);
    this.scrollTop =
      typeof options === "number"
        ? (y ?? this.scrollTop)
        : (options.top ?? this.scrollTop);
  },
});
afterAll(() => {
  if (scrollTo) Object.defineProperty(Element.prototype, "scrollTo", scrollTo);
  else Reflect.deleteProperty(Element.prototype, "scrollTo");
});

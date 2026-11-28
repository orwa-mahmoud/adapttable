// Headless UI's Dialog watches its panel with a ResizeObserver, which jsdom
// does not provide. A no-op observer is enough: layout is not under test.
class ResizeObserverStub {
  observe(): void {
    return undefined;
  }
  unobserve(): void {
    return undefined;
  }
  disconnect(): void {
    return undefined;
  }
}
Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverStub,
});

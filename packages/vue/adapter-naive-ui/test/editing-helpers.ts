export { find, mount, part, tick, write } from "./filter-helpers";
import { find, part, tick } from "./filter-helpers";
export async function click(root: ParentNode, name: string) {
  find<HTMLElement>(root, part(name)).click();
  await tick();
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

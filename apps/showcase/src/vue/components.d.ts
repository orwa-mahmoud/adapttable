/**
 * TypeScript-aware linting does not compile SFC imports. Describe these
 * prop-free bootstrap components; vue-tsc still checks their actual templates
 * and the generic adapter components without a wildcard SFC fallback.
 */
declare module "*NativeDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

declare module "*HierarchyDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

declare module "*RowsDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

declare module "*SelectionContractDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

declare module "*ViewControlsDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

declare module "*VueAssistantShowcase.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

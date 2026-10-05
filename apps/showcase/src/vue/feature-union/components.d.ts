/** The bootstrap has no props; vue-tsc checks its actual template. */
declare module "*FeatureUnionDemo.vue" {
  import type { DefineComponent } from "vue";
  const demo: DefineComponent;
  export default demo;
}

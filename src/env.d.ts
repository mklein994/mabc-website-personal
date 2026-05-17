declare module "*.vue" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}

// https://lucide.dev/guide/vue/advanced/aliased-names
declare module "@lucide/vue" {
  // Limit Lucide icon imports to only those ending in `*Icon.vue`
  export * from "@lucide/vue/dist/lucide-vue.suffixed";
}

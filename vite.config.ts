import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  define: {
    __VUE_OPTIONS_API__: false,
  },

  resolve: {
    alias: {
      "@": resolve("./src"),
    },
  },

  plugins: [vue(), tailwindcss()],
});

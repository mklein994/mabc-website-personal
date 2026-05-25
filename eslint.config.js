import globals from "globals";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import pluginPrettier from "eslint-config-prettier/flat";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "eslint/config";

const resolve = (path) => fileURLToPath(new URL(path, import.meta.url));

const noUnusedVarsRule = [
  "warn",
  {
    vars: "all",
    args: "after-used",
    ignoreRestSiblings: false,
    argsIgnorePattern: "^_",
  },
];

export default defineConfig([
  {
    files: ["*.js", "*.mjs", "*.cjs"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    extends: [eslint.configs.recommended, pluginPrettier],
    rules: {
      "no-unused-vars": noUnusedVarsRule,
    },
  },

  {
    files: ["*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ["**/*.ts", "**/*.vue"],
    ignores: ["dist/", "coverage/"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          "./tsconfig.app.json",
          "./tsconfig.node.json",
          "./functions/tsconfig.json",
        ],
      },
    },
    rules: {
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            ["^\\u0000"],
            ["^node:"],
            ["^@?\\w"],
            ["\\.vue\\u0000?$"],
            ["^"],
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "warn",
    },
  },

  {
    files: ["**/*.ts", "**/*.vue"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.eslintRecommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...pluginVue.configs["flat/recommended"],
      pluginPrettier,
    ],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            ["^\\u0000"],
            ["^node:"],
            ["^@?\\w"],
            ["\\.vue\\u0000?$"],
            ["^"],
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/no-unused-vars": noUnusedVarsRule,
      "vue/block-order": [
        "error",
        {
          order: ["script:not([setup])", "script[setup]", "template", "style"],
        },
      ],
      "vue/component-api-style": ["error", ["script-setup"]],
      "vue/define-macros-order": "warn",
    },
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: [
          "./tsconfig.app.json",
          "./tsconfig.node.json",
          "./functions/tsconfig.json",
        ],
        extraFileExtensions: [".vue"],
        tsconfigRootDir: resolve("."),
      },
      globals: {
        // e.g. FOO_BAR: "readonly",
      },
    },
  },

  {
    ignores: ["dist/", "coverage/", "public/coverage/"],
  },
]);

import configTailwindCss from "@dreamsicle.io/stylelint-config-tailwindcss/dist/stylelint.config.mjs";

/** @type {import("stylelint").Config} */
export default {
  extends: [
    "stylelint-config-recommended",
    "stylelint-config-clean-order",
    "stylelint-config-recommended-vue",
    "@dreamsicle.io/stylelint-config-tailwindcss",
  ],
  languageOptions: {
    syntax: {
      atRules: {
        plugin: { prelude: "<string>" },
        ...configTailwindCss.languageOptions.syntax.atRules,
      },
    },
  },
  overrides: [
    {
      files: ["**/*.vue", "*.vue", "**/*.css", "*.css"],
      ignoreFiles: "**/reset.css",
    },
  ],
};

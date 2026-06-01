import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Fonts are loaded via a <link> in the App Router root layout on purpose
      // (avoids next/font's build-time network fetch). This rule targets the
      // pages router and is a false positive here.
      "@next/next/no-page-custom-font": "off",
      // Card images come from arbitrary admin-provided URLs; plain <img> avoids
      // per-domain next/image config.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

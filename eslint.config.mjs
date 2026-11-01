import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // McCabe cyclomatic complexity: each if, ?:, &&, ||, ??, loop, and case
    // adds a path through a function. 21 was the highest score in the code
    // when this limit was set (PaintingFields, mostly `|| ""` fallbacks), so
    // lint fails if any function grows past today's worst instead of the
    // code drifting more complex unnoticed.
    rules: { complexity: ["error", { max: 21 }] },
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

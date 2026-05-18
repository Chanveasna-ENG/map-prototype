import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // --- Structural & Complexity Constraints ---
      "complexity": ["error", 8], // Limits branches, loops, and conditions in a single function
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "max-depth": ["error", 3], // Prevents deep nesting (e.g., if inside an if inside a loop)
      "max-params": ["error", 3], // Forces grouping arguments into objects if exceeding 3

      // --- Strict TypeScript ---
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error", // Forces explicit return types on all functions
      "@typescript-eslint/no-non-null-assertion": "error", // Prevents overriding TS undefined checks (e.g., obj!.prop)
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }], // Allows unused vars only if prefixed with _
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }], // Forces `import type` for types

      // --- General Code Quality ---
      "eqeqeq": ["error", "always"], // Forces === instead of ==
      "no-console": ["warn", { allow: ["warn", "error"] }], // Flags console.log for cleanup
      "no-param-reassign": "error", // Prevents mutating variables passed as function parameters
      "curly": ["error", "all"], // Requires brackets for all if/while/for statements to prevent accidental bugs
      "prefer-const": "error"
    }
  }
]);

export default eslintConfig;
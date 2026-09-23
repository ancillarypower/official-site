import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

// Build a11y rules at warn level for gradual rollout
const a11yWarnRules = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([key, val]) => [
    key,
    Array.isArray(val) ? ["warn", ...val.slice(1)] : "warn",
  ]),
);

export default [
  { ignores: ["dist/", "**/*.config.*", ".github/", "public/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs["recommended-latest"],
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      ...a11yWarnRules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      // Tests commonly use `any` for mocks and type assertions
      "@typescript-eslint/no-explicit-any": "off",
      // Unused vars with _ prefix are test fixtures/helpers
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { fileURLToPath } from "node:url";

const tsconfigRootDir = fileURLToPath(new URL(".", import.meta.url));

const nodeGlobals = {
  Buffer: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  clearImmediate: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  exports: "writable",
  global: "readonly",
  module: "writable",
  process: "readonly",
  require: "readonly",
  setImmediate: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly",
};

const testGlobals = {
  after: "readonly",
  afterEach: "readonly",
  before: "readonly",
  beforeEach: "readonly",
  describe: "readonly",
  it: "readonly",
};

export default [
  {
    ignores: [
      "coverage/**",
      "docs/**",
      "node_modules/**",
      "references/**",
    ],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: nodeGlobals,
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
        tsconfigRootDir,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "no-var": "off",
      "prefer-rest-params": "off",
    },
  },
  {
    files: ["lib/**/*.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...nodeGlobals,
        ...testGlobals,
      },
      sourceType: "script",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          args: "none",
          varsIgnorePattern: "^_|attempt$",
        },
      ],
    },
  },
];

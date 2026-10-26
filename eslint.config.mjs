// Flat config (ESLint 9+). Requires: eslint-plugin-obsidianmd,
// @typescript-eslint/parser, typescript-eslint.
//
// The obsidianmd recommended set enables some rules with no `files` filter, and
// a few use the TypeScript parser services. Linting JSON/build files with them
// throws "rule requires type information", so we scope ESLint to the TypeScript
// sources and supply parserOptions.project for them.
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{
		// Lint only the plugin source. The test suite is exercised by Vitest, and
		// the obsidianmd / type-checked rules target plugin source — not specs.
		ignores: [
			"main.js",
			"dist/**",
			"esbuild.config.mjs",
			"eslint.config.mjs",
			"version-bump.mjs",
			"vitest.config.ts",
			"tests/**",
			"**/*.json",
		],
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts", "src/**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
		// The source has been driven to full obsidianmd compliance:
		// inline styles extracted to CSS classes, Google
		// Places API responses fully typed, timers switched to window.*, and
		// sentence-case applied everywhere except genuine product names
		// ("Google Places", "Google Cloud Console"), which carry per-line
		// `eslint-disable obsidianmd/ui/sentence-case` comments. These rules are
		// promoted back to "error" so the gate stays real. All other rules are
		// errors via the obsidianmd recommended preset.
		rules: {
			"obsidianmd/ui/sentence-case": "error",
			"obsidianmd/no-static-styles-assignment": "error",
			"obsidianmd/prefer-window-timers": "error",
			"obsidianmd/settings-tab/no-problematic-settings-headings": "error",
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-unsafe-assignment": "error",
			"@typescript-eslint/no-unsafe-call": "error",
			"@typescript-eslint/no-unsafe-member-access": "error",
			"@typescript-eslint/no-unsafe-argument": "error",
			"@typescript-eslint/no-base-to-string": "error",
			"@typescript-eslint/restrict-template-expressions": "error",
			"@typescript-eslint/no-misused-promises": "error",
		},
	},
]);

// Setup global test configuration
// This file runs before all tests (registered via vitest.config.ts `setupFiles`).

// The plugin uses `window.setTimeout` (and `activeDocument`) for Obsidian
// popout-window compatibility — see eslint-plugin-obsidianmd's
// `prefer-window-timers` / `prefer-active-doc` rules. The Vitest environment is
// `node`, which has no `window`, so timer-based source (e.g.
// BatchUpdateService.sleep) would throw `ReferenceError: window is not defined`.
// Alias `window` to `globalThis` so those globals resolve to Node's timers.
if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
	(globalThis as { window?: unknown }).window = globalThis;
}

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/**/*.{test,spec}.{ts,js}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'node_modules/',
				'tests/',
				'**/*.spec.ts',
				'**/*.test.ts',
				'dist/',
				'main.js',
				'esbuild.config.mjs',
				'src/types/**'
			],
			lines: 80,
			functions: 80,
			branches: 75,
			statements: 80
		}
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'obsidian': path.resolve(__dirname, './tests/helpers/mockObsidian.ts')
		}
	},
	esbuild: {
		target: 'es2020'
	}
});

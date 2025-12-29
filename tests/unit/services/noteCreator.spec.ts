// Globals enabled in vitest.config.ts - describe, it, expect, beforeEach, vi are available globally
import { vi } from 'vitest';
import { NoteCreator } from '../../../src/services/noteCreator';
import { MockApp, MockVault } from '../../helpers/mockObsidian';
import { DEFAULT_SETTINGS } from '../../../src/types';
import type { TFile, TFolder } from 'obsidian';

// Import obsidian for mocking
import * as obsidian from 'obsidian';

// Spy on the obsidian module
const mockNotice = vi.spyOn(obsidian, 'Notice' as any);
const mockRequestUrl = vi.spyOn(obsidian, 'requestUrl' as any);
const mockNormalizePath = vi.spyOn(obsidian, 'normalizePath' as any).mockImplementation((path: string) => path.replace(/\\/g, '/'));

describe('NoteCreator', () => {
	let noteCreator: NoteCreator;
	let mockApp: MockApp;
	let mockVault: MockVault;
	let settings: typeof DEFAULT_SETTINGS;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = new MockApp();
		mockVault = mockApp.vault;
		settings = { ...DEFAULT_SETTINGS, targetFolder: 'Places', imageFolder: 'images' };
		noteCreator = new NoteCreator(mockApp as any, settings);
	});

	describe('createNote', () => {
		it('should create file with correct path in targetFolder', async () => {
			const frontmatter = { name: 'Test Place', address: '123 Main St' };
			const filename = 'Test Place';

			const file = await noteCreator.createNote(filename, frontmatter, 'Test Place');

			expect(file.path).toBe('Places/Test Place.md');
			expect(mockVault.hasFile('Places/Test Place.md')).toBe(true);
		});

		it('should generate unique filename when collision occurs', async () => {
			// Create an existing file
			await mockVault.create('Places/Test Place.md', 'existing content');

			const frontmatter = { name: 'Test Place' };
			const file = await noteCreator.createNote('Test Place', frontmatter, 'Test Place');

			expect(file.path).toBe('Places/Test Place 1.md');
		});

		it('should create folder if targetFolder doesn\'t exist', async () => {
			const frontmatter = { name: 'Test' };

			await noteCreator.createNote('Test', frontmatter, 'Test');

			expect(mockVault.hasFolder('Places')).toBe(true);
		});

		it('should format frontmatter correctly as YAML', async () => {
			const frontmatter = {
				name: 'Test',
				rating: 4.5,
				cuisine: ['Italian', 'Pizza']
			};

			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('---');
			expect(content).toContain('name: Test');
			expect(content).toContain('rating: 4.5');
			expect(content).toContain('cuisine: [Italian, Pizza]');
		});

		it('should create basic note when no template specified', async () => {
			settings.templateFilePath = '';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test', frontmatter, 'Test Place');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('# Test Place');
		});

		it('should include template content when template exists', async () => {
			const templateContent = `---
tags:
  - restaurant
---

## Notes
`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test', frontmatter, 'Test', 'template.md');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('## Notes');
		});

		it('should return created TFile object', async () => {
			const frontmatter = { name: 'Test' };
			const file = await noteCreator.createNote('Test', frontmatter, 'Test');

			expect(file).toBeDefined();
			expect(file.path).toBe('Places/Test.md');
			expect(file.basename).toBe('Test');
		});

		it('should show notice with filename', async () => {
			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test Place', frontmatter, 'Test Place');

			expect(mockNotice).toHaveBeenCalledWith('Created note: Test Place');
		});
	});

	describe('formatFrontmatter', () => {
		it('should output valid YAML with delimiters', async () => {
			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toMatch(/^---\n/);
			expect(content).toContain('\n---\n');
		});

		it('should handle string values correctly', async () => {
			const frontmatter = { name: 'Test Restaurant', city: 'New York' };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('name: Test Restaurant');
			expect(content).toContain('city: New York');
		});

		it('should handle number values correctly', async () => {
			const frontmatter = { rating: 4.5, count: 100 };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('rating: 4.5');
			expect(content).toContain('count: 100');
		});

		it('should handle boolean values correctly', async () => {
			const frontmatter = { isClosed: false };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('isClosed: false');
		});

		it('should handle cuisine array as inline format', async () => {
			const frontmatter = { cuisine: ['Italian', 'Pizza', 'Pasta'] };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('cuisine: [Italian, Pizza, Pasta]');
		});

		it('should handle location array as YAML list', async () => {
			const frontmatter = { location: ['34.0522', '-118.2437'] };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('location:');
			expect(content).toContain('  - 34.0522');
			expect(content).toContain('  - -118.2437');
		});

		it('should skip undefined/null values', async () => {
			const frontmatter = { name: 'Test', empty: undefined, nullValue: null };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).not.toContain('empty');
			expect(content).not.toContain('nullValue');
		});

		it('should handle empty arrays', async () => {
			const frontmatter = { cuisine: [] };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			// Empty array should still have the key
			expect(content).toContain('cuisine:');
		});
	});

	describe('parseTemplate', () => {
		it('should extract frontmatter from template with delimiters', async () => {
			const templateContent = `---
tags:
  - restaurant
custom: value
---

# Template Body`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test', frontmatter, 'Test', 'template.md');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('custom: value');
			expect(content).toContain('# Template Body');
		});

		it('should return empty object when no frontmatter present', async () => {
			const templateContent = `# Just a heading

Some content`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test', frontmatter, 'Test', 'template.md');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('# Just a heading');
		});

		it('should handle template with only frontmatter (no body)', async () => {
			const templateContent = `---
tags:
  - restaurant
---`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Test' };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('name: Test');
		});
	});

	describe('buildNoteContent', () => {
		it('should merge template frontmatter with new frontmatter', async () => {
			const templateContent = `---
tags:
  - restaurant
templateField: original
---

Body`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Test', newField: 'added' };
			await noteCreator.createNote('Test', frontmatter, 'Test', 'template.md');

			const content = mockVault.getFileContent('Places/Test.md');
			expect(content).toContain('name: Test');
			expect(content).toContain('newField: added');
			expect(content).toContain('templateField: original');
		});

		it('should allow new frontmatter to overwrite template fields', async () => {
			const templateContent = `---
name: Template Name
rating: 3.0
---`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const frontmatter = { name: 'Actual Name', rating: 4.5 };
			await noteCreator.createNote('Test', frontmatter, 'Test');

			const content = mockVault.getFileContent('Places/Test.md');
			// Check that the new values are in the frontmatter (at the top)
			const lines = content.split('\n');
			const firstFrontmatterEnd = lines.indexOf('---', 1);
			const firstFrontmatter = lines.slice(0, firstFrontmatterEnd + 1).join('\n');

			expect(firstFrontmatter).toContain('name: Actual Name');
			expect(firstFrontmatter).toContain('rating: 4.5');
		});
	});

	describe('getUniqueFilePath', () => {
		it('should return original path if no collision', async () => {
			const file = await noteCreator.createNote('Unique', {}, 'Unique');
			expect(file.path).toBe('Places/Unique.md');
		});

		it('should append 1 for first collision', async () => {
			await mockVault.create('Places/Test.md', 'existing');

			const file = await noteCreator.createNote('Test', {}, 'Test');
			expect(file.path).toBe('Places/Test 1.md');
		});

		it('should increment counter for multiple collisions', async () => {
			await mockVault.create('Places/Test.md', 'existing 1');
			await mockVault.create('Places/Test 1.md', 'existing 2');

			const file = await noteCreator.createNote('Test', {}, 'Test');
			expect(file.path).toBe('Places/Test 2.md');
		});

		it('should handle empty folder (root)', async () => {
			settings.targetFolder = '';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const file = await noteCreator.createNote('Root Test', {}, 'Root Test');
			expect(file.path).toBe('Root Test.md');
		});
	});
});

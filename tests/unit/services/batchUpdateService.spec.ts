// Globals enabled in vitest.config.ts - describe, it, expect, beforeEach, vi are available globally
import { vi } from 'vitest';
import { BatchUpdateService } from '../../../src/services/batchUpdateService';
import { GooglePlacesService } from '../../../src/services/googlePlaces';
import { DataMapper } from '../../../src/services/dataMapper';
import { MockApp, MockVault } from '../../helpers/mockObsidian';
import { DEFAULT_SETTINGS } from '../../../src/types';
import type { TFile } from 'obsidian';
import type { PlaceSearchResult, GooglePlaceDetailsResponse } from '../../../src/types';

describe('BatchUpdateService', () => {
	let batchUpdateService: BatchUpdateService;
	let mockApp: MockApp;
	let mockVault: MockVault;
	let mockGooglePlacesService: GooglePlacesService;
	let mockDataMapper: DataMapper;
	let settings: typeof DEFAULT_SETTINGS;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = new MockApp();
		mockVault = mockApp.vault;
		settings = {
			...DEFAULT_SETTINGS,
			targetFolder: 'Places',
			batchUpdateAddressField: 'address',
			batchUpdateUseFilenameAsFallback: true,
			batchUpdateAutoSelectSingleResult: true,
			batchUpdateRateLimit: 100
		};

		mockGooglePlacesService = new GooglePlacesService('test-api-key');
		mockDataMapper = new DataMapper(settings);
		batchUpdateService = new BatchUpdateService(
			mockApp as any,
			settings,
			mockGooglePlacesService,
			mockDataMapper
		);
	});

	describe('findFiles', () => {
		it('should return all markdown files when no search query provided', async () => {
			await mockVault.create('Places/Restaurant1.md', '# Restaurant1');
			await mockVault.create('Places/Restaurant2.md', '# Restaurant2');
			await mockVault.create('Other/Note.md', '# Note');

			const files = batchUpdateService.findFiles('');

			expect(files).toHaveLength(3);
		});

		it('should filter files by folder path', async () => {
			await mockVault.create('Places/Restaurant1.md', '# Restaurant1');
			await mockVault.create('Places/Restaurant2.md', '# Restaurant2');
			await mockVault.create('Other/Note.md', '# Note');

			const files = batchUpdateService.findFiles('Places');

			expect(files).toHaveLength(2);
			expect(files.every(f => f.path.includes('Places'))).toBe(true);
		});

		it('should be case insensitive when filtering', async () => {
			await mockVault.create('Places/Restaurant.md', '# Restaurant');
			await mockVault.create('places/lowercase.md', '# Lower');

			const files = batchUpdateService.findFiles('PLACES');

			expect(files).toHaveLength(2);
		});

		it('should match partial folder paths', async () => {
			await mockVault.create('My Places/Restaurant.md', '# Restaurant');
			await mockVault.create('Other/Note.md', '# Note');

			const files = batchUpdateService.findFiles('places');

			expect(files).toHaveLength(1);
			expect(files[0].path).toBe('My Places/Restaurant.md');
		});

		it('should return all files when query is only whitespace', async () => {
			await mockVault.create('file1.md', '# File1');
			await mockVault.create('file2.md', '# File2');

			const files = batchUpdateService.findFiles('   ');

			expect(files).toHaveLength(2);
		});
	});

	describe('filterFilesNeedingUpdate', () => {
		it('should include files without address and location', async () => {
			const content = `---
name: Test Restaurant
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
			expect(filesToProcess[0].source).toBe('filename');
			expect(filesToProcess[0].searchQuery).toBe('Test');
		});

		it('should skip files with both valid address and location', async () => {
			const content = `---
name: Test Restaurant
address: 123 Main St
location:
  - 34.0522
  - -118.2437
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(0);
		});

		it('should include files with address but no location', async () => {
			const content = `---
name: Test Restaurant
address: 123 Main St
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
		});

		it('should include files with location but no address', async () => {
			const content = `---
name: Test Restaurant
location:
  - 34.0522
  - -118.2437
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
		});

		it('should use address field from settings when available', async () => {
			const content = `---
name: Test Restaurant
address: Pizza Hut Los Angeles
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
			expect(filesToProcess[0].source).toBe('address');
			expect(filesToProcess[0].searchQuery).toBe('Pizza Hut Los Angeles');
		});

		it('should fall back to filename when address field is empty', async () => {
			const content = `---
name: Test Restaurant
address:
---
# Content`;
			await mockVault.create('Places/Pizza Hut.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
			expect(filesToProcess[0].source).toBe('filename');
			expect(filesToProcess[0].searchQuery).toBe('Pizza Hut');
		});

		it('should not use filename fallback when setting is disabled', async () => {
			settings.batchUpdateUseFilenameAsFallback = false;
			batchUpdateService = new BatchUpdateService(
				mockApp as any,
				settings,
				mockGooglePlacesService,
				mockDataMapper
			);

			const content = `---
name: Test Restaurant
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(0);
		});

		it('should treat empty location array as invalid', async () => {
			const content = `---
name: Test Restaurant
address: 123 Main St
location: []
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
		});

		it('should treat location with empty strings as invalid', async () => {
			const content = `---
name: Test Restaurant
address: 123 Main St
location:
  - ""
  - ""
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
		});

		it('should treat location with non-numeric values as invalid', async () => {
			const content = `---
name: Test Restaurant
address: 123 Main St
location:
  - abc
  - xyz
---
# Content`;
			await mockVault.create('Places/Test.md', content);

			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);
		});
	});

	describe('parseFrontmatter', () => {
		it('should parse simple key-value pairs', async () => {
			const content = `---
name: Test
rating: 4.5
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];
			const fileContent = await mockVault.read(file);

			// Use type assertion to access private method for testing
			const parseFrontmatter = (batchUpdateService as any).parseFrontmatter.bind(batchUpdateService);
			const frontmatter = parseFrontmatter(fileContent);

			expect(frontmatter.name).toBe('Test');
			expect(frontmatter.rating).toBe('4.5');
		});

		it('should parse array values in list format', async () => {
			const content = `---
location:
  - 34.0522
  - -118.2437
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];
			const fileContent = await mockVault.read(file);

			const parseFrontmatter = (batchUpdateService as any).parseFrontmatter.bind(batchUpdateService);
			const frontmatter = parseFrontmatter(fileContent);

			expect(Array.isArray(frontmatter.location)).toBe(true);
			expect(frontmatter.location).toEqual(['34.0522', '-118.2437']);
		});

		it('should parse inline array format', async () => {
			const content = `---
cuisine: [Italian, Pizza]
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];
			const fileContent = await mockVault.read(file);

			const parseFrontmatter = (batchUpdateService as any).parseFrontmatter.bind(batchUpdateService);
			const frontmatter = parseFrontmatter(fileContent);

			expect(Array.isArray(frontmatter.cuisine)).toBe(true);
			expect(frontmatter.cuisine).toEqual(['Italian', 'Pizza']);
		});

		it('should return empty object when no frontmatter exists', async () => {
			const content = '# Just a heading\n\nSome content';
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];
			const fileContent = await mockVault.read(file);

			const parseFrontmatter = (batchUpdateService as any).parseFrontmatter.bind(batchUpdateService);
			const frontmatter = parseFrontmatter(fileContent);

			expect(frontmatter).toEqual({});
		});

		it('should handle empty values', async () => {
			const content = `---
name: Test
emptyField:
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];
			const fileContent = await mockVault.read(file);

			const parseFrontmatter = (batchUpdateService as any).parseFrontmatter.bind(batchUpdateService);
			const frontmatter = parseFrontmatter(fileContent);

			expect(frontmatter.name).toBe('Test');
			expect(Array.isArray(frontmatter.emptyField)).toBe(true);
			expect(frontmatter.emptyField).toEqual([]);
		});
	});

	describe('buildFrontmatter', () => {
		it('should build valid YAML frontmatter', async () => {
			const buildFrontmatter = (batchUpdateService as any).buildFrontmatter.bind(batchUpdateService);
			const yaml = buildFrontmatter({ name: 'Test', rating: 4.5 });

			expect(yaml).toContain('---');
			expect(yaml).toContain('name: Test');
			expect(yaml).toContain('rating: 4.5');
		});

		it('should format cuisine as inline array', async () => {
			const buildFrontmatter = (batchUpdateService as any).buildFrontmatter.bind(batchUpdateService);
			const yaml = buildFrontmatter({ cuisine: ['Italian', 'Pizza'] });

			expect(yaml).toContain('cuisine: [Italian, Pizza]');
		});

		it('should format location as YAML list', async () => {
			const buildFrontmatter = (batchUpdateService as any).buildFrontmatter.bind(batchUpdateService);
			const yaml = buildFrontmatter({ location: ['34.0522', '-118.2437'] });

			expect(yaml).toContain('location:');
			expect(yaml).toContain('  - 34.0522');
			expect(yaml).toContain('  - -118.2437');
		});

		it('should skip undefined and null values', async () => {
			const buildFrontmatter = (batchUpdateService as any).buildFrontmatter.bind(batchUpdateService);
			const yaml = buildFrontmatter({ name: 'Test', empty: undefined, nullValue: null });

			expect(yaml).toContain('name: Test');
			expect(yaml).not.toContain('empty');
			expect(yaml).not.toContain('nullValue');
		});

		it('should handle empty arrays', async () => {
			const buildFrontmatter = (batchUpdateService as any).buildFrontmatter.bind(batchUpdateService);
			const yaml = buildFrontmatter({ tags: [] });

			expect(yaml).toContain('tags:');
		});

		it('should JSON stringify object values', async () => {
			const buildFrontmatter = (batchUpdateService as any).buildFrontmatter.bind(batchUpdateService);
			const yaml = buildFrontmatter({ metadata: { foo: 'bar' } });

			expect(yaml).toContain('metadata: {"foo":"bar"}');
		});
	});

	describe('updateFile', () => {
		it('should add frontmatter to file without existing frontmatter', async () => {
			const content = '# Restaurant\n\nSome content';
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			await batchUpdateService.updateFile(file, {
				address: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 }
			});

			const updatedContent = mockVault.getFileContent('test.md');
			expect(updatedContent).toContain('---');
			expect(updatedContent).toContain('address: 123 Main St');
			expect(updatedContent).toContain('location:');
			expect(updatedContent).toContain('  - 34.0522');
			expect(updatedContent).toContain('  - -118.2437');
			expect(updatedContent).toContain('# Restaurant');
		});

		it('should update existing frontmatter without overwriting other fields', async () => {
			const content = `---
name: Test Restaurant
rating: 4.5
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			await batchUpdateService.updateFile(file, {
				address: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 }
			});

			const updatedContent = mockVault.getFileContent('test.md');
			expect(updatedContent).toContain('name: Test Restaurant');
			expect(updatedContent).toContain('rating: 4.5');
			expect(updatedContent).toContain('address: 123 Main St');
			expect(updatedContent).toContain('location:');
		});

		it('should not overwrite existing valid address', async () => {
			const content = `---
name: Test Restaurant
address: Original Address
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			await batchUpdateService.updateFile(file, {
				address: 'New Address',
				location: { latitude: 34.0522, longitude: -118.2437 }
			});

			const updatedContent = mockVault.getFileContent('test.md');
			expect(updatedContent).toContain('address: Original Address');
			expect(updatedContent).not.toContain('New Address');
		});

		it('should not overwrite existing valid location', async () => {
			const content = `---
name: Test Restaurant
location:
  - 40.7128
  - -74.0060
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			await batchUpdateService.updateFile(file, {
				address: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 }
			});

			const updatedContent = mockVault.getFileContent('test.md');
			expect(updatedContent).toContain('  - 40.7128');
			expect(updatedContent).toContain('  - -74.0060');
			expect(updatedContent).not.toContain('34.0522');
		});

		it('should update invalid location (empty strings)', async () => {
			const content = `---
name: Test Restaurant
location:
  - ""
  - ""
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			await batchUpdateService.updateFile(file, {
				address: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 }
			});

			const updatedContent = mockVault.getFileContent('test.md');
			expect(updatedContent).toContain('  - 34.0522');
			expect(updatedContent).toContain('  - -118.2437');
		});

		it('should preserve body content when updating frontmatter', async () => {
			const content = `---
name: Test
---
# My Restaurant

This is my favorite place!`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			await batchUpdateService.updateFile(file, {
				address: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 }
			});

			const updatedContent = mockVault.getFileContent('test.md');
			expect(updatedContent).toContain('# My Restaurant');
			expect(updatedContent).toContain('This is my favorite place!');
		});

		it('should not modify file if both address and location are already valid', async () => {
			const content = `---
name: Test Restaurant
address: 123 Main St
location:
  - 34.0522
  - -118.2437
---
# Content`;
			await mockVault.create('test.md', content);
			const file = mockVault.getMarkdownFiles()[0];

			const modifySpy = vi.spyOn(mockVault, 'modify');

			await batchUpdateService.updateFile(file, {
				address: 'New Address',
				location: { latitude: 40.7128, longitude: -74.0060 }
			});

			expect(modifySpy).not.toHaveBeenCalled();
		});
	});

	describe('cancellation', () => {
		it('should initially not be cancelled', () => {
			expect(batchUpdateService.isCancelled()).toBe(false);
		});

		it('should be cancelled after calling cancel()', () => {
			batchUpdateService.cancel();
			expect(batchUpdateService.isCancelled()).toBe(true);
		});

		it('should reset cancellation flag', () => {
			batchUpdateService.cancel();
			batchUpdateService.resetCancellation();
			expect(batchUpdateService.isCancelled()).toBe(false);
		});
	});

	describe('processBatch', () => {
		let mockSearchPlaces: any;
		let mockGetPlaceDetails: any;
		let mockOnProgress: any;
		let mockOnNeedSelection: any;

		beforeEach(() => {
			mockSearchPlaces = vi.spyOn(mockGooglePlacesService, 'searchPlaces');
			mockGetPlaceDetails = vi.spyOn(mockGooglePlacesService, 'getPlaceDetails');
			mockOnProgress = vi.fn();
			mockOnNeedSelection = vi.fn();
		});

		it('should process single file successfully', async () => {
			const content = `---
name: Pizza Hut
---
# Content`;
			await mockVault.create('Places/Pizza Hut.md', content);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const searchResult: PlaceSearchResult = {
				id: 'place-123',
				displayName: 'Pizza Hut',
				formattedAddress: '123 Main St'
			};

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '123 Main St, Los Angeles, CA',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL'
			};

			mockSearchPlaces.mockResolvedValue([searchResult]);
			mockGetPlaceDetails.mockResolvedValue(placeDetails);

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(result.filesUpdated).toBe(1);
			expect(result.filesSkipped).toBe(0);
			expect(result.filesErrored).toBe(0);
			expect(mockOnProgress).toHaveBeenCalledWith(1, 1, 'Pizza Hut');
		});

		it('should auto-select when only one result and setting enabled', async () => {
			const content = `---
name: Pizza Hut
---
# Content`;
			await mockVault.create('Places/Pizza Hut.md', content);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const searchResult: PlaceSearchResult = {
				id: 'place-123',
				displayName: 'Pizza Hut',
				formattedAddress: '123 Main St'
			};

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL'
			};

			mockSearchPlaces.mockResolvedValue([searchResult]);
			mockGetPlaceDetails.mockResolvedValue(placeDetails);

			await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(mockOnNeedSelection).not.toHaveBeenCalled();
		});

		it('should request user selection when multiple results', async () => {
			const content = `---
name: Pizza Hut
---
# Content`;
			await mockVault.create('Places/Pizza Hut.md', content);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const searchResults: PlaceSearchResult[] = [
				{ id: 'place-1', displayName: 'Pizza Hut #1', formattedAddress: '123 Main St' },
				{ id: 'place-2', displayName: 'Pizza Hut #2', formattedAddress: '456 Oak Ave' }
			];

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-1',
				displayName: { text: 'Pizza Hut #1' },
				formattedAddress: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL'
			};

			mockSearchPlaces.mockResolvedValue(searchResults);
			mockGetPlaceDetails.mockResolvedValue(placeDetails);
			mockOnNeedSelection.mockResolvedValue(searchResults[0]);

			await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(mockOnNeedSelection).toHaveBeenCalledWith(
				expect.objectContaining({ basename: 'Pizza Hut' }),
				searchResults
			);
		});

		it('should skip file when user cancels selection', async () => {
			const content = `---
name: Pizza Hut
---
# Content`;
			await mockVault.create('Places/Pizza Hut.md', content);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const searchResults: PlaceSearchResult[] = [
				{ id: 'place-1', displayName: 'Pizza Hut #1', formattedAddress: '123 Main St' },
				{ id: 'place-2', displayName: 'Pizza Hut #2', formattedAddress: '456 Oak Ave' }
			];

			mockSearchPlaces.mockResolvedValue(searchResults);
			mockOnNeedSelection.mockResolvedValue(null);

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(result.filesSkipped).toBe(1);
			expect(result.filesUpdated).toBe(0);
		});

		it('should skip file when no search results found', async () => {
			const content = `---
name: Nonexistent Place
---
# Content`;
			await mockVault.create('Places/Test.md', content);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			mockSearchPlaces.mockResolvedValue([]);

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(result.filesSkipped).toBe(1);
			expect(result.errorDetails).toHaveLength(1);
			expect(result.errorDetails[0].error).toBe('No results found');
		});

		it('should handle API errors gracefully', async () => {
			const content = `---
name: Pizza Hut
---
# Content`;
			await mockVault.create('Places/Pizza Hut.md', content);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			mockSearchPlaces.mockRejectedValue(new Error('API Error'));

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(result.filesErrored).toBe(1);
			expect(result.errorDetails).toHaveLength(1);
			expect(result.errorDetails[0].error).toBe('API Error');
		});

		it('should stop processing when cancelled', async () => {
			const content1 = `---
name: Restaurant 1
---
# Content`;
			const content2 = `---
name: Restaurant 2
---
# Content`;
			await mockVault.create('Places/Restaurant1.md', content1);
			await mockVault.create('Places/Restaurant2.md', content2);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			mockSearchPlaces.mockImplementation(() => {
				batchUpdateService.cancel();
				return Promise.resolve([]);
			});

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			// Should stop after first file is processed
			expect(mockSearchPlaces).toHaveBeenCalledTimes(1);
		});

		it('should reset cancellation flag at start of processBatch', async () => {
			batchUpdateService.cancel();
			expect(batchUpdateService.isCancelled()).toBe(true);

			await batchUpdateService.processBatch([], 0, mockOnProgress, mockOnNeedSelection);

			// Should be reset after processBatch is called (even with empty array)
			expect(batchUpdateService.isCancelled()).toBe(false);
		});

		it('should respect rate limiting between files', async () => {
			settings.batchUpdateRateLimit = 50;
			batchUpdateService = new BatchUpdateService(
				mockApp as any,
				settings,
				mockGooglePlacesService,
				mockDataMapper
			);

			const content1 = `---
name: Restaurant 1
---
# Content`;
			const content2 = `---
name: Restaurant 2
---
# Content`;
			await mockVault.create('Places/Restaurant1.md', content1);
			await mockVault.create('Places/Restaurant2.md', content2);
			const files = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const searchResult: PlaceSearchResult = {
				id: 'place-123',
				displayName: 'Test',
				formattedAddress: '123 Main St'
			};

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Test' },
				formattedAddress: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL'
			};

			mockSearchPlaces.mockResolvedValue([searchResult]);
			mockGetPlaceDetails.mockResolvedValue(placeDetails);
			mockSearchPlaces = vi.spyOn(mockGooglePlacesService, 'searchPlaces').mockResolvedValue([searchResult]);
			mockGetPlaceDetails = vi.spyOn(mockGooglePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			const startTime = Date.now();
			await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);
			const duration = Date.now() - startTime;

			// Should have waited at least 50ms between the two files
			expect(duration).toBeGreaterThanOrEqual(50);
		});

		it('should count total files including already-skipped files', async () => {
			// Create files: 2 need update, 1 already has data
			const content1 = `---
name: Restaurant 1
---
# Content`;
			const content2 = `---
name: Restaurant 2
address: 123 Main St
location:
  - 34.0522
  - -118.2437
---
# Content`;
			await mockVault.create('Places/Restaurant1.md', content1);
			await mockVault.create('Places/Restaurant2.md', content2);
			const allFiles = mockVault.getMarkdownFiles();
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(allFiles);

			expect(filesToProcess).toHaveLength(1);

			mockSearchPlaces.mockResolvedValue([]);

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				allFiles.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			expect(result.totalFiles).toBe(2);
			expect(result.filesSkipped).toBe(2); // 1 pre-filtered + 1 no results
		});
	});
});

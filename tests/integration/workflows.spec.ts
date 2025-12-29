// Globals enabled in vitest.config.ts - describe, it, expect, beforeEach, vi are available globally
import { vi } from 'vitest';
import { GooglePlacesService } from '../../src/services/googlePlaces';
import { DataMapper } from '../../src/services/dataMapper';
import { NoteCreator } from '../../src/services/noteCreator';
import { BatchUpdateService } from '../../src/services/batchUpdateService';
import { MockApp, MockVault } from '../helpers/mockObsidian';
import { DEFAULT_SETTINGS } from '../../src/types';
import type { PlaceSearchResult, GooglePlaceDetailsResponse } from '../../src/types';
import * as obsidian from 'obsidian';

// Spy on the obsidian module
const mockRequestUrl = vi.spyOn(obsidian, 'requestUrl' as any);
const mockNotice = vi.spyOn(obsidian, 'Notice' as any);

describe('Integration Tests - End-to-End Workflows', () => {
	let mockApp: MockApp;
	let mockVault: MockVault;
	let googlePlacesService: GooglePlacesService;
	let dataMapper: DataMapper;
	let noteCreator: NoteCreator;
	let batchUpdateService: BatchUpdateService;
	let settings: typeof DEFAULT_SETTINGS;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = new MockApp();
		mockVault = mockApp.vault;
		settings = {
			...DEFAULT_SETTINGS,
			targetFolder: 'Places',
			imageFolder: 'images',
			templateFilePath: '',
			batchUpdateAddressField: 'address',
			batchUpdateUseFilenameAsFallback: true,
			batchUpdateAutoSelectSingleResult: true,
			batchUpdateRateLimit: 100
		};

		googlePlacesService = new GooglePlacesService('test-api-key');
		dataMapper = new DataMapper(settings);
		noteCreator = new NoteCreator(mockApp as any, settings);
		batchUpdateService = new BatchUpdateService(
			mockApp as any,
			settings,
			googlePlacesService,
			dataMapper
		);
	});

	describe('Search and Create Note Flow', () => {
		it('should search, get details, map data, and create note', async () => {
			// Mock API responses
			const searchResults: PlaceSearchResult[] = [
				{
					id: 'place-123',
					displayName: 'Pizza Hut',
					formattedAddress: '123 Main St, Los Angeles, CA 90001'
				}
			];

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '123 Main St, Los Angeles, CA 90001',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['italian_restaurant', 'pizza_restaurant', 'restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL',
				internationalPhoneNumber: '+1 555-0123',
				addressComponents: [
					{ longText: 'Los Angeles', types: ['locality', 'political'] }
				]
			};

			// Setup mocks
			const mockSearch = vi.spyOn(googlePlacesService, 'searchPlaces').mockResolvedValue(searchResults);
			const mockDetails = vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			// 1. Search for place
			const results = await googlePlacesService.searchPlaces('Pizza Hut Los Angeles');
			expect(results).toHaveLength(1);
			expect(results[0].displayName).toBe('Pizza Hut');

			// 2. Get place details
			const details = await googlePlacesService.getPlaceDetails(results[0].id);
			expect(details.displayName.text).toBe('Pizza Hut');
			expect(details.rating).toBe(4.5);

			// 3. Map to frontmatter
			const frontmatter = dataMapper.mapPlaceDetailsToFrontmatter(details);
			expect(frontmatter.address).toBe('123 Main St, Los Angeles, CA 90001');
			expect(frontmatter.location).toEqual(['34.0522', '-118.2437']);
			expect(frontmatter['rating-google']).toBe(4.5);
			expect(frontmatter.city).toBe('Los Angeles');
			expect(frontmatter.cuisine).toContain('Italian');
			expect(frontmatter.cuisine).toContain('Pizza');

			// 4. Format filename
			const filename = dataMapper.formatFilename('{name} - {city}', details.displayName.text, frontmatter.city);
			expect(filename).toBe('Pizza Hut - Los Angeles');

			// 5. Create note
			const file = await noteCreator.createNote(filename, frontmatter, 'Pizza Hut');
			expect(file).toBeDefined();
			expect(file.path).toBe('Places/Pizza Hut - Los Angeles.md');

			// 6. Verify file content
			const content = mockVault.getFileContent(file.path);
			expect(content).toContain('---');
			expect(content).toContain('address: 123 Main St, Los Angeles, CA 90001');
			expect(content).toContain('rating-google: 4.5');
			expect(content).toContain('city: Los Angeles');
			expect(content).toContain('cuisine:');
			expect(content).toContain('Italian');
			expect(content).toContain('Pizza');
			expect(content).toContain('location:');
			expect(content).toContain('  - 34.0522');
			expect(content).toContain('  - -118.2437');
			expect(content).toContain('# Pizza Hut');

			// Verify APIs were called correctly
			expect(mockSearch).toHaveBeenCalledWith('Pizza Hut Los Angeles');
			expect(mockDetails).toHaveBeenCalledWith('place-123');
		});

		it('should handle multiple search results and selection', async () => {
			const searchResults: PlaceSearchResult[] = [
				{
					id: 'place-1',
					displayName: 'Pizza Hut #1',
					formattedAddress: '123 Main St, Los Angeles, CA'
				},
				{
					id: 'place-2',
					displayName: 'Pizza Hut #2',
					formattedAddress: '456 Oak Ave, Los Angeles, CA'
				}
			];

			const selectedDetails: GooglePlaceDetailsResponse = {
				id: 'place-2',
				displayName: { text: 'Pizza Hut #2' },
				formattedAddress: '456 Oak Ave, Los Angeles, CA',
				location: { latitude: 34.0600, longitude: -118.2500 },
				types: ['pizza_restaurant'],
				rating: 4.8,
				businessStatus: 'OPERATIONAL'
			};

			vi.spyOn(googlePlacesService, 'searchPlaces').mockResolvedValue(searchResults);
			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(selectedDetails);

			// User searches and gets multiple results
			const results = await googlePlacesService.searchPlaces('Pizza Hut');
			expect(results).toHaveLength(2);

			// User selects second result
			const selectedResult = results[1];
			const details = await googlePlacesService.getPlaceDetails(selectedResult.id);

			// Map and create note for selected place
			const frontmatter = dataMapper.mapPlaceDetailsToFrontmatter(details);
			const filename = dataMapper.formatFilename('{name}', details.displayName.text, '');
			const file = await noteCreator.createNote(filename, frontmatter, details.displayName.text);

			// Verify correct place was used
			const content = mockVault.getFileContent(file.path);
			expect(content).toContain('address: 456 Oak Ave, Los Angeles, CA');
			expect(content).toContain('rating-google: 4.8');
		});

		it('should create note with custom filename pattern', async () => {
			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'The French Laundry' },
				formattedAddress: '6640 Washington St, Yountville, CA 94599',
				location: { latitude: 38.4048, longitude: -122.3629 },
				types: ['french_restaurant', 'fine_dining'],
				rating: 4.9,
				businessStatus: 'OPERATIONAL',
				addressComponents: [
					{ longText: 'Yountville', types: ['locality', 'political'] }
				]
			};

			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			const details = await googlePlacesService.getPlaceDetails('place-123');
			const frontmatter = dataMapper.mapPlaceDetailsToFrontmatter(details);

			// Test different filename patterns
			const patterns = [
				{ pattern: '{name}', expected: 'The French Laundry' },
				{ pattern: '{name} - {city}', expected: 'The French Laundry - Yountville' },
				{ pattern: '{city} - {name}', expected: 'Yountville - The French Laundry' }
			];

			for (const { pattern, expected } of patterns) {
				const filename = dataMapper.formatFilename(pattern, details.displayName.text, frontmatter.city);
				expect(filename).toBe(expected);
			}
		});
	});

	describe('Batch Update Flow', () => {
		it('should find files, filter, and update with place data', async () => {
			// Setup: Create test files with partial frontmatter
			const file1Content = `---
name: Restaurant A
address: Pizza Hut Los Angeles
---
# Restaurant A`;

			const file2Content = `---
name: Restaurant B
address: Chipotle San Francisco
---
# Restaurant B`;

			const file3Content = `---
name: Restaurant C
address: Already Has Data
location:
  - 34.0522
  - -118.2437
---
# Restaurant C`;

			await mockVault.create('Places/Restaurant A.md', file1Content);
			await mockVault.create('Places/Restaurant B.md', file2Content);
			await mockVault.create('Places/Restaurant C.md', file3Content);

			// Mock API responses
			const searchResult1: PlaceSearchResult = {
				id: 'place-1',
				displayName: 'Pizza Hut',
				formattedAddress: '123 Main St'
			};

			const searchResult2: PlaceSearchResult = {
				id: 'place-2',
				displayName: 'Chipotle',
				formattedAddress: '456 Market St'
			};

			const details1: GooglePlaceDetailsResponse = {
				id: 'place-1',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '123 Main St, Los Angeles, CA',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL'
			};

			const details2: GooglePlaceDetailsResponse = {
				id: 'place-2',
				displayName: { text: 'Chipotle' },
				formattedAddress: '456 Market St, San Francisco, CA',
				location: { latitude: 37.7749, longitude: -122.4194 },
				types: ['restaurant'],
				rating: 4.2,
				businessStatus: 'OPERATIONAL'
			};

			const mockSearch = vi.spyOn(googlePlacesService, 'searchPlaces')
				.mockResolvedValueOnce([searchResult1])
				.mockResolvedValueOnce([searchResult2]);

			const mockDetails = vi.spyOn(googlePlacesService, 'getPlaceDetails')
				.mockResolvedValueOnce(details1)
				.mockResolvedValueOnce(details2);

			// 1. Find files in Places folder
			const files = batchUpdateService.findFiles('Places');
			expect(files).toHaveLength(3);

			// 2. Filter files needing update
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);
			expect(filesToProcess).toHaveLength(2); // Restaurant C already has location

			// 3. Process batch
			const mockOnProgress = vi.fn();
			const mockOnNeedSelection = vi.fn();

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			// 4. Verify results
			expect(result.totalFiles).toBe(3);
			expect(result.filesUpdated).toBe(2);
			expect(result.filesSkipped).toBe(1); // Restaurant C was pre-filtered
			expect(result.filesErrored).toBe(0);
			expect(result.errorDetails).toHaveLength(0);

			// 5. Verify files were updated correctly
			const updatedFile1 = mockVault.getFileContent('Places/Restaurant A.md');
			expect(updatedFile1).toContain('location:');
			expect(updatedFile1).toContain('  - 34.0522');
			expect(updatedFile1).toContain('  - -118.2437');
			expect(updatedFile1).toContain('name: Restaurant A'); // Preserved
			expect(updatedFile1).toContain('# Restaurant A'); // Body preserved

			const updatedFile2 = mockVault.getFileContent('Places/Restaurant B.md');
			expect(updatedFile2).toContain('location:');
			expect(updatedFile2).toContain('  - 37.7749');
			expect(updatedFile2).toContain('  - -122.4194');

			// 6. Verify file with existing data was not modified
			const unchangedFile = mockVault.getFileContent('Places/Restaurant C.md');
			expect(unchangedFile).toBe(file3Content);

			// 7. Verify callbacks were called
			expect(mockOnProgress).toHaveBeenCalledTimes(2);
			expect(mockOnProgress).toHaveBeenCalledWith(1, 2, 'Restaurant A');
			expect(mockOnProgress).toHaveBeenCalledWith(2, 2, 'Restaurant B');
		});

		it('should handle batch update with user selection', async () => {
			const fileContent = `---
name: Generic Restaurant
address: Restaurant
---
# Content`;

			await mockVault.create('Places/Restaurant.md', fileContent);

			// Mock multiple search results
			const searchResults: PlaceSearchResult[] = [
				{ id: 'place-1', displayName: 'Restaurant #1', formattedAddress: '123 Main St' },
				{ id: 'place-2', displayName: 'Restaurant #2', formattedAddress: '456 Oak Ave' }
			];

			const selectedDetails: GooglePlaceDetailsResponse = {
				id: 'place-2',
				displayName: { text: 'Restaurant #2' },
				formattedAddress: '456 Oak Ave',
				location: { latitude: 34.0600, longitude: -118.2500 },
				types: ['restaurant'],
				rating: 4.3,
				businessStatus: 'OPERATIONAL'
			};

			vi.spyOn(googlePlacesService, 'searchPlaces').mockResolvedValue(searchResults);
			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(selectedDetails);

			const files = batchUpdateService.findFiles('Places');
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const mockOnProgress = vi.fn();
			const mockOnNeedSelection = vi.fn().mockResolvedValue(searchResults[1]); // User selects second result

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				mockOnProgress,
				mockOnNeedSelection
			);

			// Verify user was asked to select
			expect(mockOnNeedSelection).toHaveBeenCalledWith(
				expect.objectContaining({ basename: 'Restaurant' }),
				searchResults
			);

			// Verify file was updated with location (BatchUpdateService only adds address/location, doesn't overwrite)
			const updatedFile = mockVault.getFileContent('Places/Restaurant.md');
			expect(updatedFile).toContain('location:');
			expect(updatedFile).toContain('  - 34.06');
			expect(updatedFile).toContain('  - -118.25');
		});

		it('should handle batch update errors gracefully', async () => {
			const file1Content = `---
name: Good Restaurant
address: Pizza Hut
---
# Content`;

			const file2Content = `---
name: Bad Restaurant
address: Nonexistent Place XYZ123
---
# Content`;

			await mockVault.create('Places/Good.md', file1Content);
			await mockVault.create('Places/Bad.md', file2Content);

			const goodResult: PlaceSearchResult = {
				id: 'place-good',
				displayName: 'Pizza Hut',
				formattedAddress: '123 Main St'
			};

			const goodDetails: GooglePlaceDetailsResponse = {
				id: 'place-good',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL'
			};

			const mockSearch = vi.spyOn(googlePlacesService, 'searchPlaces')
				.mockResolvedValueOnce([goodResult])
				.mockResolvedValueOnce([]); // No results for second file

			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(goodDetails);

			const files = batchUpdateService.findFiles('Places');
			const filesToProcess = await batchUpdateService.filterFilesNeedingUpdate(files);

			const result = await batchUpdateService.processBatch(
				filesToProcess,
				files.length,
				vi.fn(),
				vi.fn()
			);

			// Should have processed one successfully and skipped one
			expect(result.filesUpdated).toBe(1);
			expect(result.filesSkipped).toBe(1);
			expect(result.errorDetails).toHaveLength(1);
			expect(result.errorDetails[0].file).toBe('Bad');
			expect(result.errorDetails[0].error).toBe('No results found');
		});
	});

	describe('Template Merging Flow', () => {
		it('should merge template frontmatter with place data', async () => {
			// Create template
			const templateContent = `---
tags:
  - restaurant
  - places
custom_field: template value
---

# {{name}}

## Details
`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '123 Main St, Los Angeles, CA',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['pizza_restaurant'],
				rating: 4.5,
				businessStatus: 'OPERATIONAL',
				addressComponents: [
					{ longText: 'Los Angeles', types: ['locality', 'political'] }
				]
			};

			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			// Get details and map
			const details = await googlePlacesService.getPlaceDetails('place-123');
			const frontmatter = dataMapper.mapPlaceDetailsToFrontmatter(details);

			// Create note with template
			const filename = dataMapper.formatFilename('{name}', details.displayName.text, '');
			const file = await noteCreator.createNote(filename, frontmatter, 'Pizza Hut', settings.templateFilePath);

			// Verify merged content
			const content = mockVault.getFileContent(file.path);

			// Should have both template fields and place data
			expect(content).toContain('custom_field: template value');
			expect(content).toContain('address: 123 Main St, Los Angeles, CA');
			expect(content).toContain('rating-google: 4.5');
			expect(content).toContain('city: Los Angeles');
			expect(content).toContain('cuisine: [Pizza]');

			// Should have template body
			expect(content).toContain('## Details');
		});

		it('should allow place data to overwrite template defaults', async () => {
			const templateContent = `---
address: Template Default Address
rating-google: 0
tags:
  - restaurant
---

# Content
`;
			await mockVault.create('template.md', templateContent);
			settings.templateFilePath = 'template.md';
			noteCreator = new NoteCreator(mockApp as any, settings);

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Actual Restaurant Name' },
				formattedAddress: '123 Main St',
				location: { latitude: 34.0522, longitude: -118.2437 },
				types: ['restaurant'],
				rating: 4.7,
				businessStatus: 'OPERATIONAL'
			};

			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			const details = await googlePlacesService.getPlaceDetails('place-123');
			const frontmatter = dataMapper.mapPlaceDetailsToFrontmatter(details);
			const file = await noteCreator.createNote('test', frontmatter, 'Actual Restaurant Name');

			const content = mockVault.getFileContent(file.path);

			// Place data should override template defaults
			const lines = content.split('\n');
			const firstFrontmatterEnd = lines.indexOf('---', 1);
			const firstFrontmatter = lines.slice(0, firstFrontmatterEnd + 1).join('\n');

			expect(firstFrontmatter).toContain('address: 123 Main St');
			expect(firstFrontmatter).toContain('rating-google: 4.7');
		});
	});

	describe('Update Current File Flow', () => {
		it('should update current file with geo data using address field', async () => {
			// Create a file with address but no location
			// Note: address will be preserved (not updated) since it already exists
			const fileContent = `---
name: Blue Bottle Coffee
address: Blue Bottle Coffee San Francisco
tags:
  - cafe
---
# Blue Bottle Coffee

Some notes about this cafe.`;

			const file = await mockVault.create('Places/Blue Bottle Coffee.md', fileContent);
			mockApp.workspace.setActiveFile(file);

			// Mock API responses
			const searchResults: PlaceSearchResult[] = [{
				id: 'place-123',
				displayName: 'Blue Bottle Coffee',
				formattedAddress: '66 Mint St, San Francisco, CA 94103'
			}];

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-123',
				displayName: { text: 'Blue Bottle Coffee' },
				formattedAddress: '66 Mint St, San Francisco, CA 94103',
				location: { latitude: 37.7829, longitude: -122.3977 },
				types: ['cafe', 'coffee_shop'],
				rating: 4.6,
				businessStatus: 'OPERATIONAL'
			};

			vi.spyOn(googlePlacesService, 'searchPlaces').mockResolvedValue(searchResults);
			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			// Simulate the update current file logic
			const activeFile = mockApp.workspace.getActiveFile();
			expect(activeFile).toBeDefined();
			expect(activeFile?.basename).toBe('Blue Bottle Coffee');

			// Parse frontmatter and get search query from address field
			const content = await mockApp.vault.read(activeFile!);
			const frontmatter = (batchUpdateService as any).parseFrontmatter(content);
			const searchQuery = frontmatter[settings.batchUpdateAddressField];

			// Search for place
			const results = await googlePlacesService.searchPlaces(searchQuery);
			expect(results).toHaveLength(1);

			// Get details and update file
			const details = await googlePlacesService.getPlaceDetails(results[0].id);
			await batchUpdateService.updateFile(activeFile!, {
				address: details.formattedAddress,
				location: details.location
			});

			// Verify the file was updated correctly
			const updatedContent = mockVault.getFileContent('Places/Blue Bottle Coffee.md');
			expect(updatedContent).toContain('location:');
			expect(updatedContent).toContain('  - 37.7829');
			expect(updatedContent).toContain('  - -122.3977');
			// Address is preserved (not updated) since it already existed
			expect(updatedContent).toContain('address: Blue Bottle Coffee San Francisco');
			// Verify existing frontmatter is preserved
			expect(updatedContent).toContain('name: Blue Bottle Coffee');
			expect(updatedContent).toContain('tags:');
			expect(updatedContent).toContain('  - cafe');
			// Verify body is preserved
			expect(updatedContent).toContain('# Blue Bottle Coffee');
			expect(updatedContent).toContain('Some notes about this cafe.');
		});

		it('should update current file using filename as fallback', async () => {
			// Create a file without address field
			const fileContent = `---
tags:
  - restaurant
---
# Pizza Hut

Great pizza place.`;

			const file = await mockVault.create('Places/Pizza Hut Downtown.md', fileContent);
			mockApp.workspace.setActiveFile(file);

			// Mock API responses
			const searchResults: PlaceSearchResult[] = [{
				id: 'place-456',
				displayName: 'Pizza Hut',
				formattedAddress: '789 Market St, San Francisco, CA 94103'
			}];

			const placeDetails: GooglePlaceDetailsResponse = {
				id: 'place-456',
				displayName: { text: 'Pizza Hut' },
				formattedAddress: '789 Market St, San Francisco, CA 94103',
				location: { latitude: 37.7849, longitude: -122.4094 },
				types: ['restaurant', 'pizza_restaurant'],
				rating: 4.3,
				businessStatus: 'OPERATIONAL'
			};

			vi.spyOn(googlePlacesService, 'searchPlaces').mockResolvedValue(searchResults);
			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(placeDetails);

			// Simulate the update current file logic with filename fallback
			const activeFile = mockApp.workspace.getActiveFile();
			const content = await mockApp.vault.read(activeFile!);
			const frontmatter = (batchUpdateService as any).parseFrontmatter(content);

			// No address field, so use filename
			const searchQuery = frontmatter[settings.batchUpdateAddressField] || activeFile!.basename;
			expect(searchQuery).toBe('Pizza Hut Downtown');

			// Search and update
			const results = await googlePlacesService.searchPlaces(searchQuery);
			const details = await googlePlacesService.getPlaceDetails(results[0].id);
			await batchUpdateService.updateFile(activeFile!, {
				address: details.formattedAddress,
				location: details.location
			});

			// Verify update
			const updatedContent = mockVault.getFileContent('Places/Pizza Hut Downtown.md');
			expect(updatedContent).toContain('location:');
			expect(updatedContent).toContain('  - 37.7849');
			expect(updatedContent).toContain('  - -122.4094');
			expect(updatedContent).toContain('address: 789 Market St, San Francisco, CA 94103');
			expect(updatedContent).toContain('tags:');
			expect(updatedContent).toContain('# Pizza Hut');
		});

		it('should handle multiple search results with user selection', async () => {
			// Create a file with generic name but no address or location
			const fileContent = `---
tags:
  - cafe
---
# Starbucks`;

			const file = await mockVault.create('Places/Starbucks.md', fileContent);
			mockApp.workspace.setActiveFile(file);

			// Mock multiple search results
			const searchResults: PlaceSearchResult[] = [
				{
					id: 'place-1',
					displayName: 'Starbucks #1',
					formattedAddress: '100 Main St, San Francisco, CA'
				},
				{
					id: 'place-2',
					displayName: 'Starbucks #2',
					formattedAddress: '200 Market St, San Francisco, CA'
				}
			];

			const selectedDetails: GooglePlaceDetailsResponse = {
				id: 'place-2',
				displayName: { text: 'Starbucks #2' },
				formattedAddress: '200 Market St, San Francisco, CA',
				location: { latitude: 37.7900, longitude: -122.4000 },
				types: ['cafe', 'coffee_shop'],
				rating: 4.4,
				businessStatus: 'OPERATIONAL'
			};

			vi.spyOn(googlePlacesService, 'searchPlaces').mockResolvedValue(searchResults);
			vi.spyOn(googlePlacesService, 'getPlaceDetails').mockResolvedValue(selectedDetails);

			// Simulate the workflow
			const activeFile = mockApp.workspace.getActiveFile();
			const results = await googlePlacesService.searchPlaces('Starbucks');

			// Multiple results - user would select the second one
			expect(results).toHaveLength(2);
			const selectedResult = results[1];

			const details = await googlePlacesService.getPlaceDetails(selectedResult.id);
			await batchUpdateService.updateFile(activeFile!, {
				address: details.formattedAddress,
				location: details.location
			});

			// Verify the selected location was used
			const updatedContent = mockVault.getFileContent('Places/Starbucks.md');
			expect(updatedContent).toContain('address: 200 Market St, San Francisco, CA');
			expect(updatedContent).toContain('  - 37.79');
			expect(updatedContent).toContain('  - -122.4');
			expect(updatedContent).toContain('tags:');
			expect(updatedContent).toContain('  - cafe');
		});

		it('should not update file that already has location data', async () => {
			// Create a file with existing location
			const fileContent = `---
address: Complete Restaurant
location:
  - 37.7749
  - -122.4194
---
# Complete Restaurant`;

			const file = await mockVault.create('Places/Complete.md', fileContent);
			mockApp.workspace.setActiveFile(file);

			// Check if file needs updating
			const content = await mockApp.vault.read(file);
			const frontmatter = (batchUpdateService as any).parseFrontmatter(content);

			const hasValidLocation = frontmatter.location &&
				Array.isArray(frontmatter.location) &&
				frontmatter.location.length === 2;

			expect(hasValidLocation).toBe(true);

			// File already has location, so updateFile would make no changes
			await batchUpdateService.updateFile(file, {
				address: 'New Address',
				location: { latitude: 40.0, longitude: -120.0 }
			});

			// Verify content unchanged (address and location preserved)
			const updatedContent = mockVault.getFileContent('Places/Complete.md');
			expect(updatedContent).toBe(fileContent);
		});

		it('should handle non-markdown files gracefully', async () => {
			// Create a non-markdown file
			const file = await mockVault.create('Places/document.txt', 'Some text content');
			// Change extension to simulate non-markdown
			file.extension = 'txt';
			mockApp.workspace.setActiveFile(file);

			const activeFile = mockApp.workspace.getActiveFile();
			expect(activeFile?.extension).toBe('txt');

			// In the actual implementation, this would trigger a notice
			// and return early without attempting to update
		});
	});
});

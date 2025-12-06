import { App, TFile, Notice } from 'obsidian';
import { GooglePlacesPluginSettings, NoteFrontmatter, PlaceSearchResult } from '../types';
import { GooglePlacesService } from './googlePlaces';
import { DataMapper } from './dataMapper';

export interface BatchUpdateResult {
	totalFiles: number;
	filesUpdated: number;
	filesSkipped: number;
	filesErrored: number;
	errorDetails: Array<{ file: string; error: string }>;
}

export interface FileToProcess {
	file: TFile;
	searchQuery: string;
	source: 'address' | 'filename';
}

export class BatchUpdateService {
	private app: App;
	private settings: GooglePlacesPluginSettings;
	private googlePlacesService: GooglePlacesService;
	private dataMapper: DataMapper;
	private cancelled: boolean = false;

	constructor(
		app: App,
		settings: GooglePlacesPluginSettings,
		googlePlacesService: GooglePlacesService,
		dataMapper: DataMapper
	) {
		this.app = app;
		this.settings = settings;
		this.googlePlacesService = googlePlacesService;
		this.dataMapper = dataMapper;
	}

	/**
	 * Find files based on a simple search query (folder path)
	 */
	findFiles(searchQuery: string): TFile[] {
		const allFiles = this.app.vault.getMarkdownFiles();

		if (!searchQuery || searchQuery.trim() === '') {
			return allFiles;
		}

		// Simple folder path filtering
		const normalizedQuery = searchQuery.trim().toLowerCase();
		return allFiles.filter(file => {
			const filePath = file.path.toLowerCase();
			return filePath.includes(normalizedQuery);
		});
	}

	/**
	 * Filter files to only those that need updating
	 * (files without existing address and location)
	 */
	async filterFilesNeedingUpdate(files: TFile[]): Promise<FileToProcess[]> {
		const filesToProcess: FileToProcess[] = [];

		for (const file of files) {
			const content = await this.app.vault.read(file);
			const frontmatter = this.parseFrontmatter(content);

			// Skip if file already has both address and location
			const hasAddress = frontmatter.address &&
				typeof frontmatter.address === 'string' &&
				frontmatter.address.trim() !== '';

			// Check if location exists and has valid latitude/longitude
			const hasLocation = frontmatter.location &&
				Array.isArray(frontmatter.location) &&
				frontmatter.location.length === 2 &&
				frontmatter.location[0] !== '' &&
				frontmatter.location[1] !== '' &&
				!isNaN(Number(frontmatter.location[0])) &&
				!isNaN(Number(frontmatter.location[1]));

			if (hasAddress && hasLocation) {
				continue;
			}

			// Try to get address from frontmatter
			const addressField = this.settings.batchUpdateAddressField;
			const address = frontmatter[addressField] as string | undefined;

			if (address && typeof address === 'string' && address.trim() !== '') {
				filesToProcess.push({
					file,
					searchQuery: address,
					source: 'address'
				});
			} else if (this.settings.batchUpdateUseFilenameAsFallback) {
				// Use filename as fallback
				const filename = file.basename; // Gets filename without .md extension
				filesToProcess.push({
					file,
					searchQuery: filename,
					source: 'filename'
				});
			}
		}

		return filesToProcess;
	}

	/**
	 * Parse frontmatter from file content
	 */
	private parseFrontmatter(content: string): NoteFrontmatter {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return {};
		}

		const frontmatterText = match[1];
		const frontmatter: NoteFrontmatter = {};
		const lines = frontmatterText.split('\n');
		let currentKey = '';
		let inArray = false;

		for (const line of lines) {
			const trimmedLine = line.trim();

			if (!trimmedLine) continue;

			// Handle array items
			if (trimmedLine.startsWith('- ')) {
				if (inArray && currentKey) {
					if (!Array.isArray(frontmatter[currentKey])) {
						frontmatter[currentKey] = [];
					}
					(frontmatter[currentKey] as string[]).push(trimmedLine.substring(2));
				}
				continue;
			}

			// Handle key-value pairs
			const colonIndex = trimmedLine.indexOf(':');
			if (colonIndex > 0) {
				currentKey = trimmedLine.substring(0, colonIndex).trim();
				const value = trimmedLine.substring(colonIndex + 1).trim();

				if (value === '') {
					inArray = true;
					frontmatter[currentKey] = [];
				} else {
					inArray = false;
					// Handle inline arrays [item1, item2]
					if (value.startsWith('[') && value.endsWith(']')) {
						const items = value.slice(1, -1).split(',').map(item => item.trim());
						frontmatter[currentKey] = items;
					} else {
						frontmatter[currentKey] = value;
					}
				}
			}
		}

		return frontmatter;
	}

	/**
	 * Update a single file with place data
	 */
	async updateFile(
		file: TFile,
		placeDetails: { address: string; location: { latitude: number; longitude: number } }
	): Promise<void> {
		const content = await this.app.vault.read(file);
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

		if (!frontmatterMatch) {
			// No frontmatter exists, create new one
			const newFrontmatter = this.buildFrontmatter({
				address: placeDetails.address,
				location: [String(placeDetails.location.latitude), String(placeDetails.location.longitude)]
			});
			const newContent = `${newFrontmatter}\n${content}`;
			await this.app.vault.modify(file, newContent);
			return;
		}

		// Parse existing frontmatter
		const existingFrontmatter = this.parseFrontmatter(content);

		// Check if address and location already have valid values
		const hasValidAddress = existingFrontmatter.address &&
			typeof existingFrontmatter.address === 'string' &&
			existingFrontmatter.address.trim() !== '';

		const hasValidLocation = existingFrontmatter.location &&
			Array.isArray(existingFrontmatter.location) &&
			existingFrontmatter.location.length === 2 &&
			existingFrontmatter.location[0] !== '' &&
			existingFrontmatter.location[1] !== '' &&
			!isNaN(Number(existingFrontmatter.location[0])) &&
			!isNaN(Number(existingFrontmatter.location[1]));

		// Track if we made any changes
		let madeChanges = false;

		// Add address and location (only if they don't have valid values)
		if (!hasValidAddress) {
			existingFrontmatter.address = placeDetails.address;
			madeChanges = true;
		}
		if (!hasValidLocation) {
			existingFrontmatter.location = [
				String(placeDetails.location.latitude),
				String(placeDetails.location.longitude)
			];
			madeChanges = true;
		}

		// Only modify the file if we actually changed something
		if (!madeChanges) {
			return;
		}

		// Rebuild frontmatter
		const newFrontmatter = this.buildFrontmatter(existingFrontmatter);
		const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
		const newContent = `${newFrontmatter}\n${bodyContent}`;

		await this.app.vault.modify(file, newContent);
	}

	/**
	 * Build frontmatter string from object
	 */
	private buildFrontmatter(frontmatter: NoteFrontmatter): string {
		const lines = ['---'];

		for (const [key, value] of Object.entries(frontmatter)) {
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				if (value.length > 0) {
					if (key === 'cuisine') {
						lines.push(`cuisine: [${value.join(', ')}]`);
					} else {
						lines.push(`${key}:`);
						for (const item of value) {
							lines.push(`  - ${item}`);
						}
					}
				} else {
					lines.push(`${key}:`);
				}
			} else if (typeof value === 'object') {
				lines.push(`${key}: ${JSON.stringify(value)}`);
			} else {
				lines.push(`${key}: ${value}`);
			}
		}

		lines.push('---');
		return lines.join('\n');
	}

	/**
	 * Cancel the batch update process
	 */
	cancel(): void {
		this.cancelled = true;
	}

	/**
	 * Check if batch update has been cancelled
	 */
	isCancelled(): boolean {
		return this.cancelled;
	}

	/**
	 * Reset cancellation flag
	 */
	resetCancellation(): void {
		this.cancelled = false;
	}

	/**
	 * Sleep for specified milliseconds (for rate limiting)
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Process a batch of files
	 */
	async processBatch(
		filesToProcess: FileToProcess[],
		totalMatchingFiles: number,
		onProgress: (current: number, total: number, currentFile: string) => void,
		onNeedSelection: (file: TFile, results: PlaceSearchResult[]) => Promise<PlaceSearchResult | null>
	): Promise<BatchUpdateResult> {
		const result: BatchUpdateResult = {
			totalFiles: totalMatchingFiles,
			filesUpdated: 0,
			filesSkipped: totalMatchingFiles - filesToProcess.length,
			filesErrored: 0,
			errorDetails: []
		};

		this.resetCancellation();

		for (let i = 0; i < filesToProcess.length; i++) {
			if (this.isCancelled()) {
				new Notice('Batch update cancelled');
				break;
			}

			const fileToProcess = filesToProcess[i];
			onProgress(i + 1, filesToProcess.length, fileToProcess.file.basename);

			try {
				// Search for place
				const searchResults = await this.googlePlacesService.searchPlaces(fileToProcess.searchQuery);

				if (searchResults.length === 0) {
					result.filesSkipped++;
					result.errorDetails.push({
						file: fileToProcess.file.basename,
						error: 'No results found'
					});
					continue;
				}

				let selectedPlace: PlaceSearchResult | null = null;

				// Auto-select if only one result and setting is enabled
				if (searchResults.length === 1 && this.settings.batchUpdateAutoSelectSingleResult) {
					selectedPlace = searchResults[0];
				} else {
					// Need user selection
					selectedPlace = await onNeedSelection(fileToProcess.file, searchResults);
				}

				if (!selectedPlace) {
					result.filesSkipped++;
					continue;
				}

				// Get place details
				const placeDetails = await this.googlePlacesService.getPlaceDetails(selectedPlace.id);

				// Update file
				await this.updateFile(fileToProcess.file, {
					address: placeDetails.formattedAddress,
					location: placeDetails.location
				});

				result.filesUpdated++;

				// Rate limiting
				if (i < filesToProcess.length - 1) {
					await this.sleep(this.settings.batchUpdateRateLimit);
				}

			} catch (error) {
				result.filesErrored++;
				result.errorDetails.push({
					file: fileToProcess.file.basename,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		}

		return result;
	}
}

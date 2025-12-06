import { App, Modal, Notice, Setting, TFile, requestUrl } from 'obsidian';
import { GooglePlacesPluginSettings, PlaceSearchResult } from './types';
import { BatchUpdateService, FileToProcess } from './services/batchUpdateService';
import { GooglePlacesService } from './services/googlePlaces';
import { DataMapper } from './services/dataMapper';
import { PlaceSelectionModal } from './placeSelectionModal';

export class BatchUpdateModal extends Modal {
	private settings: GooglePlacesPluginSettings;
	private batchUpdateService: BatchUpdateService;
	private googlePlacesService: GooglePlacesService;
	private searchInput: HTMLInputElement | null = null;
	private startButton: HTMLButtonElement | null = null;
	private cancelButton: HTMLButtonElement | null = null;
	private progressContainer: HTMLElement | null = null;
	private resultsContainer: HTMLElement | null = null;
	private isProcessing: boolean = false;

	constructor(
		app: App,
		settings: GooglePlacesPluginSettings,
		googlePlacesService: GooglePlacesService,
		dataMapper: DataMapper
	) {
		super(app);
		this.settings = settings;
		this.googlePlacesService = googlePlacesService;
		this.batchUpdateService = new BatchUpdateService(
			app,
			settings,
			googlePlacesService,
			dataMapper
		);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Batch update places' });

		contentEl.createEl('p', {
			text: 'Add address and location data to multiple files at once.',
			cls: 'batch-update-description'
		});

		// Search query input
		new Setting(contentEl)
			.setName('Search query')
			.setDesc('Enter folder path to filter files (e.g., "Restaurants/" or leave empty for all files)')
			.addText(text => {
				this.searchInput = text.inputEl;
				text.setPlaceholder('Restaurants/');
				text.inputEl.addEventListener('keypress', (e) => {
					if (e.key === 'Enter' && !this.isProcessing) {
						void this.startBatchUpdate();
					}
				});
			});

		// Button container
		const buttonContainer = contentEl.createDiv({ cls: 'batch-update-buttons' });

		this.startButton = buttonContainer.createEl('button', {
			text: 'Start batch update',
			cls: 'mod-cta'
		});
		this.startButton.addEventListener('click', () => {
			void this.startBatchUpdate();
		});

		this.cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
			cls: 'mod-warning'
		});
		this.cancelButton.style.display = 'none';
		this.cancelButton.addEventListener('click', () => {
			this.cancelBatchUpdate();
		});

		// Progress container
		this.progressContainer = contentEl.createDiv({ cls: 'batch-update-progress' });
		this.progressContainer.style.display = 'none';

		// Results container
		this.resultsContainer = contentEl.createDiv({ cls: 'batch-update-results' });
	}

	private async validateApiKey(): Promise<boolean> {
		const apiKey = this.settings.apiKey;

		if (!apiKey || apiKey.trim() === '') {
			new Notice('Please configure your API key in settings first');
			return false;
		}

		try {
			const response = await requestUrl({
				url: 'https://places.googleapis.com/v1/places:searchText',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': apiKey,
					'X-Goog-FieldMask': 'places.id'
				},
				body: JSON.stringify({
					textQuery: 'restaurant'
				})
			});

			if (response.status === 200) {
				return true;
			} else if (response.status === 403) {
				new Notice('Invalid API key. Please check your settings.');
				return false;
			} else if (response.status === 400) {
				new Notice('API key may be valid but Google Places API is not enabled. Check your Google Cloud Console.');
				return false;
			} else {
				new Notice(`API validation failed with status ${response.status}`);
				return false;
			}
		} catch {
			new Notice('Network error while validating API key. Check your connection.');
			return false;
		}
	}

	private async startBatchUpdate() {
		if (this.isProcessing) return;

		// Validate API key first
		const isValid = await this.validateApiKey();
		if (!isValid) return;

		const searchQuery = this.searchInput?.value || '';

		// Find files
		const allFiles = this.batchUpdateService.findFiles(searchQuery);

		if (allFiles.length === 0) {
			new Notice('No files found matching your search query');
			return;
		}

		// Filter files that need updating
		const filesToProcess = await this.batchUpdateService.filterFilesNeedingUpdate(allFiles);

		if (filesToProcess.length === 0) {
			new Notice('No files need updating. All matching files already have address and location data.');
			this.showResults({
				totalFiles: allFiles.length,
				filesUpdated: 0,
				filesSkipped: allFiles.length,
				filesErrored: 0,
				errorDetails: []
			});
			return;
		}

		// Confirm with user
		const confirmMessage = `Found ${filesToProcess.length} file(s) that need updating out of ${allFiles.length} total. Continue?`;
		// Since Obsidian doesn't have a built-in confirm dialog, we'll just start
		new Notice(confirmMessage);

		// Start processing
		this.isProcessing = true;
		this.updateUIForProcessing(true);

		try {
			const result = await this.batchUpdateService.processBatch(
				filesToProcess,
				allFiles.length,
				(current, total, currentFile) => {
					this.updateProgress(current, total, currentFile);
				},
				async (file, results) => {
					return await this.promptForPlaceSelection(file, results);
				}
			);

			this.showResults(result);
			new Notice(`Batch update complete! Updated ${result.filesUpdated} file(s).`);
		} catch (error) {
			new Notice('Error during batch update. Check console for details.');
			console.error('Batch update error:', error);
		} finally {
			this.isProcessing = false;
			this.updateUIForProcessing(false);
		}
	}

	private cancelBatchUpdate() {
		this.batchUpdateService.cancel();
		new Notice('Cancelling batch update...');
	}

	private updateUIForProcessing(processing: boolean) {
		if (this.startButton) {
			this.startButton.style.display = processing ? 'none' : 'inline-block';
		}
		if (this.cancelButton) {
			this.cancelButton.style.display = processing ? 'inline-block' : 'none';
		}
		if (this.progressContainer) {
			this.progressContainer.style.display = processing ? 'block' : 'none';
		}
		if (this.searchInput) {
			this.searchInput.disabled = processing;
		}
	}

	private updateProgress(current: number, total: number, currentFile: string) {
		if (!this.progressContainer) return;

		this.progressContainer.empty();
		this.progressContainer.createEl('p', {
			text: `Processing ${current} of ${total} files...`,
			cls: 'batch-update-progress-counter'
		});
		this.progressContainer.createEl('p', {
			text: `Current: ${currentFile}`,
			cls: 'batch-update-current-file'
		});

		// Progress bar
		const progressBarContainer = this.progressContainer.createDiv({ cls: 'batch-update-progress-bar' });
		const progressBar = progressBarContainer.createDiv({ cls: 'batch-update-progress-fill' });
		const percentage = (current / total) * 100;
		progressBar.style.width = `${percentage}%`;
	}

	private async promptForPlaceSelection(
		file: TFile,
		results: PlaceSearchResult[]
	): Promise<PlaceSearchResult | null> {
		return new Promise((resolve) => {
			const selectionModal = new PlaceSelectionModal(
				this.app,
				file,
				results,
				(selectedPlace) => {
					resolve(selectedPlace);
				}
			);
			selectionModal.open();
		});
	}

	private showResults(result: {
		totalFiles: number;
		filesUpdated: number;
		filesSkipped: number;
		filesErrored: number;
		errorDetails: Array<{ file: string; error: string }>;
	}) {
		if (!this.resultsContainer) return;

		this.resultsContainer.empty();
		this.resultsContainer.createEl('h3', { text: 'Batch Update Results' });

		const summaryContainer = this.resultsContainer.createDiv({ cls: 'batch-update-summary' });

		summaryContainer.createEl('p', {
			text: `Total files in batch: ${result.totalFiles}`,
			cls: 'batch-update-stat'
		});
		summaryContainer.createEl('p', {
			text: `Files updated: ${result.filesUpdated}`,
			cls: 'batch-update-stat batch-update-stat-success'
		});
		summaryContainer.createEl('p', {
			text: `Files skipped: ${result.filesSkipped}`,
			cls: 'batch-update-stat'
		});
		summaryContainer.createEl('p', {
			text: `Files with errors: ${result.filesErrored}`,
			cls: 'batch-update-stat batch-update-stat-error'
		});

		// Show error details if any
		if (result.errorDetails.length > 0) {
			this.resultsContainer.createEl('h4', { text: 'Error Details' });
			const errorList = this.resultsContainer.createEl('ul', { cls: 'batch-update-error-list' });

			for (const error of result.errorDetails) {
				const errorItem = errorList.createEl('li');
				errorItem.createEl('strong', { text: error.file });
				errorItem.createEl('span', { text: `: ${error.error}` });
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();

		// Cancel any ongoing processing
		if (this.isProcessing) {
			this.batchUpdateService.cancel();
		}
	}
}

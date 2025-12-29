import { Plugin, Editor, Notice, TFile } from 'obsidian';
import { GooglePlacesPluginSettings, DEFAULT_SETTINGS, PlaceSearchResult } from './types';
import { GooglePlacesSettingTab } from './settings';
import { PlaceSearchModal } from './modal';
import { BatchUpdateModal } from './batchUpdateModal';
import { PlaceSelectionModal } from './placeSelectionModal';
import { GooglePlacesService } from './services/googlePlaces';
import { DataMapper } from './services/dataMapper';
import { NoteCreator } from './services/noteCreator';
import { BatchUpdateService } from './services/batchUpdateService';

export default class GooglePlacesPlugin extends Plugin {
	settings: GooglePlacesPluginSettings;
	private googlePlacesService: GooglePlacesService;
	private dataMapper: DataMapper;
	private noteCreator: NoteCreator;
	private registeredCommandIds: Set<string> = new Set();

	async onload() {
		await this.loadSettings();

		this.initializeServices();

		this.registerCommands();

		this.registerSettingsTab();

		console.debug('Google Places Plugin loaded');
	}

	private initializeServices() {
		this.googlePlacesService = new GooglePlacesService(this.settings.apiKey);
		this.dataMapper = new DataMapper(this.settings);
		this.noteCreator = new NoteCreator(this.app, this.settings);
	}

	private registerCommands() {
		// Base command - uses last-used or first template
		const baseCommandId = 'search-google-places';
		if (!this.registeredCommandIds.has(baseCommandId)) {
			this.addCommand({
				id: baseCommandId,
				name: 'Search Google Places',
				callback: () => {
					this.openSearchModal(false);
				}
			});
			this.registeredCommandIds.add(baseCommandId);
		}

		// Base insert link command
		const baseLinkCommandId = 'search-google-places-insert-link';
		if (!this.registeredCommandIds.has(baseLinkCommandId)) {
			this.addCommand({
				id: baseLinkCommandId,
				name: 'Search and insert link',
				editorCallback: (editor) => {
					this.openSearchModal(true, editor);
				}
			});
			this.registeredCommandIds.add(baseLinkCommandId);
		}

		// Dynamic commands for each template
		this.settings.templates.forEach((template, index) => {
			// Search command for this template
			const searchCommandId = `search-google-places-${this.templateToCommandId(template.name)}`;
			if (!this.registeredCommandIds.has(searchCommandId)) {
				this.addCommand({
					id: searchCommandId,
					name: `Search Google Places - ${template.name}`,
					callback: () => {
						this.openSearchModal(false, undefined, index);
					}
				});
				this.registeredCommandIds.add(searchCommandId);
			}

			// Insert link command for this template
			const linkCommandId = `search-google-places-insert-link-${this.templateToCommandId(template.name)}`;
			if (!this.registeredCommandIds.has(linkCommandId)) {
				this.addCommand({
					id: linkCommandId,
					name: `Search and insert link - ${template.name}`,
					editorCallback: (editor) => {
						this.openSearchModal(true, editor, index);
					}
				});
				this.registeredCommandIds.add(linkCommandId);
			}

			// Search from selection command for this template (v1.5.0)
			const selectionCommandId = `search-selection-google-places-${this.templateToCommandId(template.name)}`;
			if (!this.registeredCommandIds.has(selectionCommandId)) {
				this.addCommand({
					id: selectionCommandId,
					name: `Search selection - ${template.name}`,
					editorCallback: (editor) => {
						void this.handleSelectionSearch(editor, index);
					}
				});
				this.registeredCommandIds.add(selectionCommandId);
			}
		});

		// Batch update command
		const batchCommandId = 'batch-update-places';
		if (!this.registeredCommandIds.has(batchCommandId)) {
			this.addCommand({
				id: batchCommandId,
				name: 'Batch update places',
				callback: () => {
					this.openBatchUpdateModal();
				}
			});
			this.registeredCommandIds.add(batchCommandId);
		}

		// Update current file command
		const updateCurrentCommandId = 'update-current-file-geo';
		if (!this.registeredCommandIds.has(updateCurrentCommandId)) {
			this.addCommand({
				id: updateCurrentCommandId,
				name: 'Update current file geo data',
				callback: () => {
					void this.updateCurrentFile();
				}
			});
			this.registeredCommandIds.add(updateCurrentCommandId);
		}
	}

	private templateToCommandId(templateName: string): string {
		// Convert template name to a valid command ID
		// Replace spaces and special characters with hyphens, lowercase
		return templateName
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
	}

	private registerSettingsTab() {
		this.addSettingTab(new GooglePlacesSettingTab(this.app, this));
	}

	private openSearchModal(insertLink: boolean = false, editor?: Editor, initialTemplateIndex?: number) {
		this.initializeServices();

		new PlaceSearchModal(
			this.app,
			this.googlePlacesService,
			this.dataMapper,
			this.noteCreator,
			this.settings,
			insertLink,
			editor,
			initialTemplateIndex
		).open();
	}

	private openBatchUpdateModal() {
		this.initializeServices();

		new BatchUpdateModal(
			this.app,
			this.settings,
			this.googlePlacesService,
			this.dataMapper
		).open();
	}

	private async updateCurrentFile(): Promise<void> {
		// Get the currently active file
		const activeFile = this.app.workspace.getActiveFile();

		if (!activeFile) {
			new Notice('No active file');
			return;
		}

		// Check if it's a markdown file
		if (activeFile.extension !== 'md') {
			new Notice('Active file is not a markdown file');
			return;
		}

		this.initializeServices();

		try {
			// Read file content and parse frontmatter
			const content = await this.app.vault.read(activeFile);
			const batchUpdateService = new BatchUpdateService(
				this.app,
				this.settings,
				this.googlePlacesService,
				this.dataMapper
			);
			const frontmatter = (batchUpdateService as any).parseFrontmatter(content);

			// Determine search query: try address first, fallback to filename
			let searchQuery = '';

			const addressField = this.settings.batchUpdateAddressField || 'address';
			const address = frontmatter[addressField] as string | undefined;

			if (address && typeof address === 'string' && address.trim() !== '') {
				searchQuery = address;
			} else {
				searchQuery = activeFile.basename;
			}

			if (!searchQuery) {
				new Notice('Could not determine search query for this file');
				return;
			}

			// Show loading notice
			new Notice(`Searching for: ${searchQuery}`);

			// Search for the place
			const searchResults = await this.googlePlacesService.searchPlaces(searchQuery);

			if (searchResults.length === 0) {
				new Notice(`No results found for: ${searchQuery}`);
				return;
			}

			// Handle result selection
			let selectedPlace: PlaceSearchResult | null = null;

			if (searchResults.length === 1) {
				// Auto-select single result
				selectedPlace = searchResults[0];
			} else {
				// Show selection modal for multiple results
				selectedPlace = await new Promise<PlaceSearchResult | null>((resolve) => {
					new PlaceSelectionModal(
						this.app,
						activeFile,
						searchResults,
						(selected) => resolve(selected)
					).open();
				});
			}

			if (!selectedPlace) {
				new Notice('No place selected');
				return;
			}

			// Get place details
			const placeDetails = await this.googlePlacesService.getPlaceDetails(selectedPlace.id);

			// Update the file with geo data
			await batchUpdateService.updateFile(activeFile, {
				address: placeDetails.formattedAddress,
				location: placeDetails.location
			});

			new Notice(`Updated geo data for: ${activeFile.basename}`);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error updating file: ${errorMessage}`);
			console.error('Error updating current file:', error);
		}
	}

	private async handleSelectionSearch(editor: Editor, templateIndex: number): Promise<void> {
		// Get selected text
		const selectedText = editor.getSelection().trim();

		if (!selectedText) {
			new Notice('Please select text to search for a place');
			return;
		}

		this.initializeServices();

		try {
			// Show loading notice
			new Notice(`Searching for: ${selectedText}`);

			// Search for the place
			const searchResults = await this.googlePlacesService.searchPlaces(selectedText);

			if (searchResults.length === 0) {
				new Notice(`No results found for: ${selectedText}`);
				return;
			}

			// Handle result selection based on count
			let selectedPlace: PlaceSearchResult | null = null;

			if (searchResults.length === 1) {
				// Auto-select single result
				selectedPlace = searchResults[0];
				new Notice(`Auto-selected: ${selectedPlace.displayName}`);
			} else {
				// Show selection modal for multiple results
				selectedPlace = await new Promise<PlaceSearchResult | null>((resolve) => {
					new PlaceSelectionModal(
						this.app,
						this.app.workspace.getActiveFile()!,
						searchResults,
						(selected) => resolve(selected)
					).open();
				});
			}

			if (!selectedPlace) {
				return;
			}

			// Get place details
			new Notice('Fetching place details...');
			const placeDetails = await this.googlePlacesService.getPlaceDetails(selectedPlace.id);

			// Map to frontmatter
			const frontmatter = this.dataMapper.mapPlaceDetailsToFrontmatter(placeDetails);

			// Add selected text as alias to preserve user's original search term
			if (selectedText !== placeDetails.displayName.text) {
				frontmatter.aliases = [selectedText];
			}

			// Handle image based on settings
			if (placeDetails.photos && placeDetails.photos.length > 0) {
				const photoName = placeDetails.photos[0].name;
				const imageUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${this.settings.apiKey}&maxHeightPx=400&maxWidthPx=400`;

				if (this.settings.downloadImages) {
					new Notice('Downloading image...');
					const localImagePath = await this.noteCreator.downloadAndSaveImage(
						imageUrl,
						placeDetails.displayName.text
					);
					if (localImagePath) {
						frontmatter.image = localImagePath;
					}
				} else {
					frontmatter.image = imageUrl;
				}
			}

			// Get filename
			const city = frontmatter.city;
			const filename = this.dataMapper.formatFilename(
				this.settings.filenameFormat,
				placeDetails.displayName.text,
				city
			);

			// Get the selected template
			const selectedTemplate = this.settings.templates[templateIndex];
			const templatePath = selectedTemplate?.path || '';
			const targetFolder = selectedTemplate?.targetFolder || this.settings.targetFolder;

			// If "No Template" mode, only include essential geo data
			let finalFrontmatter = frontmatter;
			if (!templatePath) {
				finalFrontmatter = {
					address: frontmatter.address,
					location: frontmatter.location,
					link: frontmatter.link,
					phone: frontmatter.phone,
					image: frontmatter.image
				};
				// Remove undefined values
				Object.keys(finalFrontmatter).forEach(key => {
					if (finalFrontmatter[key] === undefined) {
						delete finalFrontmatter[key];
					}
				});
			}

			// Create the note with the selected template
			const file = await this.noteCreator.createNote(
				filename,
				finalFrontmatter,
				placeDetails.displayName.text,
				templatePath,
				targetFolder
			);

			// Replace selection with link to the new note
			const link = `[[${file.basename}]]`;
			editor.replaceSelection(link);

			// Save last used template if setting is enabled
			if (this.settings.rememberLastTemplate) {
				this.settings.lastUsedTemplateIndex = templateIndex;
			}

			new Notice(`Created note and inserted link: ${file.basename}`);

		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			new Notice(`Error creating note: ${errorMessage}`);
			console.error('Error in handleSelectionSearch:', error);
		}
	}

	onunload() {
		console.debug('Google Places Plugin unloaded');
	}

	async loadSettings() {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);

		// Migration: Convert old templateFilePath to new templates array
		if (this.settings.templateFilePath && (!this.settings.templates || this.settings.templates.length === 0 ||
			(this.settings.templates.length === 1 && this.settings.templates[0].name === 'No Template'))) {
			console.debug('Migrating old templateFilePath to new templates array');
			this.settings.templates = [
				{ name: 'Default', path: this.settings.templateFilePath },
				{ name: 'No Template', path: '' }
			];
			this.settings.lastUsedTemplateIndex = 0; // Default to the migrated template
			// Clear old field
			this.settings.templateFilePath = '';
			// Save migrated settings
			await this.saveSettings();
		}

		// Ensure "No Template" option always exists
		if (!this.settings.templates || this.settings.templates.length === 0) {
			this.settings.templates = [{ name: 'No Template', path: '' }];
		} else {
			const hasNoTemplate = this.settings.templates.some(t => t.name === 'No Template' && t.path === '');
			if (!hasNoTemplate) {
				this.settings.templates.push({ name: 'No Template', path: '' });
			}
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initializeServices();
		// Re-register commands to pick up template name changes
		this.registerCommands();
	}
}

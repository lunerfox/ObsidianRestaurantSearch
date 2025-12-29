import { App, Modal, Notice, Setting, Editor } from 'obsidian';
import { GooglePlacesService } from './services/googlePlaces';
import { DataMapper } from './services/dataMapper';
import { NoteCreator } from './services/noteCreator';
import { PlaceSearchResult, GooglePlacesPluginSettings } from './types';

export class PlaceSearchModal extends Modal {
	private googlePlacesService: GooglePlacesService;
	private dataMapper: DataMapper;
	private noteCreator: NoteCreator;
	private settings: GooglePlacesPluginSettings;
	private searchResults: PlaceSearchResult[] = [];
	private insertLink: boolean;
	private editor?: Editor;
	private selectedTemplateIndex: number;
	private searchInputEl?: HTMLInputElement;
	private searchButtonEl?: HTMLButtonElement;
	private keypressHandler?: (e: KeyboardEvent) => void;
	private clickHandler?: () => void;
	private currentSearchId: number = 0;
	private lastSearchTime: number = 0;
	private debounceDelay: number = 300; // ms

	constructor(
		app: App,
		googlePlacesService: GooglePlacesService,
		dataMapper: DataMapper,
		noteCreator: NoteCreator,
		settings: GooglePlacesPluginSettings,
		insertLink: boolean = false,
		editor?: Editor,
		initialTemplateIndex?: number
	) {
		super(app);
		this.googlePlacesService = googlePlacesService;
		this.dataMapper = dataMapper;
		this.noteCreator = noteCreator;
		this.settings = settings;
		this.insertLink = insertLink;
		this.editor = editor;

		// Set initial template selection
		if (initialTemplateIndex !== undefined) {
			this.selectedTemplateIndex = initialTemplateIndex;
		} else if (settings.rememberLastTemplate) {
			this.selectedTemplateIndex = settings.lastUsedTemplateIndex;
		} else {
			this.selectedTemplateIndex = 0;
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Search Google Places' });

		// Template selection dropdown
		const templateContainer = contentEl.createDiv({ cls: 'template-container' });
		templateContainer.style.marginBottom = '1em';

		new Setting(templateContainer)
			.setName('Template')
			.setDesc('Select a template for the new note')
			.addDropdown(dropdown => {
				// Add all templates to dropdown
				this.settings.templates.forEach((template, index) => {
					dropdown.addOption(index.toString(), template.name);
				});

				// Set initial selection
				dropdown.setValue(this.selectedTemplateIndex.toString());

				// Update selected template when changed
				dropdown.onChange((value) => {
					this.selectedTemplateIndex = parseInt(value);
				});
			});

		const searchContainer = contentEl.createDiv({ cls: 'search-container' });
		searchContainer.style.marginBottom = '1em';

		new Setting(searchContainer)
			.setName('Search query')
			.setDesc('Enter place name and location (e.g., "Joe\'s Pizza NYC")')
			.addText(text => {
				text.setPlaceholder('Enter search query...');
				this.searchInputEl = text.inputEl;

				// Create and store handler for cleanup
				this.keypressHandler = (e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						// Debounce to prevent double-submit
						const now = Date.now();
						if (now - this.lastSearchTime < this.debounceDelay) {
							return;
						}
						this.lastSearchTime = now;
						void this.performSearch(text.getValue());
					}
				};

				this.searchInputEl.addEventListener('keypress', this.keypressHandler);
			})
			.addButton(button => {
				this.searchButtonEl = button.buttonEl;

				// Create and store handler for cleanup
				this.clickHandler = async () => {
					const searchInput = searchContainer.querySelector('input');
					if (searchInput) {
						await this.performSearch(searchInput.value);
					}
				};

				button
					.setButtonText('Search')
					.setCta()
					.onClick(this.clickHandler);
			});

		const resultsContainer = contentEl.createDiv({ cls: 'results-container' });
		resultsContainer.style.clear = 'both';
		resultsContainer.style.paddingTop = '1em';
	}

	async performSearch(query: string) {
		if (!query.trim()) {
			new Notice('Please enter a search query');
			return;
		}

		// Cancel any in-flight searches by incrementing ID
		this.currentSearchId++;
		const thisSearchId = this.currentSearchId;

		// Reset state
		this.searchResults = [];

		const resultsContainer = this.contentEl.querySelector('.results-container');
		if (!resultsContainer) return;

		resultsContainer.empty();
		resultsContainer.createEl('p', { text: 'Searching...', cls: 'loading-state' });

		try {
			const results = await this.googlePlacesService.searchPlaces(query);

			// Check if this search was cancelled
			if (thisSearchId !== this.currentSearchId) {
				return; // Ignore stale results
			}

			this.searchResults = results;

			resultsContainer.empty();

			if (this.searchResults.length === 0) {
				resultsContainer.createEl('p', {
					text: 'No results found. Try a different query.',
					cls: 'empty-state'
				});
				return;
			}

			resultsContainer.createEl('h3', { text: `Found ${this.searchResults.length} results` });

			const resultsList = resultsContainer.createDiv({ cls: 'results-list' });

			for (const result of this.searchResults) {
				const resultItem = resultsList.createDiv({ cls: 'result-item' });

				const resultContent = resultItem.createDiv({ cls: 'result-content' });
				resultContent.createEl('div', {
					text: result.displayName,
					cls: 'result-name'
				});
				resultContent.createEl('div', {
					text: result.formattedAddress,
					cls: 'result-address'
				});

				const selectButton = resultItem.createEl('button', {
					text: 'Select',
					cls: 'select-button'
				});

				// Note: These listeners are attached to dynamically created elements
				// that are removed via resultsContainer.empty(), so they don't persist
				selectButton.addEventListener('click', () => {
					void this.selectPlace(result);
				});
			}

		} catch (error) {
			// Check if this search was cancelled
			if (thisSearchId !== this.currentSearchId) {
				return; // Ignore stale errors
			}

			resultsContainer.empty();
			resultsContainer.createEl('p', {
				text: 'Error performing search. Please try again.',
				cls: 'error-state'
			});

			// Log error for debugging
			console.error('Search error:', error);

			// Reset state on error
			this.searchResults = [];
		}
	}

	async selectPlace(result: PlaceSearchResult) {
		try {
			new Notice('Fetching place details...');

			const placeDetails = await this.googlePlacesService.getPlaceDetails(result.id);

			const frontmatter = this.dataMapper.mapPlaceDetailsToFrontmatter(placeDetails);

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

			const city = frontmatter.city;
			const filename = this.dataMapper.formatFilename(
				this.settings.filenameFormat,
				placeDetails.displayName.text,
				city
			);

			// Get the selected template
			const selectedTemplate = this.settings.templates[this.selectedTemplateIndex];
			const templatePath = selectedTemplate?.path || '';
			const targetFolder = selectedTemplate?.targetFolder || this.settings.targetFolder;

			// If "No Template" mode, only include essential geo data
			let finalFrontmatter = frontmatter;
			if (!templatePath) {
				// Only keep essential fields for "No Template" mode
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

			// Save last used template if setting is enabled
			if (this.settings.rememberLastTemplate) {
				this.settings.lastUsedTemplateIndex = this.selectedTemplateIndex;
			}

			if (this.insertLink && this.editor) {
				// Insert link at cursor position
				const link = `[[${file.basename}]]`;
				this.editor.replaceSelection(link);
				new Notice(`Created note and inserted link: ${file.basename}`);
			} else {
				// Open the file in a new leaf
				const leaf = this.app.workspace.getLeaf(false);
				await leaf.openFile(file);
			}

			this.close();

		} catch (error) {
			new Notice('Error creating note. Please try again.');
			console.error('Error selecting place:', error);
		}
	}

	onClose() {
		const { contentEl } = this;

		// Remove event listeners
		if (this.searchInputEl && this.keypressHandler) {
			this.searchInputEl.removeEventListener('keypress', this.keypressHandler);
		}
		if (this.searchButtonEl && this.clickHandler) {
			this.searchButtonEl.removeEventListener('click', this.clickHandler);
		}

		// Cancel any in-flight searches
		this.currentSearchId++;

		// Clear references
		this.searchInputEl = undefined;
		this.searchButtonEl = undefined;
		this.keypressHandler = undefined;
		this.clickHandler = undefined;
		this.searchResults = [];

		contentEl.empty();
	}
}

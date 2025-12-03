import { App, Modal, Notice, Setting } from 'obsidian';
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

	constructor(
		app: App,
		googlePlacesService: GooglePlacesService,
		dataMapper: DataMapper,
		noteCreator: NoteCreator,
		settings: GooglePlacesPluginSettings
	) {
		super(app);
		this.googlePlacesService = googlePlacesService;
		this.dataMapper = dataMapper;
		this.noteCreator = noteCreator;
		this.settings = settings;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Search Google Places' });

		const searchContainer = contentEl.createDiv({ cls: 'search-container' });

		new Setting(searchContainer)
			.setName('Search Query')
			.setDesc('Enter place name and location (e.g., "Joe\'s Pizza NYC")')
			.addText(text => {
				text.setPlaceholder('Enter search query...');
				text.inputEl.addEventListener('keypress', async (e) => {
					if (e.key === 'Enter') {
						await this.performSearch(text.getValue());
					}
				});
			})
			.addButton(button => {
				button
					.setButtonText('Search')
					.setCta()
					.onClick(async () => {
						const searchInput = searchContainer.querySelector('input');
						if (searchInput) {
							await this.performSearch((searchInput as HTMLInputElement).value);
						}
					});
			});

		const resultsContainer = contentEl.createDiv({ cls: 'results-container' });
		resultsContainer.createEl('p', {
			text: 'Enter a search query and press Enter or click Search',
			cls: 'empty-state'
		});
	}

	async performSearch(query: string) {
		if (!query.trim()) {
			new Notice('Please enter a search query');
			return;
		}

		const resultsContainer = this.contentEl.querySelector('.results-container');
		if (!resultsContainer) return;

		resultsContainer.empty();
		resultsContainer.createEl('p', { text: 'Searching...', cls: 'loading-state' });

		try {
			this.searchResults = await this.googlePlacesService.searchPlaces(query);

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

				selectButton.addEventListener('click', async () => {
					await this.selectPlace(result);
				});
			}

		} catch (error) {
			resultsContainer.empty();
			resultsContainer.createEl('p', {
				text: 'Error performing search. Please try again.',
				cls: 'error-state'
			});
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

			const file = await this.noteCreator.createNote(
				filename,
				frontmatter,
				placeDetails.displayName.text
			);

			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);

			this.close();

		} catch (error) {
			new Notice('Error creating note. Please try again.');
			console.error('Error selecting place:', error);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

import { App, PluginSettingTab, Setting, TFile, TFolder, TAbstractFile, Notice } from 'obsidian';
import GooglePlacesPlugin from './main';
import { GooglePlacesPluginSettings } from './types';

export class GooglePlacesSettingTab extends PluginSettingTab {
	plugin: GooglePlacesPlugin;
	private warningEl: HTMLElement | null = null;

	constructor(app: App, plugin: GooglePlacesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Google Places Plugin Settings' });

		// Create a container for the warning message
		this.warningEl = containerEl.createDiv({ cls: 'google-places-api-warning' });
		this.updateWarningVisibility();

		new Setting(containerEl)
			.setName('Google Places API Key')
			.setDesc('Enter your Google Places API key from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}))
			.addButton(button => button
				.setButtonText('Validate')
				.setTooltip('Test your API key connection')
				.onClick(async () => {
					await this.validateApiKey(button.buttonEl);
				}));

		new Setting(containerEl)
			.setName('Template File Path')
			.setDesc('Path to template file for note structure (e.g., Templates/restaurant-snippet.md)')
			.addText(text => {
				new FileSuggest(this.app, text.inputEl);
				text
					.setPlaceholder('Templates/restaurant-snippet.md')
					.setValue(this.plugin.settings.templateFilePath)
					.onChange(async (value) => {
						this.plugin.settings.templateFilePath = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Target Folder')
			.setDesc('Folder where new notes will be created (e.g., Restaurants/)')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder('Restaurants/')
					.setValue(this.plugin.settings.targetFolder)
					.onChange(async (value) => {
						this.plugin.settings.targetFolder = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName('Filename Format')
			.setDesc('Pattern for generated filenames. Available variables: {name}, {city}')
			.addText(text => text
				.setPlaceholder('{name}')
				.setValue(this.plugin.settings.filenameFormat)
				.onChange(async (value) => {
					this.plugin.settings.filenameFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Download Images Locally')
			.setDesc('Download place photos to your vault instead of linking to Google servers')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.downloadImages)
				.onChange(async (value) => {
					this.plugin.settings.downloadImages = value;
					await this.plugin.saveSettings();
					this.updateWarningVisibility();
				}));

		new Setting(containerEl)
			.setName('Image Folder')
			.setDesc('Folder where downloaded images will be stored (e.g., attachments/places)')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder('attachments/places')
					.setValue(this.plugin.settings.imageFolder)
					.onChange(async (value) => {
						this.plugin.settings.imageFolder = value;
						await this.plugin.saveSettings();
					});
			});
	}

	private updateWarningVisibility(): void {
		if (!this.warningEl) return;

		this.warningEl.empty();

		if (!this.plugin.settings.downloadImages) {
			this.warningEl.createEl('div', {
				text: '⚠️ Warning: With image downloads disabled, your Google API key will be included in image URLs within your notes. This could expose your API key if you share these notes.',
				cls: 'setting-item-description mod-warning'
			});
			this.warningEl.style.display = 'block';
		} else {
			this.warningEl.style.display = 'none';
		}
	}

	private async validateApiKey(buttonEl: HTMLElement): Promise<void> {
		const apiKey = this.plugin.settings.apiKey;

		if (!apiKey || apiKey.trim() === '') {
			new Notice('Please enter an API key first');
			return;
		}

		// Save original button text and disable button
		const originalText = buttonEl.textContent;
		buttonEl.textContent = 'Validating...';
		buttonEl.setAttribute('disabled', 'true');

		try {
			// Make a simple test request to validate the API key
			const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
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

			if (response.ok) {
				new Notice('✓ API key is valid and working!');
				buttonEl.textContent = '✓ Valid';
				setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			} else if (response.status === 403) {
				new Notice('✗ Invalid API key. Please check your key in Google Cloud Console.');
				buttonEl.textContent = '✗ Invalid';
				setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			} else if (response.status === 400) {
				// API key might be valid but missing required APIs
				new Notice('API key may be valid but Google Places API is not enabled. Check your Google Cloud Console.');
				buttonEl.textContent = '⚠ Check Console';
				setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			} else {
				new Notice(`Validation failed with status: ${response.status}`);
				buttonEl.textContent = '✗ Failed';
				setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			}
		} catch (error) {
			new Notice('Network error while validating API key. Please check your connection.');
			buttonEl.textContent = '✗ Error';
			setTimeout(() => {
				buttonEl.textContent = originalText;
			}, 3000);
		} finally {
			buttonEl.removeAttribute('disabled');
		}
	}
}

// Base class for input suggesters
abstract class InputSuggest<T> {
	protected app: App;
	protected inputEl: HTMLInputElement;
	protected suggestEl: HTMLElement | null = null;
	protected suggestions: T[] = [];
	protected selectedItem: number = -1;

	constructor(app: App, inputEl: HTMLInputElement) {
		this.app = app;
		this.inputEl = inputEl;

		this.inputEl.addEventListener('input', this.onInputChanged.bind(this));
		this.inputEl.addEventListener('focus', this.onInputChanged.bind(this));
		this.inputEl.addEventListener('blur', () => {
			setTimeout(() => this.close(), 200);
		});
		this.inputEl.addEventListener('keydown', this.onKeyDown.bind(this));
	}

	protected abstract getSuggestions(query: string): T[];
	protected abstract renderSuggestion(item: T, el: HTMLElement): void;
	protected abstract selectSuggestion(item: T): void;

	private onInputChanged(): void {
		const query = this.inputEl.value;
		this.suggestions = this.getSuggestions(query);

		if (this.suggestions.length > 0) {
			this.open();
		} else {
			this.close();
		}
	}

	private onKeyDown(event: KeyboardEvent): void {
		if (!this.suggestEl) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.selectedItem = Math.min(this.selectedItem + 1, this.suggestions.length - 1);
			this.renderSuggestions();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.selectedItem = Math.max(this.selectedItem - 1, -1);
			this.renderSuggestions();
		} else if (event.key === 'Enter' && this.selectedItem >= 0) {
			event.preventDefault();
			this.selectSuggestion(this.suggestions[this.selectedItem]);
			this.close();
		} else if (event.key === 'Escape') {
			this.close();
		}
	}

	private open(): void {
		if (this.suggestEl) return;

		this.suggestEl = createDiv({ cls: 'suggestion-container' });
		const rect = this.inputEl.getBoundingClientRect();
		this.suggestEl.style.position = 'absolute';
		this.suggestEl.style.top = `${rect.bottom}px`;
		this.suggestEl.style.left = `${rect.left}px`;
		this.suggestEl.style.width = `${rect.width}px`;
		document.body.appendChild(this.suggestEl);

		this.renderSuggestions();
	}

	private renderSuggestions(): void {
		if (!this.suggestEl) return;

		this.suggestEl.empty();

		this.suggestions.forEach((item, index) => {
			const suggestionEl = this.suggestEl!.createDiv({ cls: 'suggestion-item' });
			if (index === this.selectedItem) {
				suggestionEl.addClass('is-selected');
			}

			this.renderSuggestion(item, suggestionEl);

			suggestionEl.addEventListener('click', () => {
				this.selectSuggestion(item);
				this.close();
			});
		});
	}

	protected close(): void {
		if (this.suggestEl) {
			this.suggestEl.remove();
			this.suggestEl = null;
		}
		this.selectedItem = -1;
	}
}

// File suggester for template file path
class FileSuggest extends InputSuggest<TFile> {
	protected getSuggestions(query: string): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const lowerQuery = query.toLowerCase();

		return files.filter(file =>
			file.path.toLowerCase().includes(lowerQuery)
		).slice(0, 10);
	}

	protected renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	protected selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
	}
}

// Folder suggester for target folder and image folder
class FolderSuggest extends InputSuggest<TFolder> {
	protected getSuggestions(query: string): TFolder[] {
		const folders: TFolder[] = [];
		const lowerQuery = query.toLowerCase();

		this.app.vault.getAllLoadedFiles().forEach((file: TAbstractFile) => {
			if (file instanceof TFolder && file.path.toLowerCase().includes(lowerQuery)) {
				folders.push(file);
			}
		});

		return folders.slice(0, 10);
	}

	protected renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	protected selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
	}
}

import { App, PluginSettingTab, Setting, TFile, TFolder, TAbstractFile, Notice, requestUrl } from 'obsidian';
import GooglePlacesPlugin from './main';

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

		// "Google Places" is the product name — intentional capitalization.
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Setting(containerEl).setName('Google Places plugin').setHeading();

		containerEl.createEl('p', {
			text: `Version ${this.plugin.manifest.version}`,
			cls: 'setting-item-description'
		});

		// Create a container for the warning message
		this.warningEl = containerEl.createDiv({ cls: 'google-places-api-warning' });
		this.updateWarningVisibility();

		new Setting(containerEl)
			// "Google Places" / "Google Cloud Console" are product names — intentional capitalization.
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setName('Google Places API key')
			// eslint-disable-next-line obsidianmd/ui/sentence-case
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

		// Templates section
		new Setting(containerEl).setName('Templates').setHeading();

		containerEl.createEl('p', {
			text: 'Define templates for different types of places. Each template can be selected when creating a new place note.',
			cls: 'setting-item-description'
		});

		// Display existing templates
		this.plugin.settings.templates.forEach((template, index) => {
			// Skip "No Template" as it's built-in
			if (template.name === 'No Template' && template.path === '') {
				return;
			}

			// Template name and remove button
			const templateSetting = new Setting(containerEl)
				.setClass('template-item')
				.setName(`Template: ${template.name}`)
				.addText(text => {
					text
						.setPlaceholder('Template name')
						.setValue(template.name)
						.onChange(async (value) => {
							this.plugin.settings.templates[index].name = value;
							// Update the heading dynamically without refreshing entire page
							templateSetting.setName(`Template: ${value}`);
							await this.plugin.saveSettings();
						});
					text.inputEl.addClass('gp-input-narrow');
				})
				.addButton(button => button
					.setButtonText('Remove')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.templates.splice(index, 1);
						await this.plugin.saveSettings();
						this.display(); // Refresh the settings display
					}));

			// Template file path
			new Setting(containerEl)
				.setClass('template-subitem')
				.setName('Template file')
				.addText(text => {
					new FileSuggest(this.app, text.inputEl);
					text
						.setPlaceholder('Templates/template.md')
						.setValue(template.path)
						.onChange(async (value) => {
							this.plugin.settings.templates[index].path = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.addClass('gp-input-wide');
				});

			// Target folder (optional)
			new Setting(containerEl)
				.setClass('template-subitem')
				.setName('Target folder (optional)')
				.setDesc('Override the default target folder for this template')
				.addText(text => {
					new FolderSuggest(this.app, text.inputEl);
					text
						.setPlaceholder('Leave empty to use default')
						.setValue(template.targetFolder || '')
						.onChange(async (value) => {
							this.plugin.settings.templates[index].targetFolder = value || undefined;
							await this.plugin.saveSettings();
						});
					text.inputEl.addClass('gp-input-wide');
				});

			// Add spacing between templates
			containerEl.createEl('div', { cls: 'setting-item-separator' });
		});

		// Add template button
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add template')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.templates.push({ name: 'New Template', path: '' });
					await this.plugin.saveSettings();
					this.display(); // Refresh the settings display
				}));

		// Remember last template setting
		new Setting(containerEl)
			.setName('Remember last used template')
			.setDesc('Automatically select the last-used template when opening the search modal')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.rememberLastTemplate)
				.onChange(async (value) => {
					this.plugin.settings.rememberLastTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Target folder')
			.setDesc('Folder where new notes will be created (e.g., restaurants/)')
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
			.setName('Filename format')
			.setDesc('Pattern for generated filenames. Available variables: {name}, {city}')
			.addText(text => text
				.setPlaceholder('{name}')
				.setValue(this.plugin.settings.filenameFormat)
				.onChange(async (value) => {
					this.plugin.settings.filenameFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Download images locally')
			.setDesc('Download place photos to your vault instead of linking to Google servers')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.downloadImages)
				.onChange(async (value) => {
					this.plugin.settings.downloadImages = value;
					await this.plugin.saveSettings();
					this.updateWarningVisibility();
				}));

		new Setting(containerEl)
			.setName('Image folder')
			.setDesc('Folder where downloaded images will be stored (e.g., attachments/places)')
			.addText(text => {
				new FolderSuggest(this.app, text.inputEl);
				text
					// Placeholder mirrors the default folder value (DEFAULT_SETTINGS.imageFolder).
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder('attachments/places')
					.setValue(this.plugin.settings.imageFolder)
					.onChange(async (value) => {
						this.plugin.settings.imageFolder = value;
						await this.plugin.saveSettings();
					});
			});

		// Restaurant settings section
		new Setting(containerEl).setName('Restaurants').setHeading();

		new Setting(containerEl)
			.setName('Cuisine mappings')
			// "Google Place types" is Google's place-type taxonomy and "google_type" is the
			// literal lowercase key format — intentional capitalization.
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc('Map Google Place types to cuisine labels. Format: one mapping per line as "google_type: Label"')
			.addTextArea(text => {
				const mappings = this.plugin.settings.restaurants.cuisineMappings;
				const mappingsText = Object.entries(mappings)
					.map(([key, value]) => `${key}: ${value}`)
					.join('\n');

				text
					// Placeholder shows the literal mapping format (lowercase google_type keys).
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder('restaurant: Restaurant\nitalian_restaurant: Italian')
					.setValue(mappingsText)
					.onChange(async (value) => {
						const newMappings: { [key: string]: string } = {};
						const lines = value.split('\n');

						for (const line of lines) {
							const trimmedLine = line.trim();
							if (trimmedLine) {
								const colonIndex = trimmedLine.indexOf(':');
								if (colonIndex > 0) {
									const key = trimmedLine.substring(0, colonIndex).trim();
									const val = trimmedLine.substring(colonIndex + 1).trim();
									if (key && val) {
										newMappings[key] = val;
									}
								}
							}
						}

						this.plugin.settings.restaurants.cuisineMappings = newMappings;
						await this.plugin.saveSettings();
					});

				text.inputEl.rows = 10;
				text.inputEl.cols = 50;
			});

		// Batch update places section
		new Setting(containerEl).setName('Batch update places').setHeading();

		new Setting(containerEl)
			.setName('Address field name')
			.setDesc('Frontmatter field to read address from (default: address)')
			.addText(text => text
				// Placeholder mirrors the default field name (DEFAULT_SETTINGS.batchUpdateAddressField).
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder('address')
				.setValue(this.plugin.settings.batchUpdateAddressField)
				.onChange(async (value) => {
					this.plugin.settings.batchUpdateAddressField = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Use filename as fallback')
			.setDesc('If no address is found in frontmatter, use the filename to search for the place')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.batchUpdateUseFilenameAsFallback)
				.onChange(async (value) => {
					this.plugin.settings.batchUpdateUseFilenameAsFallback = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Auto-select single result')
			.setDesc('Automatically select a place when search returns only one result')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.batchUpdateAutoSelectSingleResult)
				.onChange(async (value) => {
					this.plugin.settings.batchUpdateAutoSelectSingleResult = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Rate limit delay (ms)')
			.setDesc('Delay between API calls to avoid rate limiting (default: 500ms)')
			.addText(text => text
				.setPlaceholder('500')
				.setValue(String(this.plugin.settings.batchUpdateRateLimit))
				.onChange(async (value) => {
					const numValue = parseInt(value, 10);
					if (!isNaN(numValue) && numValue >= 0) {
						this.plugin.settings.batchUpdateRateLimit = numValue;
						await this.plugin.saveSettings();
					}
				}));
	}

	private updateWarningVisibility(): void {
		if (!this.warningEl) return;

		this.warningEl.empty();

		if (!this.plugin.settings.downloadImages) {
			this.warningEl.createEl('div', {
				// "Google" is a product name and "URLs" is an acronym — intentional capitalization.
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				text: '⚠️ Warning: With image downloads disabled, your Google API key will be included in image URLs within your notes. This could expose your API key if you share these notes.',
				cls: 'setting-item-description mod-warning'
			});
			this.warningEl.setCssProps({ display: 'block' });
		} else {
			this.warningEl.setCssProps({ display: 'none' });
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
				new Notice('API key is valid and working');
				buttonEl.textContent = '✓ valid';
				window.setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			} else if (response.status === 403) {
				// "Google Cloud Console" is a product name — intentional capitalization.
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				new Notice('Invalid API key, check your key in Google Cloud Console');
				buttonEl.textContent = '✗ invalid';
				window.setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			} else if (response.status === 400) {
				// API key might be valid but missing required APIs.
				// "Google Places" / "Google Cloud Console" are product names — intentional capitalization.
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				new Notice('API key may be valid but Google Places API is not enabled, check your Google Cloud Console');
				buttonEl.textContent = '⚠ Check console';
				window.setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			} else {
				new Notice(`Validation failed with status ${response.status}`);
				buttonEl.textContent = '✗ failed';
				window.setTimeout(() => {
					buttonEl.textContent = originalText;
				}, 3000);
			}
		} catch {
			new Notice('Network error while validating API key, check your connection');
			buttonEl.textContent = '✗ error';
			window.setTimeout(() => {
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

		this.inputEl.addEventListener('input', () => this.onInputChanged());
		this.inputEl.addEventListener('focus', () => this.onInputChanged());
		this.inputEl.addEventListener('blur', () => {
			window.setTimeout(() => this.close(), 200);
		});
		this.inputEl.addEventListener('keydown', (event) => this.onKeyDown(event));
	}

	protected abstract getSuggestions(query: string): T[];
	protected abstract renderSuggestion(item: T, el: HTMLElement): void;
	protected abstract selectSuggestion(item: T): void;

	private onInputChanged(): void {
		const query = this.inputEl.value;
		this.suggestions = this.getSuggestions(query);

		if (this.suggestions.length > 0) {
			this.open();
			// Re-render suggestions when input changes
			this.renderSuggestions();
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
		this.suggestEl.setCssProps({
			position: 'absolute',
			top: `${rect.bottom}px`,
			left: `${rect.left}px`,
			width: `${rect.width}px`
		});
		activeDocument.body.appendChild(this.suggestEl);

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

	protected renderMatchWithHighlight(el: HTMLElement, text: string, query: string): void {
		if (!query) {
			el.setText(text);
			return;
		}

		const lowerText = text.toLowerCase();
		const lowerQuery = query.toLowerCase();
		const parts: { text: string; isMatch: boolean }[] = [];
		let lastIndex = 0;

		let index = lowerText.indexOf(lowerQuery, lastIndex);
		while (index !== -1) {
			// Add non-matching text before this match
			if (index > lastIndex) {
				parts.push({ text: text.substring(lastIndex, index), isMatch: false });
			}
			// Add matching text
			parts.push({ text: text.substring(index, index + query.length), isMatch: true });
			lastIndex = index + query.length;
			index = lowerText.indexOf(lowerQuery, lastIndex);
		}

		// Add remaining non-matching text
		if (lastIndex < text.length) {
			parts.push({ text: text.substring(lastIndex), isMatch: false });
		}

		// Render parts with bold tags for matches
		el.empty();
		parts.forEach(part => {
			if (part.isMatch) {
				el.createEl('strong', { text: part.text });
			} else {
				el.appendText(part.text);
			}
		});
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
		this.renderMatchWithHighlight(el, file.path, this.inputEl.value);
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
		this.renderMatchWithHighlight(el, folder.path, this.inputEl.value);
	}

	protected selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
	}
}

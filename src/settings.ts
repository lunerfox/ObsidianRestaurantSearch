import { App, PluginSettingTab, Setting } from 'obsidian';
import GooglePlacesPlugin from './main';
import { GooglePlacesPluginSettings } from './types';

export class GooglePlacesSettingTab extends PluginSettingTab {
	plugin: GooglePlacesPlugin;

	constructor(app: App, plugin: GooglePlacesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Google Places Plugin Settings' });

		new Setting(containerEl)
			.setName('Google Places API Key')
			.setDesc('Enter your Google Places API key from Google Cloud Console')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Template File Path')
			.setDesc('Path to template file for note structure (e.g., Templates/restaurant-snippet.md)')
			.addText(text => text
				.setPlaceholder('Templates/restaurant-snippet.md')
				.setValue(this.plugin.settings.templateFilePath)
				.onChange(async (value) => {
					this.plugin.settings.templateFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Target Folder')
			.setDesc('Folder where new notes will be created (e.g., Restaurants/)')
			.addText(text => text
				.setPlaceholder('Restaurants/')
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					this.plugin.settings.targetFolder = value;
					await this.plugin.saveSettings();
				}));

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
				}));

		new Setting(containerEl)
			.setName('Image Folder')
			.setDesc('Folder where downloaded images will be stored (e.g., attachments/places)')
			.addText(text => text
				.setPlaceholder('attachments/places')
				.setValue(this.plugin.settings.imageFolder)
				.onChange(async (value) => {
					this.plugin.settings.imageFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}

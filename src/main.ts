import { Plugin } from 'obsidian';
import { GooglePlacesPluginSettings, DEFAULT_SETTINGS } from './types';
import { GooglePlacesSettingTab } from './settings';
import { PlaceSearchModal } from './modal';
import { GooglePlacesService } from './services/googlePlaces';
import { DataMapper } from './services/dataMapper';
import { NoteCreator } from './services/noteCreator';

export default class GooglePlacesPlugin extends Plugin {
	settings: GooglePlacesPluginSettings;
	private googlePlacesService: GooglePlacesService;
	private dataMapper: DataMapper;
	private noteCreator: NoteCreator;

	async onload() {
		await this.loadSettings();

		this.initializeServices();

		this.registerCommands();

		this.registerSettingsTab();

		console.log('Google Places Plugin loaded');
	}

	private initializeServices() {
		this.googlePlacesService = new GooglePlacesService(this.settings.apiKey);
		this.dataMapper = new DataMapper();
		this.noteCreator = new NoteCreator(this.app, this.settings);
	}

	private registerCommands() {
		this.addCommand({
			id: 'search-google-places',
			name: 'Search and add place from Google Places',
			callback: () => {
				this.openSearchModal();
			}
		});
	}

	private registerSettingsTab() {
		this.addSettingTab(new GooglePlacesSettingTab(this.app, this));
	}

	private openSearchModal() {
		this.initializeServices();

		new PlaceSearchModal(
			this.app,
			this.googlePlacesService,
			this.dataMapper,
			this.noteCreator,
			this.settings
		).open();
	}

	onunload() {
		console.log('Google Places Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initializeServices();
	}
}

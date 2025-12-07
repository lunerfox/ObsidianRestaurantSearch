import { Plugin, Editor } from 'obsidian';
import { GooglePlacesPluginSettings, DEFAULT_SETTINGS } from './types';
import { GooglePlacesSettingTab } from './settings';
import { PlaceSearchModal } from './modal';
import { BatchUpdateModal } from './batchUpdateModal';
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

		console.debug('Google Places Plugin loaded');
	}

	private initializeServices() {
		this.googlePlacesService = new GooglePlacesService(this.settings.apiKey);
		this.dataMapper = new DataMapper(this.settings);
		this.noteCreator = new NoteCreator(this.app, this.settings);
	}

	private registerCommands() {
		this.addCommand({
			id: 'search-google-places',
			name: 'Search and add place from Google Places',
			callback: () => {
				this.openSearchModal(false);
			}
		});

		this.addCommand({
			id: 'search-google-places-insert-link',
			name: 'Search and add place, then insert link at cursor',
			editorCallback: (editor) => {
				this.openSearchModal(true, editor);
			}
		});

		this.addCommand({
			id: 'batch-update-places',
			name: 'Batch update places',
			callback: () => {
				this.openBatchUpdateModal();
			}
		});
	}

	private registerSettingsTab() {
		this.addSettingTab(new GooglePlacesSettingTab(this.app, this));
	}

	private openSearchModal(insertLink: boolean = false, editor?: Editor) {
		this.initializeServices();

		new PlaceSearchModal(
			this.app,
			this.googlePlacesService,
			this.dataMapper,
			this.noteCreator,
			this.settings,
			insertLink,
			editor
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

	onunload() {
		console.debug('Google Places Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.initializeServices();
	}
}

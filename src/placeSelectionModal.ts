import { App, Modal, TFile } from 'obsidian';
import { PlaceSearchResult } from './types';

export class PlaceSelectionModal extends Modal {
	private file: TFile;
	private results: PlaceSearchResult[];
	private onSelect: (selectedPlace: PlaceSearchResult | null) => void;

	constructor(
		app: App,
		file: TFile,
		results: PlaceSearchResult[],
		onSelect: (selectedPlace: PlaceSearchResult | null) => void
	) {
		super(app);
		this.file = file;
		this.results = results;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select place' });

		// Show context - which file we're processing
		contentEl.createEl('p', {
			text: `Selecting place for: ${this.file.basename}`,
			cls: 'place-selection-context'
		});

		contentEl.createEl('p', {
			text: `Found ${this.results.length} result(s). Please select the correct one:`,
			cls: 'place-selection-description'
		});

		// Results list
		const resultsList = contentEl.createDiv({ cls: 'place-selection-results' });

		for (const result of this.results) {
			const resultItem = resultsList.createDiv({ cls: 'place-selection-item' });

			const resultContent = resultItem.createDiv({ cls: 'place-selection-content' });
			resultContent.createEl('div', {
				text: result.displayName,
				cls: 'place-selection-name'
			});
			resultContent.createEl('div', {
				text: result.formattedAddress,
				cls: 'place-selection-address'
			});

			const selectButton = resultItem.createEl('button', {
				text: 'Select',
				cls: 'mod-cta'
			});

			selectButton.addEventListener('click', () => {
				this.selectPlace(result);
			});
		}

		// Skip button at the bottom
		const buttonContainer = contentEl.createDiv({ cls: 'place-selection-buttons' });
		const skipButton = buttonContainer.createEl('button', {
			text: 'Skip this file',
			cls: 'mod-warning'
		});

		skipButton.addEventListener('click', () => {
			this.skipFile();
		});
	}

	private selectPlace(place: PlaceSearchResult) {
		this.onSelect(place);
		this.close();
	}

	private skipFile() {
		this.onSelect(null);
		this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

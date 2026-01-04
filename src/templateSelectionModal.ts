import { App, Modal, Setting } from 'obsidian';
import { PlaceTemplate } from './types';

export class TemplateSelectionModal extends Modal {
	private templates: PlaceTemplate[];
	private onSelect: (templateIndex: number) => void;
	private selectedIndex: number = 0;

	constructor(
		app: App,
		templates: PlaceTemplate[],
		onSelect: (templateIndex: number) => void
	) {
		super(app);
		this.templates = templates;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select Template' });

		// Create a container for the template list
		const listContainer = contentEl.createDiv({ cls: 'template-selection-list' });

		this.templates.forEach((template, index) => {
			const itemContainer = listContainer.createDiv({ cls: 'template-selection-item' });

			new Setting(itemContainer)
				.setName(template.name)
				.setDesc(template.path || 'No template (essential fields only)')
				.addButton(button => {
					button
						.setButtonText('Select')
						.setCta()
						.onClick(() => {
							this.selectedIndex = index;
							this.onSelect(index);
							this.close();
						});
				});
		});

		// Add cancel button at bottom
		const buttonContainer = contentEl.createDiv({ cls: 'template-selection-buttons' });
		new Setting(buttonContainer)
			.addButton(button => {
				button
					.setButtonText('Cancel')
					.onClick(() => {
						this.close();
					});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

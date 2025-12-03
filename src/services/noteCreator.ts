import { App, Notice, TFile, TFolder, normalizePath } from 'obsidian';
import { NoteFrontmatter, GooglePlacesPluginSettings } from '../types';

export class NoteCreator {
	private app: App;
	private settings: GooglePlacesPluginSettings;

	constructor(app: App, settings: GooglePlacesPluginSettings) {
		this.app = app;
		this.settings = settings;
	}

	async createNote(filename: string, frontmatter: NoteFrontmatter, placeName: string): Promise<TFile> {
		const targetFolder = this.settings.targetFolder;

		await this.ensureFolderExists(targetFolder);

		const filePath = normalizePath(
			targetFolder ? `${targetFolder}/${filename}.md` : `${filename}.md`
		);

		const uniqueFilePath = await this.getUniqueFilePath(filePath);

		const templateContent = await this.loadTemplate();
		const noteContent = this.buildNoteContent(frontmatter, templateContent, placeName);

		const file = await this.app.vault.create(uniqueFilePath, noteContent);

		new Notice(`Created note: ${filename}`);

		return file;
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!folderPath) return;

		const normalizedPath = normalizePath(folderPath);
		const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

		if (!folder) {
			await this.app.vault.createFolder(normalizedPath);
		} else if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${normalizedPath}`);
		}
	}

	private async getUniqueFilePath(filePath: string): Promise<string> {
		let uniquePath = filePath;
		let counter = 1;

		while (this.app.vault.getAbstractFileByPath(uniquePath)) {
			const pathWithoutExt = filePath.replace(/\.md$/, '');
			uniquePath = `${pathWithoutExt} ${counter}.md`;
			counter++;
		}

		return uniquePath;
	}

	private async loadTemplate(): Promise<string> {
		if (!this.settings.templateFilePath) {
			return '';
		}

		try {
			const templateFile = this.app.vault.getAbstractFileByPath(
				normalizePath(this.settings.templateFilePath)
			);

			if (templateFile instanceof TFile) {
				return await this.app.vault.read(templateFile);
			} else {
				new Notice(`Template file not found: ${this.settings.templateFilePath}`);
				return '';
			}
		} catch (error) {
			new Notice(`Error loading template: ${error.message}`);
			return '';
		}
	}

	private buildNoteContent(frontmatter: NoteFrontmatter, templateContent: string, placeName: string): string {
		const frontmatterStr = this.formatFrontmatter(frontmatter);

		if (templateContent) {
			const templateWithoutFrontmatter = this.stripExistingFrontmatter(templateContent);
			return `${frontmatterStr}\n${templateWithoutFrontmatter}`;
		}

		return `${frontmatterStr}\n# ${placeName}\n\n`;
	}

	private formatFrontmatter(frontmatter: NoteFrontmatter): string {
		const lines = ['---'];

		if (frontmatter.cuisine && frontmatter.cuisine.length > 0) {
			lines.push(`cuisine: [${frontmatter.cuisine.join(', ')}]`);
		}

		if (frontmatter.city) {
			lines.push(`city: ${frontmatter.city}`);
		}

		if (frontmatter['rating-google'] !== undefined) {
			lines.push(`rating-google: ${frontmatter['rating-google']}`);
		}

		if (frontmatter.link) {
			lines.push(`link: ${frontmatter.link}`);
		}

		if (frontmatter.image) {
			lines.push(`image: ${frontmatter.image}`);
		}

		if (frontmatter.address) {
			lines.push(`address: ${frontmatter.address}`);
		}

		if (frontmatter.isClosed !== undefined) {
			lines.push(`isClosed: ${frontmatter.isClosed}`);
		}

		if (frontmatter.location) {
			lines.push(`location: [${frontmatter.location[0]}, ${frontmatter.location[1]}]`);
		}

		lines.push('---');

		return lines.join('\n');
	}

	private stripExistingFrontmatter(content: string): string {
		const frontmatterRegex = /^---\n[\s\S]*?\n---\n/;
		return content.replace(frontmatterRegex, '').trim();
	}
}

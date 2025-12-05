import { App, Notice, TFile, TFolder, normalizePath, requestUrl } from 'obsidian';
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

		const uniqueFilePath = this.getUniqueFilePath(filePath);

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

	private getUniqueFilePath(filePath: string): string {
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
		if (templateContent) {
			const { frontmatter: templateFrontmatter, body: templateBody } = this.parseTemplate(templateContent);
			const mergedFrontmatter = { ...templateFrontmatter, ...frontmatter };
			const frontmatterStr = this.formatFrontmatter(mergedFrontmatter);
			return `${frontmatterStr}\n${templateBody}`;
		}

		const frontmatterStr = this.formatFrontmatter(frontmatter);
		return `${frontmatterStr}\n# ${placeName}\n\n`;
	}

	private formatFrontmatter(frontmatter: Record<string, unknown>): string {
		const lines = ['---'];

		// Iterate through all frontmatter fields
		for (const [key, value] of Object.entries(frontmatter)) {
			if (value === undefined || value === null) continue;

			// Special handling for location (array with single string)
			if (key === 'location' && Array.isArray(value) && value.length > 0) {
				lines.push(`location:`);
				lines.push(`  - ${value[0]}`);
			}
			// Handle arrays (except location which is handled above)
			else if (Array.isArray(value)) {
				if (value.length > 0) {
					if (key === 'cuisine') {
						// Cuisine should be inline array format
						lines.push(`cuisine: [${value.join(', ')}]`);
					} else {
						// Other arrays use list format
						lines.push(`${key}:`);
						for (const item of value) {
							lines.push(`  - ${item}`);
						}
					}
				} else {
					// Empty array
					lines.push(`${key}:`);
				}
			}
			// Handle regular values (including empty strings)
			else if (!Array.isArray(value)) {
				// Convert value to string, handling objects with JSON.stringify
				const stringValue = typeof value === 'object' && value !== null
					? JSON.stringify(value)
					: String(value);
				lines.push(`${key}: ${stringValue}`);
			}
		}

		lines.push('---');

		return lines.join('\n');
	}

	private parseTemplate(content: string): { frontmatter: Record<string, unknown>; body: string } {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
		const match = content.match(frontmatterRegex);

		if (!match) {
			return { frontmatter: {}, body: content.trim() };
		}

		const frontmatterText = match[1];
		const body = match[2].trim();

		// Parse YAML frontmatter (simple key-value parser)
		const frontmatter: Record<string, unknown> = {};
		const lines = frontmatterText.split('\n');
		let currentKey = '';
		let inArray = false;

		for (const line of lines) {
			const trimmedLine = line.trim();

			if (!trimmedLine) continue;

			// Handle array items
			if (trimmedLine.startsWith('- ')) {
				if (inArray && currentKey) {
					if (!Array.isArray(frontmatter[currentKey])) {
						frontmatter[currentKey] = [];
					}
					(frontmatter[currentKey] as string[]).push(trimmedLine.substring(2));
				}
				continue;
			}

			// Handle key-value pairs
			const colonIndex = trimmedLine.indexOf(':');
			if (colonIndex > 0) {
				currentKey = trimmedLine.substring(0, colonIndex).trim();
				const value = trimmedLine.substring(colonIndex + 1).trim();

				if (value === '') {
					// Empty value - preserve it as empty string (might be followed by array)
					inArray = true;
					frontmatter[currentKey] = '';
				} else {
					inArray = false;
					frontmatter[currentKey] = value;
				}
			}
		}

		// Convert empty strings that were followed by array items back to arrays
		for (const key in frontmatter) {
			if (frontmatter[key] === '' && lines.some(line => line.trim().startsWith('- ') && lines.indexOf(line) > lines.findIndex(l => l.includes(`${key}:`)))) {
				frontmatter[key] = [];
			}
		}

		return { frontmatter, body };
	}

	async downloadAndSaveImage(photoUrl: string, placeName: string): Promise<string | null> {
		try {
			// Ensure image folder exists
			await this.ensureFolderExists(this.settings.imageFolder);

			// Fetch the image
			const response = await requestUrl({
				url: photoUrl,
				method: 'GET'
			});
			if (response.status >= 400) {
				throw new Error(`Failed to fetch image: ${response.status}`);
			}

			// Get image data as array buffer
			const imageData = response.arrayBuffer;

			// Generate unique filename
			const sanitizedName = this.sanitizeImageFilename(placeName);
			const contentType = response.headers['content-type'] || 'image/jpeg';
			const extension = this.getImageExtension(contentType);
			const baseFilename = `${sanitizedName}.${extension}`;
			const imagePath = normalizePath(`${this.settings.imageFolder}/${baseFilename}`);
			const uniqueImagePath = await this.getUniqueImagePath(imagePath);

			// Save image to vault
			await this.app.vault.createBinary(uniqueImagePath, imageData);

			// Return the wiki-link format for Obsidian
			return uniqueImagePath;
		} catch (error) {
			new Notice(`Failed to download image: ${error.message}`);
			return null;
		}
	}

	private sanitizeImageFilename(name: string): string {
		// Remove invalid characters and convert to lowercase
		return name
			.toLowerCase()
			.replace(/[\\/:*?"<>|]/g, '-')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.substring(0, 50); // Limit length
	}

	private getImageExtension(contentType: string): string {
		const typeMap: { [key: string]: string } = {
			'image/jpeg': 'jpg',
			'image/jpg': 'jpg',
			'image/png': 'png',
			'image/gif': 'gif',
			'image/webp': 'webp'
		};
		return typeMap[contentType.toLowerCase()] || 'jpg';
	}

	private async getUniqueImagePath(imagePath: string): Promise<string> {
		let uniquePath = imagePath;
		let counter = 1;

		while (await this.app.vault.adapter.exists(uniquePath)) {
			const pathWithoutExt = imagePath.replace(/\.[^.]+$/, '');
			const extension = imagePath.split('.').pop();
			uniquePath = `${pathWithoutExt}-${counter}.${extension}`;
			counter++;
		}

		return uniquePath;
	}
}

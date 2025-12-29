// We cannot import TFile and TFolder as they are only type definitions
// Create our own classes that will be used for instanceof checks
export class TFile {
	path!: string;
	basename!: string;
	extension!: string;
	name!: string;
	vault!: any;
	parent!: any;
	stat!: any;
}

export class TFolder {
	path!: string;
	name!: string;
	parent!: any;
	vault!: any;
}

/**
 * Mock implementation of Obsidian's Vault API for testing
 */
export class MockVault {
	private files: Map<string, string> = new Map();
	private folders: Set<string> = new Set();

	async create(path: string, content: string): Promise<TFile> {
		this.files.set(path, content);
		const file = {
			path,
			basename: path.split('/').pop()?.replace('.md', '') || '',
			extension: 'md',
			name: path.split('/').pop() || '',
			vault: this as any,
			parent: null,
			stat: { ctime: Date.now(), mtime: Date.now(), size: content.length }
		} as TFile;
		return file;
	}

	async read(file: TFile): Promise<string> {
		return this.files.get(file.path) || '';
	}

	async modify(file: TFile, content: string): Promise<void> {
		this.files.set(file.path, content);
	}

	async createFolder(path: string): Promise<TFolder> {
		this.folders.add(path);
		const folder = {
			path,
			name: path.split('/').pop() || '',
			parent: null,
			isRoot: () => false,
			vault: this as any
		} as TFolder;
		return folder;
	}

	async createBinary(path: string, data: ArrayBuffer): Promise<TFile> {
		this.files.set(path, '[BINARY DATA]');
		const file = {
			path,
			basename: path.split('/').pop()?.replace(/\.[^.]+$/, '') || '',
			extension: path.split('.').pop() || '',
			name: path.split('/').pop() || '',
			vault: this as any,
			parent: null,
			stat: { ctime: Date.now(), mtime: Date.now(), size: data.byteLength }
		} as TFile;
		return file;
	}

	getAbstractFileByPath(path: string): any | null {
		// Check if it's a folder
		if (this.folders.has(path)) {
			// Create a mock TFolder with the right constructor name
			class MockTFolder {}
			const folder = new MockTFolder();
			Object.assign(folder, {
				path,
				name: path.split('/').pop() || '',
				parent: null,
				vault: this as any
			});
			// Make it pass instanceof TFolder check
			Object.setPrototypeOf(folder, TFolder.prototype);
			return folder;
		}

		// Check if it's a file
		if (this.files.has(path)) {
			// Create a mock TFile with the right constructor name
			class MockTFile {}
			const file = new MockTFile();
			Object.assign(file, {
				path,
				basename: path.split('/').pop()?.replace('.md', '') || '',
				extension: 'md',
				name: path.split('/').pop() || '',
				vault: this as any,
				parent: null,
				stat: { ctime: Date.now(), mtime: Date.now(), size: 0 }
			});
			// Make it pass instanceof TFile check
			Object.setPrototypeOf(file, TFile.prototype);
			return file;
		}
		return null;
	}

	getMarkdownFiles(): TFile[] {
		const files: TFile[] = [];
		for (const [path, content] of this.files.entries()) {
			if (path.endsWith('.md')) {
				files.push({
					path,
					basename: path.split('/').pop()?.replace('.md', '') || '',
					extension: 'md',
					name: path.split('/').pop() || '',
					vault: this as any,
					parent: null,
					stat: { ctime: Date.now(), mtime: Date.now(), size: content.length }
				} as TFile);
			}
		}
		return files;
	}

	// Helper methods for testing
	clear(): void {
		this.files.clear();
		this.folders.clear();
	}

	getFileContent(path: string): string | undefined {
		return this.files.get(path);
	}

	hasFile(path: string): boolean {
		return this.files.has(path);
	}

	hasFolder(path: string): boolean {
		return this.folders.has(path);
	}
}

/**
 * Mock implementation of Obsidian's Workspace
 */
export class MockWorkspace {
	private activeFile: TFile | null = null;

	getActiveFile(): TFile | null {
		return this.activeFile;
	}

	setActiveFile(file: TFile | null): void {
		this.activeFile = file;
	}
}

/**
 * Mock implementation of Obsidian's App
 */
export class MockApp {
	vault: MockVault;
	workspace: MockWorkspace;

	constructor() {
		this.vault = new MockVault();
		this.workspace = new MockWorkspace();
	}
}

/**
 * Mock Notice class
 */
export class Notice {
	constructor(public message: string) {
		// In tests, we just track that notices were called
	}
}

/**
 * Mock requestUrl function
 */
export const requestUrl = async (request: any): Promise<any> => {
	// This will be mocked in individual tests
	throw new Error('requestUrl should be mocked in tests');
};

/**
 * Mock normalizePath function
 */
export const normalizePath = (path: string): string => {
	// Simple implementation: replace backslashes with forward slashes
	return path.replace(/\\/g, '/');
};

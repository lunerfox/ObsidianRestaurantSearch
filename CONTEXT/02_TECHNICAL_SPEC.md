# Technical Specification

**Project:** Google Places to Obsidian Plugin

**Date:** December 2, 2025

---

## Technology Stack

**Build Tool:** esbuild
- Fast TypeScript compilation
- Watch mode for development
- Simple configuration

**Language:** TypeScript
- Type safety for Obsidian API
- Better IDE support in VSCode

**Development Environment:** 
- VSCode on Windows
- Standard Obsidian plugin structure

**HTTP Client:** Native fetch API (no extra dependencies)

---

## Project Structure

```
google-places-plugin/
├── src/
│   ├── main.ts              # Plugin entry point, registers commands
│   ├── settings.ts          # Settings tab & configuration management
│   ├── modal.ts             # Search modal UI
│   ├── services/
│   │   ├── googlePlaces.ts  # Google Places API integration
│   │   ├── noteCreator.ts   # File creation and template handling
│   │   └── dataMapper.ts    # Maps API data to frontmatter fields
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces and types
│   └── __tests__/
│       ├── dataMapper.test.ts
│       └── noteCreator.test.ts
├── manifest.json            # Plugin metadata
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── esbuild.config.mjs       # Build configuration
└── styles.css               # Plugin styles
```

---

## Component Responsibilities

### main.ts
- Initialize plugin on load
- Register command: "Search and add place from Google Places"
- Load/save plugin settings from disk
- Create settings tab
- Provide settings to other components

### settings.ts
- Define `GooglePlacesSettings` interface
- Define default settings values
- Implement `SettingsTab` class
  - Render settings UI with autocomplete
  - Validate user inputs
  - Save settings changes

### modal.ts
- Display search modal with input field
- Call `googlePlaces.ts` service for text search
- Display search results list (name + address)
- Handle user selection
- Pass selected place_id to `noteCreator.ts`
- Display error messages inline

### services/googlePlaces.ts
- Text search: Query places by name/location
- Place details: Fetch full place information by place_id
- Construct API requests with proper headers and field masks
- Handle API errors (throw custom error types)
- Return typed responses

### services/noteCreator.ts
- Receive place_id from modal
- Fetch full place details via googlePlaces service
- Convert place data to frontmatter via dataMapper
- Read template file (if configured)
- Merge frontmatter with template
- Generate filename with variable replacement
- Handle filename collisions (add numeric suffix)
- Create note file
- Open note in active editor

### services/dataMapper.ts
- Transform Google Places API response to frontmatter format
- Map cuisine types to readable names
- Extract city from address components
- Format location as [lat, lng] array
- Determine isClosed status
- Construct image and Google Maps URLs
- Return `PlaceFrontmatter` object

---

## Data Flow

### Search Flow
1. User opens Command Palette → selects "Search and add place from Google Places"
2. `modal.ts` displays search dialog
3. User types search query → `modal.ts` calls `googlePlaces.searchText()`
4. `googlePlaces.ts` calls Google Places Text Search API
5. API returns results → `modal.ts` displays list (name + address)
6. User selects place → `modal.ts` passes place_id to `noteCreator.ts`

### Note Creation Flow
1. `noteCreator.ts` receives place_id
2. Calls `googlePlaces.getPlaceDetails(place_id)`
3. `googlePlaces.ts` fetches full place data from API
4. `noteCreator.ts` calls `dataMapper.transformToFrontmatter(placeData)`
5. `dataMapper.ts` returns formatted frontmatter object
6. `noteCreator.ts` reads template file (if configured)
7. Merges frontmatter with template content
8. Generates unique filename
9. Creates note file via Obsidian API
10. Opens note in active editor

---

## TypeScript Interfaces

```typescript
// Plugin Configuration
interface GooglePlacesSettings {
    apiKey: string;              // User's Google Places API key
    templatePath: string;        // Path to template file (optional)
    targetFolder: string;        // Folder for new notes (optional)
    filenameFormat: string;      // Pattern: {name}, {city} (optional)
}

const DEFAULT_SETTINGS: GooglePlacesSettings = {
    apiKey: '',
    templatePath: '',
    targetFolder: '',
    filenameFormat: '{name}'
};

// Google Places API Responses
interface PlaceSearchResult {
    place_id: string;
    displayName: {
        text: string;
    };
    formattedAddress: string;
}

interface AddressComponent {
    longText: string;
    shortText: string;
    types: string[];
}

interface Photo {
    name: string;
    widthPx: number;
    heightPx: number;
}

interface PlaceDetails {
    id: string;
    displayName: {
        text: string;
    };
    formattedAddress: string;
    addressComponents: AddressComponent[];
    types: string[];
    rating?: number;
    photos?: Photo[];
    businessStatus?: string;
    location: {
        latitude: number;
        longitude: number;
    };
}

// Output Data Structure
interface PlaceFrontmatter {
    cuisine: string[];
    city: string;
    'rating-google'?: number;
    link: string;
    image: string;
    address: string;
    isClosed: boolean;
    location: [number, number];
}

// Custom Error Types
class APIKeyError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'APIKeyError';
    }
}

class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}

class TemplateNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TemplateNotFoundError';
    }
}

class NoResultsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NoResultsError';
    }
}
```

---

## Google Places API Integration

### API Endpoints

**Text Search:**
```
POST https://places.googleapis.com/v1/places:searchText
```

**Place Details:**
```
GET https://places.googleapis.com/v1/places/{place_id}
```

### Request Headers

```typescript
headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': settings.apiKey,
    'X-Goog-FieldMask': '...' // Field-specific mask
}
```

### Field Masks

**Text Search:**
```
places.id,places.displayName,places.formattedAddress
```

**Place Details:**
```
id,displayName,formattedAddress,addressComponents,types,rating,photos,businessStatus,location
```

### Error Handling

- **401/403** → throw `APIKeyError("Invalid or missing API key")`
- **429** → throw `RateLimitError("API rate limit exceeded")`
- **Network errors** → throw generic `Error("Network request failed")`
- **Empty results** → throw `NoResultsError("No places found")`

### API Usage

```typescript
// Text Search
async searchText(query: string): Promise<PlaceSearchResult[]> {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
        },
        body: JSON.stringify({ textQuery: query })
    });
    
    // Handle errors, parse response
    // Return array of PlaceSearchResult
}

// Place Details
async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,...'
        }
    });
    
    // Handle errors, parse response
    // Return PlaceDetails object
}
```

---

## Data Mapping Logic

### dataMapper.ts Transformations

**Cuisine Mapping:**
- Filter `types[]` array for food-related terms
- Known food types: `restaurant`, `cafe`, `bar`, `bakery`, `meal_takeaway`, `meal_delivery`
- Transform type names to readable format:
  - `italian_restaurant` → `Italian`
  - `cafe` → `Cafe`
  - `sushi_restaurant` → `Japanese`
  - etc.
- Return as string array
- Return empty array `[]` if no food types found

**City Extraction:**
- Parse `addressComponents[]` array
- Find component where `types` includes `locality` or `administrative_area_level_3`
- Return `longText` value
- Return empty string if not found

**Image URL Construction:**
- Take first photo from `photos[]` array
- Construct URL: `https://places.googleapis.com/v1/{photo.name}/media?key={apiKey}&maxHeightPx=800`
- Return template's placeholder image URL if no photos available

**Location Array:**
- Extract `location.latitude` and `location.longitude`
- Format as `[latitude, longitude]`
- Return as tuple

**isClosed Determination:**
- Check if `businessStatus === "CLOSED_PERMANENTLY"`
- Return `true` if permanently closed, `false` otherwise

**Google Maps Link:**
- Construct: `https://www.google.com/maps/place/?q=place_id:{place_id}`

**Rating:**
- Use `rating` field directly (1-5 scale)
- Optional field (may be undefined)

---

## Note Creation & Template Handling

### Template Processing

**If template path is configured:**
1. Check if file exists using `vault.adapter.exists()`
2. If not found, throw `TemplateNotFoundError`
3. Read template file: `await vault.read(templateFile)`
4. Parse frontmatter from template (using js-yaml or regex)
5. Merge our frontmatter fields with template frontmatter
   - Our fields overwrite template fields with same name
   - Template fields we don't populate remain unchanged
6. Reconstruct note: frontmatter + template body

**If no template:**
1. Create note with only our frontmatter fields
2. Empty body content

### Frontmatter Merging

```typescript
// Example merge logic
const templateFrontmatter = parseYaml(templateContent);
const ourFrontmatter = dataMapper.transformToFrontmatter(placeData);

const mergedFrontmatter = {
    ...templateFrontmatter,  // Start with template
    ...ourFrontmatter        // Overwrite with our data
};
```

### Filename Generation

1. Get `filenameFormat` from settings (e.g., `"{city} - {name}"`)
2. Replace variables:
   - `{name}` → place name
   - `{city}` → extracted city
3. Sanitize filename:
   - Remove invalid characters: `/\:*?"<>|`
   - Trim whitespace
4. Add `.md` extension

**Example:**
```typescript
// Format: "{city} - {name}"
// Place: "Joe's Pizza" in "Los Angeles"
// Result: "Los Angeles - Joe's Pizza.md"
```

### File Collision Handling

1. Construct target path: `{targetFolder}/{filename}.md`
2. Check if file exists: `vault.getAbstractFileByPath(path)`
3. If exists, append numeric suffix:
   - `Name.md` → `Name-1.md`
   - If `Name-1.md` exists → `Name-2.md`
   - Increment until unique filename found
4. Create file with unique name

### File Creation & Opening

```typescript
// Create file
const file = await vault.create(fullPath, noteContent);

// Open in active editor
const leaf = workspace.getLeaf();
await leaf.openFile(file);
```

---

## Settings UI Implementation

### Settings Tab Components

**1. Google Places API Key** (required)
```typescript
new Setting(containerEl)
    .setName('Google Places API Key')
    .setDesc('Get your API key at: https://console.cloud.google.com')
    .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
        }));
```

**2. Template File Path** (optional with autocomplete)
```typescript
new Setting(containerEl)
    .setName('Template File Path')
    .setDesc('Leave empty to create notes with frontmatter only')
    .addText(text => {
        // Implement file suggester for autocomplete
        new FileSuggest(text.inputEl, this.app);
        text
            .setPlaceholder('Templates/restaurant-snippet.md')
            .setValue(this.plugin.settings.templatePath)
            .onChange(async (value) => {
                this.plugin.settings.templatePath = value;
                await this.plugin.saveSettings();
            });
    });
```

**3. Target Folder** (optional with autocomplete)
```typescript
new Setting(containerEl)
    .setName('Target Folder')
    .setDesc('Leave empty to use vault root')
    .addText(text => {
        // Implement folder suggester for autocomplete
        new FolderSuggest(text.inputEl, this.app);
        text
            .setPlaceholder('Restaurants/')
            .setValue(this.plugin.settings.targetFolder)
            .onChange(async (value) => {
                this.plugin.settings.targetFolder = value;
                await this.plugin.saveSettings();
            });
    });
```

**4. Filename Format** (optional)
```typescript
new Setting(containerEl)
    .setName('Filename Format')
    .setDesc('Variables: {name}, {city} | Example: {city} - {name}')
    .addText(text => text
        .setPlaceholder('{name}')
        .setValue(this.plugin.settings.filenameFormat)
        .onChange(async (value) => {
            this.plugin.settings.filenameFormat = value;
            await this.plugin.saveSettings();
        }));
```

### Autocomplete Implementation

**File Suggester:**
```typescript
class FileSuggest extends TextInputSuggest<TFile> {
    getSuggestions(inputStr: string): TFile[] {
        const files = this.app.vault.getMarkdownFiles();
        return files.filter(file => 
            file.path.toLowerCase().contains(inputStr.toLowerCase())
        );
    }
    
    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.setText(file.path);
    }
    
    selectSuggestion(file: TFile): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger("input");
        this.close();
    }
}
```

**Folder Suggester:**
```typescript
class FolderSuggest extends TextInputSuggest<TFolder> {
    getSuggestions(inputStr: string): TFolder[] {
        const folders = this.app.vault.getAllFolders();
        return folders.filter(folder => 
            folder.path.toLowerCase().contains(inputStr.toLowerCase())
        );
    }
    
    renderSuggestion(folder: TFolder, el: HTMLElement): void {
        el.setText(folder.path);
    }
    
    selectSuggestion(folder: TFolder): void {
        this.inputEl.value = folder.path;
        this.inputEl.trigger("input");
        this.close();
    }
}
```

### Settings Validation

**On Save:**
- **API Key:** Check not empty (required field)
- **Template Path:** If provided, verify file exists
- **Target Folder:** If provided, verify folder exists (or create it automatically?)
- **Filename Format:** Validate it contains at least one variable or plain text

---

## Error Handling Strategy

### Error Types & Locations

**googlePlaces.ts throws:**
- `APIKeyError` - Invalid or missing API key (401/403)
- `RateLimitError` - API quota exceeded (429)
- `NoResultsError` - Search returned no results
- Generic `Error` - Network failures

**noteCreator.ts throws:**
- `TemplateNotFoundError` - Template file not found

**modal.ts catches and displays:**
- All errors from services
- Shows user-friendly messages in modal UI
- Allows user to retry or cancel

### Error Display

**In Modal (inline):**
```typescript
try {
    const results = await googlePlaces.searchText(query);
    // Display results
} catch (error) {
    if (error instanceof APIKeyError) {
        this.showError('Invalid API key. Please check settings.');
    } else if (error instanceof NoResultsError) {
        this.showError('No places found. Try a different search.');
    } else if (error instanceof RateLimitError) {
        this.showError('API limit reached. Please try again later.');
    } else {
        this.showError('Search failed. Please try again.');
    }
}
```

**For File Creation (Obsidian Notice):**
```typescript
try {
    await noteCreator.createNote(placeId);
} catch (error) {
    if (error instanceof TemplateNotFoundError) {
        new Notice('Template file not found. Check plugin settings.');
    } else {
        new Notice('Failed to create note. Please try again.');
    }
}
```

---

## Testing Strategy

### Basic Unit Tests

**Test Files:**
- `src/__tests__/dataMapper.test.ts`
- `src/__tests__/noteCreator.test.ts`

**dataMapper.ts Tests:**
```typescript
describe('dataMapper', () => {
    test('filters and transforms cuisine types', () => {
        const types = ['restaurant', 'italian_restaurant', 'point_of_interest'];
        const result = extractCuisine(types);
        expect(result).toEqual(['Italian']);
    });
    
    test('extracts city from address components', () => {
        const components = [
            { types: ['locality'], longText: 'Los Angeles' },
            { types: ['administrative_area_level_1'], longText: 'CA' }
        ];
        const result = extractCity(components);
        expect(result).toBe('Los Angeles');
    });
    
    test('formats location as array', () => {
        const location = { latitude: 34.0522, longitude: -118.2437 };
        const result = formatLocation(location);
        expect(result).toEqual([34.0522, -118.2437]);
    });
    
    test('determines isClosed correctly', () => {
        expect(determineIsClosed('CLOSED_PERMANENTLY')).toBe(true);
        expect(determineIsClosed('OPERATIONAL')).toBe(false);
    });
    
    test('constructs image URL correctly', () => {
        const photo = { name: 'places/abc/photos/xyz' };
        const apiKey = 'test-key';
        const result = constructImageUrl(photo, apiKey);
        expect(result).toContain('maxHeightPx=800');
    });
});
```

**noteCreator.ts Tests:**
```typescript
describe('filename generation', () => {
    test('replaces variables in format', () => {
        const format = '{city} - {name}';
        const data = { city: 'Los Angeles', name: "Joe's Pizza" };
        const result = generateFilename(format, data);
        expect(result).toBe("Los Angeles - Joe's Pizza.md");
    });
    
    test('sanitizes invalid characters', () => {
        const filename = 'Test/File:Name*.md';
        const result = sanitizeFilename(filename);
        expect(result).toBe('TestFileName.md');
    });
    
    test('handles filename collisions', () => {
        const existingFiles = ['Name.md', 'Name-1.md'];
        const result = getUniqueFilename('Name.md', existingFiles);
        expect(result).toBe('Name-2.md');
    });
});
```

**Testing Tools:**
- Vitest (lightweight, fast)
- Test files use `.test.ts` extension
- Run with `npm run test`

### Manual Testing

**Integration Testing:**
- Test in development vault with real Google Places API
- Verify all user flows:
  - Search → Select → Create note
  - Template merging works correctly
  - Settings save and load properly
  - Error messages display correctly
  - File collisions handled
  - Notes open in editor

**Test Cases:**
- Search with results
- Search with no results
- Invalid API key
- Missing template file
- Create note without template
- Create note with template
- Filename collision
- Special characters in place names

---

## Dependencies

### Required Dependencies

```json
{
  "dependencies": {
    "obsidian": "latest",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "esbuild": "^0.19.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.10.0",
    "@types/js-yaml": "^4.0.9"
  }
}
```

### Why Each Dependency?

- **obsidian** - Core plugin API
- **js-yaml** - Parse/stringify frontmatter YAML
- **typescript** - Type safety and compilation
- **esbuild** - Fast build tool
- **vitest** - Unit testing framework
- **@types/node** - Node.js type definitions
- **@types/js-yaml** - Type definitions for js-yaml

---

## Build Configuration

### package.json Scripts

```json
{
  "scripts": {
    "dev": "node esbuild.config.mjs --watch",
    "build": "node esbuild.config.mjs",
    "test": "vitest",
    "version": "node version-bump.mjs"
  }
}
```

### esbuild.config.mjs

```javascript
import esbuild from 'esbuild';
import process from 'process';

const prod = (process.argv[2] === 'production');
const watch = process.argv.includes('--watch');

const context = await esbuild.context({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external: ['obsidian'],
    format: 'cjs',
    target: 'es2018',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    outfile: 'main.js',
});

if (watch) {
    await context.watch();
} else {
    await context.rebuild();
    await context.dispose();
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2018",
    "module": "ESNext",
    "lib": ["ES2018", "DOM"],
    "moduleResolution": "Node",
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

### manifest.json

```json
{
  "id": "google-places-obsidian",
  "name": "Google Places",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "Import place information from Google Places into Obsidian notes",
  "author": "Your Name",
  "authorUrl": "https://yourwebsite.com",
  "isDesktopOnly": false
}
```

---

## Development Workflow

### Setup

1. **Clone/create plugin directory**
2. **Install dependencies:** `npm install`
3. **Create development vault** (separate from plugin directory)
4. **Link plugin to dev vault:**
   - Create symlink from `dev-vault/.obsidian/plugins/google-places-plugin/` to plugin build directory
   - Or copy `main.js` and `manifest.json` to vault plugins folder after each build

### Development Loop

1. **Start watch mode:** `npm run dev`
2. **Make code changes** in VSCode
3. **esbuild automatically rebuilds** on save
4. **Reload plugin in Obsidian:** Ctrl+R (or disable/enable in settings)
5. **Test changes** in development vault
6. **Iterate**

### Testing Workflow

1. **Run unit tests:** `npm run test`
2. **Manual integration tests** in dev vault
3. **Verify all error cases**
4. **Test with real Google Places API**

---

## Next Steps

After completing Phase 2 Technical Specification:

1. **Phase 3:** Create Implementation Tasks
   - Break down into discrete tasks for Claude Code
   - Define task dependencies
   - Create verification criteria for each task

2. **Generate Claude Code Prompts**
   - Create detailed prompts for each task
   - Include context from planning docs
   - Specify test commands and success criteria

3. **Execute & Verify**
   - Build tasks incrementally
   - Verify each task before proceeding
   - Update registries as work progresses

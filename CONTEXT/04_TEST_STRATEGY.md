# Test Strategy for Google Places Search Plugin

## Overview

This document outlines the testing strategy for the Obsidian Google Places Search plugin. The strategy focuses on ensuring reliability, correctness, and maintainability through a layered testing approach.

## Testing Philosophy

1. **Test the behavior, not the implementation** - Focus on what each component does, not how it does it
2. **Isolate dependencies** - Use mocks for external APIs and Obsidian APIs
3. **Test edge cases thoroughly** - Handle malformed data, API failures, and user errors
4. **Fast feedback** - Unit tests should run quickly; integration tests can be slower
5. **Maintainable** - Tests should be easy to understand and update

## Test Pyramid

```
        ┌────────────────┐
        │   E2E Tests    │  < 5% (Manual testing in Obsidian)
        │   (Manual)     │
        ├────────────────┤
        │  Integration   │  ~20% (Component interactions)
        │     Tests      │
        ├────────────────┤
        │   Unit Tests   │  ~75% (Individual functions/methods)
        └────────────────┘
```

---

## 1. Unit Tests (Priority: HIGH)

### 1.1 GooglePlacesService (`services/googlePlaces.spec.ts`)

**Purpose**: Verify API integration and error handling

**Test Cases**:

#### `searchPlaces(query: string)`
- ✓ Returns array of PlaceSearchResult for valid query
- ✓ Returns empty array when no results found
- ✓ Throws error with Notice when API key is invalid (403)
- ✓ Throws error with Notice when rate limited (429)
- ✓ Throws error with Notice on network failure
- ✓ Throws error with Notice on 4xx/5xx responses
- ✓ Properly formats API request (correct headers, body, endpoint)
- ✓ Transforms API response to PlaceSearchResult format

#### `getPlaceDetails(placeId: string)`
- ✓ Returns PlaceDetails for valid place ID
- ✓ Handles missing optional fields (phone, photos, etc.)
- ✓ Throws error with Notice on API errors
- ✓ Properly uses field mask in request
- ✓ Transforms nested API response to flat PlaceDetails

**Mocking Strategy**:
```typescript
// Mock requestUrl to return controlled API responses
const mockRequestUrl = vi.fn();

// Mock Notice to verify user feedback
const mockNotice = vi.fn();
```

---

### 1.2 DataMapper (`services/dataMapper.spec.ts`)

**Purpose**: Verify data transformation from API to frontmatter format

**Test Cases**:

#### `mapPlaceDetailsToFrontmatter(placeDetails: PlaceDetails)`
- ✓ Maps all standard fields correctly (name, address, rating, etc.)
- ✓ Handles missing optional fields gracefully
- ✓ Formats location as array of strings `["lat", "lon"]`
- ✓ Converts phone numbers to correct format
- ✓ Sets isClosed based on businessStatus
- ✓ Generates correct Google Maps link
- ✓ Preserves photo URLs when present
- ✓ Returns empty arrays for missing array fields (not null/undefined)

#### `extractCuisineTypes(types: string[])`
- ✓ Extracts all 21 recognized cuisine types
- ✓ Removes duplicates
- ✓ Handles empty input array
- ✓ Handles null/undefined input
- ✓ Filters out non-cuisine types (e.g., "point_of_interest")
- ✓ Maps API types to user-friendly names (e.g., "american_restaurant" → "American")

**Test all 21 cuisine mappings**:
```typescript
const cuisineTests = [
  { input: 'american_restaurant', expected: 'American' },
  { input: 'italian_restaurant', expected: 'Italian' },
  { input: 'chinese_restaurant', expected: 'Chinese' },
  // ... etc for all 21 types
];
```

#### `extractCity(addressComponents: AddressComponent[])`
- ✓ Extracts city from locality component
- ✓ Falls back to administrative_area_level_3
- ✓ Falls back to administrative_area_level_2
- ✓ Returns empty string when no city found
- ✓ Handles empty/null addressComponents array

#### `formatFilename(format: string, placeName: string, city: string)`
- ✓ Replaces `{name}` token with place name
- ✓ Replaces `{city}` token with city
- ✓ Handles format with both tokens: `{name} - {city}`
- ✓ Handles format with no tokens (literal string)
- ✓ Handles missing city (leaves token or removes it)

#### `sanitizeFilename(filename: string)`
- ✓ Removes invalid characters: `< > : " / \ | ? *`
- ✓ Preserves spaces and hyphens
- ✓ Handles empty string
- ✓ Handles already-sanitized filenames
- ✓ Handles Unicode characters (emojis, accents)

**Mocking Strategy**:
```typescript
// No external dependencies - pure functions
// Use real PlaceDetails objects constructed in tests
```

---

### 1.3 NoteCreator (`services/noteCreator.spec.ts`)

**Purpose**: Verify note creation, template handling, and file operations

**Test Cases**:

#### `createNote(filename: string, frontmatter: NoteFrontmatter, placeName: string)`
- ✓ Creates file with correct path in targetFolder
- ✓ Generates unique filename when collision occurs
- ✓ Creates folder if targetFolder doesn't exist
- ✓ Formats frontmatter correctly as YAML
- ✓ Includes template content when template exists
- ✓ Creates basic note when no template specified
- ✓ Merges template frontmatter with new frontmatter
- ✓ Returns created TFile object

#### `formatFrontmatter(frontmatter: NoteFrontmatter)`
- ✓ Outputs valid YAML with `---` delimiters
- ✓ Handles string values correctly
- ✓ Handles number values correctly
- ✓ Handles boolean values correctly
- ✓ Handles arrays as YAML lists (cuisine)
- ✓ Handles location array specially: `["lat", "lon"]` → YAML list
- ✓ Skips undefined/null values
- ✓ Properly quotes strings with special characters
- ✓ Handles empty arrays

#### `parseTemplate(content: string)`
- ✓ Extracts frontmatter from template with `---` delimiters
- ✓ Returns empty object when no frontmatter present
- ✓ Parses YAML frontmatter into object
- ✓ Returns template body separately
- ✓ Handles template with only frontmatter (no body)
- ✓ Handles template with only body (no frontmatter)
- ✓ Handles malformed YAML gracefully

#### `buildNoteContent(frontmatter: NoteFrontmatter, templateContent: string, placeName: string)`
- ✓ Merges template frontmatter with new frontmatter
- ✓ New frontmatter overwrites template fields
- ✓ Template-only fields are preserved
- ✓ Returns formatted content with frontmatter + body
- ✓ Handles empty template content

#### `downloadAndSaveImage(photoUrl: string, placeName: string)`
- ✓ Downloads image from URL using requestUrl
- ✓ Saves binary data to imageFolder
- ✓ Creates imageFolder if it doesn't exist
- ✓ Generates unique image filename from place name
- ✓ Handles download failures gracefully (logs, doesn't throw)
- ✓ Returns path to saved image
- ✓ Handles various image formats (jpg, png, webp)

#### `getUniqueFilePath(folder: string, filename: string)`
- ✓ Returns original path if no collision
- ✓ Appends ` 1` for first collision
- ✓ Increments counter for multiple collisions (` 2`, ` 3`, etc.)
- ✓ Handles folder with trailing slash
- ✓ Handles empty folder (root)

**Mocking Strategy**:
```typescript
// Mock Obsidian Vault API
const mockVault = {
  create: vi.fn(),
  read: vi.fn(),
  modify: vi.fn(),
  createFolder: vi.fn(),
  createBinary: vi.fn(),
  getAbstractFileByPath: vi.fn()
};

// Mock requestUrl for image downloads
const mockRequestUrl = vi.fn();
```

---

### 1.4 BatchUpdateService (`services/batchUpdateService.spec.ts`)

**Purpose**: Verify batch processing logic, file filtering, and cancellation

**Test Cases**:

#### `findFiles(searchQuery: string)`
- ✓ Returns all markdown files in vault when query is empty
- ✓ Filters files by folder path when query provided
- ✓ Returns empty array when no files match
- ✓ Handles nested folders correctly
- ✓ Excludes non-markdown files

#### `filterFilesNeedingUpdate(files: TFile[])`
- ✓ Includes files with no frontmatter
- ✓ Includes files with frontmatter but no address/location
- ✓ Excludes files with both address and location
- ✓ Excludes files with location but no address (already complete)
- ✓ Handles files with malformed frontmatter
- ✓ Handles files with empty frontmatter

#### `processBatch(filesToProcess: TFile[], callbacks: BatchCallbacks)`
- ✓ Processes all files in sequence
- ✓ Calls onProgress callback with correct file/count
- ✓ Respects rate limit delay between files
- ✓ Stops processing when cancelled
- ✓ Handles API errors per file (continues to next file)
- ✓ Calls onNeedSelection when multiple results found
- ✓ Auto-selects when single result and autoSelect enabled
- ✓ Skips file when no results found
- ✓ Returns summary with updated/skipped/errored counts

#### `updateFile(file: TFile, placeDetails: PlaceDetails)`
- ✓ Reads existing file content
- ✓ Parses existing frontmatter
- ✓ Adds new fields without overwriting existing
- ✓ Never overwrites existing address/location
- ✓ Preserves all existing frontmatter fields
- ✓ Writes updated content back to file
- ✓ Maintains non-frontmatter content unchanged

#### `parseFrontmatter(content: string)`
- ✓ Extracts frontmatter from markdown content
- ✓ Returns parsed object
- ✓ Returns empty object when no frontmatter
- ✓ Handles malformed YAML gracefully
- ✓ Preserves property types (strings, numbers, arrays)

#### `buildFrontmatter(frontmatter: Record<string, unknown>)`
- ✓ Converts object to YAML string
- ✓ Includes `---` delimiters
- ✓ Handles nested objects (though not used currently)
- ✓ Handles arrays correctly
- ✓ Handles special characters in values

#### Cancellation
- ✓ `cancel()` sets cancellation flag
- ✓ `isCancelled()` returns cancellation state
- ✓ `resetCancellation()` clears flag
- ✓ Processing loop checks cancellation and breaks

**Mocking Strategy**:
```typescript
// Mock GooglePlacesService
const mockGooglePlacesService = {
  searchPlaces: vi.fn(),
  getPlaceDetails: vi.fn()
};

// Mock DataMapper
const mockDataMapper = {
  mapPlaceDetailsToFrontmatter: vi.fn()
};

// Mock Vault API
const mockVault = {
  getMarkdownFiles: vi.fn(),
  read: vi.fn(),
  modify: vi.fn()
};

// Mock callbacks
const mockCallbacks = {
  onProgress: vi.fn(),
  onNeedSelection: vi.fn()
};

// Mock setTimeout for rate limiting
vi.useFakeTimers();
```

---

## 2. Integration Tests (Priority: MEDIUM)

### 2.1 End-to-End Workflows

**Purpose**: Verify complete user flows with multiple components interacting

**Test Cases**:

#### Search → Create Note Flow
```typescript
describe('Search and Create Note', () => {
  it('should search, select place, and create note with frontmatter', async () => {
    // 1. Search for place
    const results = await googlePlacesService.searchPlaces('Pizza Hut Los Angeles');
    expect(results).toHaveLength(greaterThan(0));

    // 2. Get details for first result
    const details = await googlePlacesService.getPlaceDetails(results[0].id);

    // 3. Map to frontmatter
    const frontmatter = dataMapper.mapPlaceDetailsToFrontmatter(details);
    expect(frontmatter.name).toBe('Pizza Hut');
    expect(frontmatter.city).toBe('Los Angeles');

    // 4. Create note
    const filename = dataMapper.formatFilename('{name} - {city}', details.name, frontmatter.city);
    const file = await noteCreator.createNote(filename, frontmatter, details.name);

    // 5. Verify file exists and has correct content
    expect(file).toBeDefined();
    const content = await app.vault.read(file);
    expect(content).toContain('---');
    expect(content).toContain('name: Pizza Hut');
  });
});
```

#### Batch Update Flow
```typescript
describe('Batch Update Files', () => {
  it('should find files, update with geo-data, and preserve existing content', async () => {
    // Setup: Create test files with partial frontmatter
    const testFiles = await createTestFiles([
      { name: 'Restaurant A', frontmatter: { address: '123 Main St' } },
      { name: 'Restaurant B', frontmatter: { address: '456 Oak Ave' } }
    ]);

    // 1. Find files
    const files = await batchUpdateService.findFiles('test-folder');
    expect(files).toHaveLength(2);

    // 2. Filter files needing update
    const filtered = await batchUpdateService.filterFilesNeedingUpdate(files);
    expect(filtered).toHaveLength(2);

    // 3. Process batch
    const results = await batchUpdateService.processBatch(filtered, {
      onProgress: (current, total, filename) => console.log(`${current}/${total}: ${filename}`),
      onNeedSelection: async (file, results) => results[0] // Auto-select first
    });

    // 4. Verify results
    expect(results.updated).toBe(2);
    expect(results.skipped).toBe(0);
    expect(results.errors).toHaveLength(0);

    // 5. Verify files have location data
    const updatedFile = await app.vault.read(testFiles[0]);
    expect(updatedFile).toContain('location:');
    expect(updatedFile).toContain('rating-google:');
  });
});
```

#### Template Merging
```typescript
describe('Template Integration', () => {
  it('should merge template frontmatter with place data', async () => {
    // Setup: Create template file
    const template = `---
tags:
  - restaurant
  - places
custom_field: "template value"
---

# {{name}}

## Details
`;
    await createTemplateFile('test-template.md', template);

    // Create note with template
    const frontmatter = {
      name: 'Test Restaurant',
      address: '123 Main St',
      'rating-google': 4.5
    };

    const file = await noteCreator.createNote('Test Restaurant', frontmatter, 'Test Restaurant');
    const content = await app.vault.read(file);

    // Verify merged frontmatter
    expect(content).toContain('tags:');
    expect(content).toContain('- restaurant');
    expect(content).toContain('custom_field: "template value"');
    expect(content).toContain('name: Test Restaurant');
    expect(content).toContain('rating-google: 4.5');

    // Verify template body preserved
    expect(content).toContain('# {{name}}');
  });
});
```

---

## 3. Test Data and Fixtures

### 3.1 Mock API Responses

Create realistic mock data for Google Places API:

```typescript
// tests/fixtures/googlePlacesResponses.ts

export const MOCK_SEARCH_RESPONSE: GooglePlacesSearchResponse = {
  places: [
    {
      id: 'ChIJ...',
      displayName: { text: 'Pizza Hut' },
      formattedAddress: '123 Main St, Los Angeles, CA 90001'
    }
  ]
};

export const MOCK_PLACE_DETAILS: GooglePlaceDetailsResponse = {
  id: 'ChIJ...',
  displayName: { text: 'Pizza Hut' },
  formattedAddress: '123 Main St, Los Angeles, CA 90001',
  location: { latitude: 34.0522, longitude: -118.2437 },
  rating: 4.5,
  types: ['italian_restaurant', 'restaurant', 'point_of_interest'],
  businessStatus: 'OPERATIONAL',
  internationalPhoneNumber: '+1 555-0123',
  photos: [
    {
      name: 'photo1',
      widthPx: 800,
      heightPx: 600,
      authorAttributions: [{ displayName: 'John Doe' }]
    }
  ],
  addressComponents: [
    { longText: 'Los Angeles', types: ['locality'] }
  ]
};

export const MOCK_API_ERROR_403 = {
  status: 403,
  message: 'API key not valid'
};

export const MOCK_API_ERROR_429 = {
  status: 429,
  message: 'Rate limit exceeded'
};
```

### 3.2 Test Vault Setup

Create helper functions to set up test environment:

```typescript
// tests/helpers/vaultHelpers.ts

export async function createTestVault() {
  // Create in-memory vault for testing
  const vault = new MockVault();
  return vault;
}

export async function createTestFile(
  vault: MockVault,
  path: string,
  content: string
): Promise<TFile> {
  await vault.create(path, content);
  return vault.getAbstractFileByPath(path) as TFile;
}

export async function createTestFiles(files: Array<{ name: string; frontmatter?: any }>) {
  const created = [];
  for (const file of files) {
    const content = file.frontmatter
      ? `---\n${stringify(file.frontmatter)}\n---\n\n# ${file.name}`
      : `# ${file.name}`;
    created.push(await createTestFile(mockVault, `${file.name}.md`, content));
  }
  return created;
}
```

---

## 4. Test Organization

### 4.1 Directory Structure

```
tests/
├── unit/
│   └── services/
│       ├── googlePlaces.spec.ts
│       ├── dataMapper.spec.ts
│       ├── noteCreator.spec.ts
│       └── batchUpdateService.spec.ts
├── integration/
│   ├── searchAndCreate.spec.ts
│   ├── batchUpdate.spec.ts
│   └── templateMerging.spec.ts
├── fixtures/
│   ├── googlePlacesResponses.ts
│   ├── sampleFrontmatter.ts
│   └── sampleTemplates.ts
├── helpers/
│   ├── vaultHelpers.ts
│   ├── mockObsidian.ts
│   └── testUtils.ts
└── setup.ts
```

### 4.2 Test Configuration (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.spec.ts',
        'dist/'
      ],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    }
  }
});
```

---

## 5. Edge Cases to Test

### Critical Edge Cases

1. **Empty/Null Data**
   - Empty search results
   - Missing optional fields in API responses
   - Null values in frontmatter
   - Empty strings for place names

2. **Special Characters**
   - Place names with quotes, slashes, colons
   - Filenames with invalid characters
   - Unicode characters (emojis, accents)
   - YAML special characters in values

3. **API Failures**
   - Network timeouts
   - Invalid API key (403)
   - Rate limiting (429)
   - Malformed responses
   - Empty responses

4. **File System Issues**
   - Missing template file
   - Non-existent target folder
   - Duplicate filenames (collision handling)
   - Permission errors
   - Disk full

5. **Batch Processing**
   - No files matching criteria
   - All files already complete
   - Cancellation mid-process
   - Rate limiting during batch
   - Partial failures (some succeed, some fail)

6. **Frontmatter Parsing**
   - Malformed YAML
   - Missing `---` delimiters
   - Nested objects
   - Mixed data types in arrays
   - Very large frontmatter (performance)

7. **Template Merging**
   - Template file not found
   - Template with no frontmatter
   - Template with conflicting fields
   - Template with invalid YAML

---

## 6. Mocking Strategy

### 6.1 Obsidian API Mocks

```typescript
// tests/helpers/mockObsidian.ts

export class MockVault {
  private files: Map<string, string> = new Map();

  async create(path: string, content: string): Promise<TFile> {
    this.files.set(path, content);
    return { path, basename: path.split('/').pop() } as TFile;
  }

  async read(file: TFile): Promise<string> {
    return this.files.get(file.path) || '';
  }

  async modify(file: TFile, content: string): Promise<void> {
    this.files.set(file.path, content);
  }

  // ... other methods
}

export class MockApp {
  vault: MockVault;

  constructor() {
    this.vault = new MockVault();
  }
}
```

### 6.2 Google Places API Mocks

```typescript
// Mock requestUrl for API calls
vi.mock('obsidian', () => ({
  requestUrl: vi.fn(async (request) => {
    if (request.url.includes('/places:searchText')) {
      return { json: MOCK_SEARCH_RESPONSE };
    }
    if (request.url.includes('/places/')) {
      return { json: MOCK_PLACE_DETAILS };
    }
    throw new Error('Unknown endpoint');
  }),
  Notice: vi.fn(),
  // ... other Obsidian exports
}));
```

---

## 7. Coverage Goals

### Target Coverage Metrics

- **Line Coverage**: 80%
- **Function Coverage**: 80%
- **Branch Coverage**: 75%
- **Statement Coverage**: 80%

### Priority Coverage Areas

1. **Services**: 90%+ coverage (core business logic)
2. **Data Mapping**: 95%+ coverage (critical transformations)
3. **Batch Processing**: 85%+ coverage (complex workflows)
4. **Modals**: 60%+ coverage (UI interactions, harder to test)

### Excluded from Coverage

- Type definitions (`types/index.ts`)
- Build configuration files
- Test files themselves
- Generated/bundled code in `dist/`

---

## 8. Testing Workflow

### 8.1 Development Workflow

```bash
# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- services/dataMapper.spec.ts

# Run tests matching pattern
npm test -- --grep "cuisine"
```

### 8.2 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 8.3 Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

---

## 9. Next Steps

### Phase 1: Foundation (Week 1)
1. Set up vitest configuration
2. Create mock helpers for Obsidian API
3. Create fixture data for Google Places API responses
4. Write tests for DataMapper (pure functions, easiest to start)

### Phase 2: Core Services (Week 2)
1. Write tests for GooglePlacesService
2. Write tests for NoteCreator
3. Achieve 80% coverage on these two services

### Phase 3: Batch Processing (Week 3)
1. Write tests for BatchUpdateService
2. Write integration tests for batch update flow
3. Test cancellation and rate limiting

### Phase 4: Integration (Week 4)
1. Write end-to-end integration tests
2. Test template merging workflows
3. Achieve overall 80% coverage target

### Phase 5: Refinement (Ongoing)
1. Add edge case tests as bugs are discovered
2. Refactor tests for better maintainability
3. Update tests when features are added

---

## 10. Success Criteria

A successful test suite will:

✅ Catch regressions before they reach users
✅ Run in under 30 seconds (unit tests)
✅ Provide clear failure messages
✅ Be maintainable and easy to update
✅ Give confidence to refactor code
✅ Document expected behavior through tests
✅ Achieve 80% coverage on critical paths
✅ Run automatically in CI/CD pipeline

---

## 11. Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Obsidian Plugin Testing Examples](https://github.com/obsidianmd/obsidian-sample-plugin)
- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)

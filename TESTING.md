# Testing Documentation

This document describes the test strategy and implementation for the Obsidian Google Places Search plugin.

## Overview

The plugin has a comprehensive test suite with **129 tests** covering all critical functionality:

- **121 unit tests** testing individual services in isolation
- **8 integration tests** testing end-to-end workflows

## Test Infrastructure

### Tools

- **Test Framework**: [Vitest](https://vitest.dev/) v4.0.15
- **Coverage Provider**: V8
- **Mocking**: Custom mocks for Obsidian API
- **CI Integration**: Tests run automatically on build

### Configuration Files

- `vitest.config.ts` - Vitest configuration with coverage settings
- `tsconfig.json` - TypeScript configuration including test files
- `tsconfig.build.json` - Production build configuration (excludes tests)

## Running Tests

### Development

```bash
# Run tests in watch mode (auto-rerun on file changes)
npm test

# Run tests once
npm run test:ci

# Run tests with coverage report
npm run test:coverage
```

### Build Integration

Tests are automatically run as part of the build process:

```bash
npm run build
# This runs: test:ci → typecheck → esbuild
```

The build will fail if any tests fail, ensuring code quality.

## Test Structure

```
tests/
├── unit/                           # Unit tests (121 tests)
│   └── services/
│       ├── dataMapper.spec.ts      # 31 tests
│       ├── googlePlaces.spec.ts    # 19 tests
│       ├── noteCreator.spec.ts     # 25 tests
│       └── batchUpdateService.spec.ts # 46 tests
├── integration/                    # Integration tests (8 tests)
│   └── workflows.spec.ts           # End-to-end workflow tests
├── helpers/
│   └── mockObsidian.ts            # Mock Obsidian API
└── fixtures/
    └── googlePlacesResponses.ts   # Mock API responses
```

## Unit Tests (121 tests)

### DataMapper Service (31 tests)

Tests data transformation from Google Places API to Obsidian frontmatter format.

**Key Test Areas:**
- Frontmatter mapping for all fields
- Cuisine type extraction (all 21 types)
- City extraction from address components
- Filename formatting and sanitization
- Edge cases (missing data, empty arrays, null values)

### GooglePlacesService (19 tests)

Tests API integration and error handling.

**Key Test Areas:**
- Search places endpoint
- Get place details endpoint
- API error handling (403, 429, 500)
- Network error handling
- Request formatting and headers
- Response transformation

### NoteCreator Service (25 tests)

Tests note creation, template handling, and file operations.

**Key Test Areas:**
- Creating notes with frontmatter
- Template loading and merging
- Unique filename generation
- Folder creation
- Frontmatter parsing and formatting
- Image downloading (when implemented)

### BatchUpdateService (46 tests)

Tests batch updating of existing notes with place data.

**Key Test Areas:**
- Finding files by folder path
- Filtering files needing updates
- Batch processing with progress callbacks
- Cancellation functionality
- Rate limiting
- Error handling per file
- Frontmatter parsing and building
- Preserving existing data

## Integration Tests (8 tests)

### Search and Create Note Workflow (3 tests)

Tests the complete flow from search to note creation.

**Scenarios:**
1. Full workflow: search → get details → map data → create note
2. Multiple search results with user selection
3. Custom filename patterns

### Batch Update Workflow (3 tests)

Tests batch updating multiple files with place data.

**Scenarios:**
1. Finding, filtering, and updating files
2. User selection for multiple results
3. Error handling when places aren't found

### Template Merging Workflow (2 tests)

Tests integration of custom templates with place data.

**Scenarios:**
1. Merging template frontmatter with place data
2. Place data overwriting template defaults

## Mocking Strategy

### Obsidian API Mocks

The test suite includes comprehensive mocks for Obsidian's API:

**MockVault:**
- File creation, reading, modification
- Folder management
- File/folder existence checks
- Proper TFile and TFolder instances for `instanceof` checks

**MockApp:**
- Vault access
- Plugin lifecycle methods

**Key Features:**
- Custom TFile/TFolder classes that pass `instanceof` checks
- In-memory file system simulation
- Realistic file path handling

### Google Places API Mocks

Mock responses for various scenarios:

- Successful search results
- Empty search results
- Place details (full data)
- API errors (403, 429, 500)
- Network failures

## Coverage Goals

As configured in `vitest.config.ts`:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 75%
- **Statements**: 80%

Coverage reports can be generated with:

```bash
npm run test:coverage
```

Reports are generated in:
- Terminal (text format)
- `coverage/index.html` (interactive HTML report)
- `coverage/coverage-final.json` (JSON format)

## Test Patterns and Best Practices

### 1. Test Isolation

Each test is independent and doesn't rely on others:

```typescript
beforeEach(() => {
    vi.clearAllMocks();
    // Reset all state
});
```

### 2. Descriptive Test Names

Tests use clear, descriptive names:

```typescript
it('should return empty array when no results found', async () => {
    // ...
});
```

### 3. Arrange-Act-Assert Pattern

Tests follow AAA structure:

```typescript
// Arrange
const searchResults = [/* ... */];
mockSearch.mockResolvedValue(searchResults);

// Act
const results = await service.searchPlaces('Pizza');

// Assert
expect(results).toHaveLength(2);
```

### 4. Edge Case Coverage

Tests cover both happy paths and edge cases:
- Empty inputs
- Null/undefined values
- Network errors
- Invalid data formats
- Boundary conditions

### 5. Integration Test Realism

Integration tests simulate real user workflows:
- Multiple service interactions
- Async operations
- Error scenarios
- User input simulation

## Known Limitations

### TypeScript Warnings in Tests

Some TypeScript warnings appear in test files but don't affect functionality:

- `'callArgs' is of type 'unknown'` - Mock function call arguments
- `'content' is possibly 'undefined'` - Overly cautious null checking

These are expected and can be safely ignored.

### Coverage Parser Errors

V8 coverage may show parse errors for certain TypeScript syntax:
- Constructor parameter properties: `constructor(private foo: string)`
- This is a known V8 limitation and doesn't affect coverage accuracy

## Continuous Integration

The test suite is designed for CI/CD integration:

1. **Fast execution**: All 129 tests run in < 1 second
2. **Deterministic**: No flaky tests or race conditions
3. **Zero dependencies**: No external services required
4. **Exit codes**: Proper exit codes for CI systems

## Future Test Enhancements

Potential areas for expansion:

1. **E2E Tests**: Manual testing in actual Obsidian environment
2. **Visual Regression**: Screenshot comparison for modals
3. **Performance Tests**: Benchmark critical operations
4. **Mutation Testing**: Verify test quality with Stryker
5. **Accessibility Testing**: Ensure keyboard navigation works

## Troubleshooting

### Tests Failing After Code Changes

1. Run tests in watch mode: `npm test`
2. Check error messages for specific failures
3. Verify mocks are properly updated
4. Ensure async operations use `await`

### Coverage Not Updating

1. Delete coverage directory: `rm -rf coverage`
2. Run coverage again: `npm run test:coverage`
3. Check `.gitignore` includes `coverage/`

### Build Failing on Tests

1. Run tests separately: `npm run test:ci`
2. Fix any failing tests
3. Verify TypeScript compilation: `npm run typecheck`
4. Run build again: `npm run build`

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass: `npm run test:ci`
3. Verify coverage meets thresholds: `npm run test:coverage`
4. Update this documentation if adding new test patterns

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Strategy Document](CONTEXT/04_TEST_STRATEGY.md)

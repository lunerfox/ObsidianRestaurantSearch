# Implementation Tasks

**Project:** Google Places to Obsidian Plugin

**Date:** December 2, 2025

---

## Task Overview

This document breaks down the Google Places to Obsidian Plugin into discrete, executable tasks. Each task is designed to be completed by Claude Code in a single session.

**Total Tasks:** 12

**Estimated Completion:** 12-15 work sessions

---

## Task Dependencies

```
Phase A: Project Setup
├── 1.1 → 1.2 → 1.3

Phase B: Core Services  
├── 2.1 (depends on 1.3)
├── 2.2 (depends on 1.3, 2.1)
├── 2.3 (depends on 1.3, 2.1)
└── 2.4 (depends on 2.2, 2.3)

Phase C: UI Components
├── 3.1 (depends on 1.3)
├── 3.2 (depends on 2.1, 3.1)
└── 3.3 (depends on 2.4, 3.1, 3.2)

Phase D: Testing & Polish
├── 4.1 (depends on 2.2, 2.3)
└── 4.2 (depends on all previous tasks)
```

---

## Phase A: Project Setup

### Task 1.1: Initialize Project Structure
**Description:** Set up the basic Obsidian plugin project with build configuration and dependencies.

**Files to Create:**
- `package.json`
- `tsconfig.json`
- `manifest.json`
- `esbuild.config.mjs`
- `.gitignore`
- `README.md`

**Dependencies:** None

**Success Criteria:**
- ✅ Project structure matches Technical Spec
- ✅ `npm install` completes without errors
- ✅ All config files are valid

**Test Commands:**
```bash
npm install
npm run build
```

**Estimated Time:** 15-20 minutes

---

### Task 1.2: Create Base Directory Structure
**Description:** Create the source code directory structure with placeholder files.

**Files to Create:**
- `src/main.ts` (empty shell)
- `src/settings.ts` (empty shell)
- `src/modal.ts` (empty shell)
- `src/services/googlePlaces.ts` (empty shell)
- `src/services/noteCreator.ts` (empty shell)
- `src/services/dataMapper.ts` (empty shell)
- `src/types/index.ts` (empty shell)
- `styles.css` (empty)

**Dependencies:** Task 1.1

**Success Criteria:**
- ✅ All directories and files exist
- ✅ Files have proper imports and basic structure
- ✅ TypeScript compilation succeeds

**Test Commands:**
```bash
npm run build
```

**Estimated Time:** 10 minutes

---

### Task 1.3: Define TypeScript Interfaces
**Description:** Create all TypeScript interfaces and types needed across the project.

**Files to Modify:**
- `src/types/index.ts`

**Content to Create:**
- `GooglePlacesSettings` interface
- `PlaceSearchResult` interface
- `PlaceDetails` interface
- `AddressComponent` interface
- `Photo` interface
- `PlaceFrontmatter` interface
- Custom error classes (`APIKeyError`, `RateLimitError`, `TemplateNotFoundError`, `NoResultsError`)

**Dependencies:** Task 1.2

**Success Criteria:**
- ✅ All interfaces defined with correct types
- ✅ Error classes extend Error properly
- ✅ Exports are correct
- ✅ TypeScript compilation succeeds

**Test Commands:**
```bash
npm run build
```

**Estimated Time:** 15 minutes

---

## Phase B: Core Services

### Task 2.1: Implement Google Places API Service
**Description:** Create the service that handles all Google Places API interactions.

**Files to Modify:**
- `src/services/googlePlaces.ts`

**Functionality to Implement:**
- `searchText(query: string)` - Text search API call
- `getPlaceDetails(placeId: string)` - Place details API call
- Proper headers with API key and field masks
- Error handling (throw custom error types)
- Response parsing and validation

**Dependencies:** Task 1.3

**Success Criteria:**
- ✅ Can make text search requests
- ✅ Can fetch place details
- ✅ Throws correct error types for API failures
- ✅ Returns properly typed responses
- ✅ Field masks are correct

**Test Commands:**
```bash
npm run build
# Manual test: Call functions with valid API key
```

**Estimated Time:** 30-40 minutes

---

### Task 2.2: Implement Data Mapper Service
**Description:** Create the service that transforms Google Places API data to frontmatter format.

**Files to Modify:**
- `src/services/dataMapper.ts`

**Functionality to Implement:**
- `transformToFrontmatter(placeDetails: PlaceDetails, apiKey: string)` - Main transformation function
- Cuisine extraction and mapping
- City extraction from address components
- Image URL construction
- Location array formatting
- isClosed determination
- Google Maps link construction

**Dependencies:** Task 1.3, Task 2.1

**Success Criteria:**
- ✅ Correctly extracts and transforms cuisine types
- ✅ Extracts city from address components
- ✅ Formats location as [lat, lng] array
- ✅ Constructs valid image URLs
- ✅ Determines isClosed correctly
- ✅ Returns proper PlaceFrontmatter object

**Test Commands:**
```bash
npm run build
npm run test # Run unit tests for this service
```

**Estimated Time:** 30-40 minutes

---

### Task 2.3: Implement Note Creator Service (Part 1: Template Handling)
**Description:** Create the service that handles template reading and frontmatter merging.

**Files to Modify:**
- `src/services/noteCreator.ts`

**Functionality to Implement:**
- Template file reading
- Frontmatter parsing (using js-yaml)
- Frontmatter merging logic
- Template not found error handling

**Dependencies:** Task 1.3, Task 2.1

**Success Criteria:**
- ✅ Can read template files
- ✅ Correctly parses YAML frontmatter
- ✅ Merges frontmatter without losing template fields
- ✅ Throws TemplateNotFoundError when appropriate
- ✅ Handles empty template path (no template)

**Test Commands:**
```bash
npm run build
npm run test # Run unit tests
```

**Estimated Time:** 30 minutes

---

### Task 2.4: Implement Note Creator Service (Part 2: File Creation)
**Description:** Complete the note creator service with filename generation and file creation.

**Files to Modify:**
- `src/services/noteCreator.ts`

**Functionality to Implement:**
- Filename generation with variable replacement
- Filename sanitization
- File collision handling (numeric suffix)
- File creation using Obsidian vault API
- Note opening in editor
- Main `createNote(placeId: string)` orchestration function

**Dependencies:** Task 2.2, Task 2.3

**Success Criteria:**
- ✅ Generates filenames correctly with variables
- ✅ Sanitizes invalid characters
- ✅ Handles file collisions with numeric suffixes
- ✅ Creates note with merged frontmatter
- ✅ Opens note in active editor
- ✅ Full integration works end-to-end

**Test Commands:**
```bash
npm run build
npm run test # Run unit tests
# Manual test: Create a note in dev vault
```

**Estimated Time:** 40-50 minutes

---

## Phase C: UI Components

### Task 3.1: Implement Settings Tab
**Description:** Create the settings UI with autocomplete for template and folder paths.

**Files to Modify:**
- `src/settings.ts`

**Functionality to Implement:**
- `GooglePlacesSettings` interface and defaults
- `SettingsTab` class
- Settings UI with all four fields:
  - API Key (text input)
  - Template File Path (with file suggester)
  - Target Folder (with folder suggester)
  - Filename Format (text input)
- File and folder autocomplete suggesters
- Settings validation
- Save/load functionality

**Dependencies:** Task 1.3

**Success Criteria:**
- ✅ Settings tab appears in Obsidian settings
- ✅ All four settings fields display correctly
- ✅ File autocomplete works
- ✅ Folder autocomplete works
- ✅ Settings save and persist
- ✅ Validation prevents invalid inputs

**Test Commands:**
```bash
npm run build
# Manual test: Open settings, test autocomplete, save values
```

**Estimated Time:** 45-60 minutes

---

### Task 3.2: Implement Search Modal
**Description:** Create the modal UI for searching and selecting places.

**Files to Modify:**
- `src/modal.ts`

**Functionality to Implement:**
- `SearchModal` class extending Obsidian Modal
- Search input field
- Search button / enter key handling
- Results display (name + address list)
- Result selection handling
- Error message display
- Loading state during API calls

**Dependencies:** Task 2.1, Task 3.1

**Success Criteria:**
- ✅ Modal opens when command is triggered
- ✅ Search input accepts text
- ✅ Pressing Enter or clicking search triggers API call
- ✅ Results display with name and address
- ✅ Clicking a result passes place_id to note creator
- ✅ Error messages display inline
- ✅ Loading state shows during API calls

**Test Commands:**
```bash
npm run build
# Manual test: Open modal, search for place, view results
```

**Estimated Time:** 40-50 minutes

---

### Task 3.3: Implement Main Plugin Integration
**Description:** Wire everything together in main.ts to create a working plugin.

**Files to Modify:**
- `src/main.ts`

**Functionality to Implement:**
- Plugin class extending Obsidian Plugin
- `onload()` method
  - Load settings
  - Register command
  - Add settings tab
- `onunload()` method
- Settings load/save methods
- Command handler that opens search modal
- Integration between modal and note creator
- Error handling at plugin level

**Dependencies:** Task 2.4, Task 3.1, Task 3.2

**Success Criteria:**
- ✅ Plugin loads in Obsidian
- ✅ Command appears in command palette
- ✅ Settings tab appears in settings
- ✅ Command opens search modal
- ✅ Full workflow works: search → select → create note
- ✅ Errors are handled gracefully
- ✅ Settings persist between sessions

**Test Commands:**
```bash
npm run build
# Manual test: Full integration test in dev vault
```

**Estimated Time:** 30-40 minutes

---

## Phase D: Testing & Polish

### Task 4.1: Create Unit Tests
**Description:** Write unit tests for data mapper and note creator services.

**Files to Create:**
- `src/__tests__/dataMapper.test.ts`
- `src/__tests__/noteCreator.test.ts`

**Test Coverage:**
- **dataMapper.test.ts:**
  - Cuisine filtering and transformation
  - City extraction
  - Location formatting
  - isClosed logic
  - Image URL construction
  
- **noteCreator.test.ts:**
  - Filename variable replacement
  - Filename sanitization
  - File collision suffix logic

**Dependencies:** Task 2.2, Task 2.3

**Success Criteria:**
- ✅ All tests pass
- ✅ Edge cases are covered
- ✅ Tests run via `npm run test`

**Test Commands:**
```bash
npm run test
```

**Estimated Time:** 45-60 minutes

---

### Task 4.2: Final Integration Testing & Documentation
**Description:** Complete end-to-end testing and update documentation.

**Files to Modify:**
- `README.md`

**Tasks:**
- Full integration testing in development vault
- Test all error scenarios
- Test with and without template
- Test filename collisions
- Test autocomplete in settings
- Update README with:
  - Installation instructions
  - Configuration guide
  - Usage examples
  - API key setup instructions
  - Troubleshooting section

**Dependencies:** All previous tasks

**Success Criteria:**
- ✅ All user flows work correctly
- ✅ All error cases handled properly
- ✅ README is comprehensive
- ✅ Plugin is ready for release

**Test Commands:**
```bash
npm run build
# Manual: Complete user acceptance testing
```

**Estimated Time:** 60-90 minutes

---

## Registry Files to Maintain

As tasks are completed, the following registry files should be updated:

### BUILD_STATUS.json
Track task completion status:
```json
{
  "tasks": {
    "1.1": {
      "status": "completed",
      "completedDate": "2025-12-02",
      "notes": ""
    },
    "1.2": {
      "status": "in-progress",
      "notes": ""
    }
  }
}
```

### FILE_MAP.md
Document all files created and their exports:
```markdown
## src/types/index.ts
- Exports: GooglePlacesSettings, PlaceSearchResult, PlaceDetails, etc.
- Purpose: Central type definitions

## src/services/googlePlaces.ts
- Exports: GooglePlacesService class
- Purpose: API integration
```

### API_CONTRACTS.md
Document API interactions:
```markdown
## Google Places Text Search
- Endpoint: POST https://places.googleapis.com/v1/places:searchText
- Headers: X-Goog-Api-Key, X-Goog-FieldMask
- Response: Array of PlaceSearchResult
```

### NAMING_CONVENTIONS.md
Document naming patterns:
```markdown
## Files
- Services: camelCase (googlePlaces.ts, noteCreator.ts)
- Components: camelCase (modal.ts, settings.ts)
- Tests: serviceName.test.ts

## Classes
- PascalCase (GooglePlacesService, SearchModal)

## Functions
- camelCase (searchText, getPlaceDetails)
```

### PATTERNS.md
Document code patterns:
```markdown
## Error Handling
Services throw custom error types:
- APIKeyError for authentication failures
- RateLimitError for quota issues
- etc.

Modal catches and displays user-friendly messages.
```

---

## Task Execution Workflow

### For Each Task:

1. **Before Starting:**
   - Read this task description
   - Read relevant sections from Technical Spec
   - Read relevant sections from Scope document

2. **During Implementation:**
   - Follow the Technical Spec exactly
   - Create/modify specified files
   - Test as you go

3. **After Completion:**
   - Run test commands
   - Update BUILD_STATUS.json
   - Update FILE_MAP.md
   - Update relevant registry files
   - Report completion to PM

4. **Verification:**
   - PM will verify against success criteria
   - PM will mark task as "verified" in BUILD_STATUS.json
   - Move to next task

---

## Next Steps

1. **Create BUILD_STATUS.json** - Initialize with all tasks set to "pending"
2. **Create empty registry files** - FILE_MAP.md, API_CONTRACTS.md, NAMING_CONVENTIONS.md, PATTERNS.md
3. **Generate Claude Code prompt for Task 1.1** - First task to execute
4. **Begin execution cycle** - Build, verify, iterate

---

## Notes for Claude Code

- Always reference planning docs (SCOPE, TECHNICAL_SPEC) before starting
- Follow patterns exactly as specified
- Test after each significant change
- Update registries as you complete work
- Ask PM for clarification if requirements are ambiguous
- Use exact file paths and naming from Technical Spec

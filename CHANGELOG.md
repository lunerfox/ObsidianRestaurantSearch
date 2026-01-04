# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-01-04

### Fixed
- Removed hardcoded `cuisine` property for non-restaurant places (#1)
- Cuisine field now only appears when place has food-related types
- Smart field population: only includes fields that exist in template (case-insensitive)
- Essential fields (address, location, link, phone) are always included

### Added
- New "Search selection - Choose Template" command (#2)
- Template selection modal for search selection workflow
- Select template before searching instead of needing separate commands
- Case-insensitive template field matching
- Better handling of nested fields in templates

### Documentation
- Added documentation for available frontmatter fields
- Documented essential fields that are always populated

## [1.5.2] - 2025-12-28

### Fixed

- Template name input field no longer loses focus after each keystroke in settings
  - Previously, editing a template name required clicking back into the input after each character
  - Now you can type continuously without interruption
- File and folder autocomplete suggestions now update in real-time as you type
  - Autocomplete list refreshes with each keystroke for immediate feedback
  - Improves UX when selecting template files and target folders

## [1.5.1] - 2025-12-28

### Added

- "Search selection" commands now preserve the user's original search text as an alias in the note frontmatter
  - Only adds alias if the selected text differs from the place's official name
  - Allows notes to be found using the original search term

## [1.5.0] - 2025-12-28

### Added

- "Search selection" commands for each template - search using selected text from the editor
  - One command per configured template (e.g., "Search selection - Restaurant", "Search selection - Cafe")
  - Commands can be assigned custom hotkeys through Obsidian's native hotkey settings
  - Automatically creates note and replaces selection with wikilink to the new note
  - Smart result handling:
    - Auto-selects when only one result is found (no modal shown)
    - Shows selection modal only when multiple results are found
    - Shows helpful notice when no results are found
  - Works with all template configurations including "No Template" mode

### Changed

- Improved user experience with context-aware notifications during selection-based search

## [1.4.1] - 2025-12-22

### Added

- "Update current file geo data" command to add geolocation and address to the currently active file
  - Searches using existing address field first, falls back to filename
  - Shows selection modal when multiple places are found
  - Auto-selects when only one result is found
  - Only updates address and location fields, preserving all other frontmatter

### Changed

### Fixed

## [1.4.0] - 2025-12-07

### Added

- Multiple template support - define and use different templates for different types of places
- Template management UI in settings:
  - Add/remove templates with custom names
  - Configure template file paths with autocomplete
  - Per-template target folder override (optional)
  - Built-in "No Template" option for minimal notes
- Template selection dropdown in search modal
- Dynamic command registration - separate commands for each template:
  - "Search Google Places - {Template Name}" commands
  - "Search and insert link - {Template Name}" commands
- "Remember last used template" setting to automatically select last-used template
- Support for creating notes without templates (geo location and address only)
- Automatic migration from single template to multiple templates
- Command name updates when template names change (without plugin restart)

### Changed

- Settings UI reorganized with dedicated "Templates" section
- Command naming updated for clarity ("Search Google Places" instead of "Search and add place from Google Places")
- Template file path is now passed as parameter instead of read from global settings
- "No Template" mode now only includes essential fields (address, location, link, phone, image) - excludes cuisine and other metadata

### Fixed

- Template commands now refresh immediately when template names are changed in settings
- "No Template" mode no longer includes cuisine or other non-essential frontmatter fields

### Deprecated

- `templateFilePath` setting (replaced by `templates` array) - automatically migrated on plugin load

## [1.3.2] - 2025-12-07

### Added

- Comprehensive test suite with 129 tests covering:
  - Unit tests (121 tests):
    - DataMapper service (31 tests)
    - GooglePlacesService (19 tests)
    - NoteCreator service (25 tests)
    - BatchUpdateService (46 tests)
  - Integration tests (8 tests):
    - Search and Create Note workflow (3 tests)
    - Batch Update workflow (3 tests)
    - Template Merging workflow (2 tests)
- Test infrastructure with Vitest, mocks for Obsidian API, and fixture data
- Automated testing in build process - builds fail if tests fail
- Test coverage tracking with V8 coverage provider
- TypeScript strict type checking for production code
- Comprehensive testing documentation (TESTING.md)

### Changed

- Build process now runs tests before compilation
- Added ES2017 to TypeScript lib for Object.entries support
- Updated project structure documentation with test directories

## [1.3.1] - 2025-12-06

### Updated

- Cuisine mappings are now user-configurable through plugin settings
- Moved cuisine type mappings from hard-coded values to a new "Restaurant settings" section
- Users can add, modify, or remove cuisine mappings via a text area in settings
- All existing default cuisine mappings are preserved for backward compatibility
- Prepared settings structure for future expansion to other place types

## [1.3.0] - 2025-12-06

### Added

- Batch update places command to retroactively add geo-data to existing notes
- New "Batch update places" settings section with configurable options:
  - Address field name (specify which frontmatter field contains the address)
  - Use filename as fallback (search by filename when no address exists)
  - Auto-select single result (automatically select when only one place is found)
  - Rate limit delay (configurable delay between API calls to avoid rate limiting)
- Batch update modal with folder path filtering and progress tracking
- Place selection modal for choosing the correct place when multiple results are found
- Real-time progress display showing current file and completion percentage
- Comprehensive results summary with files updated, skipped, and error details
- API key validation before starting batch operations
- Cancellation support to stop batch processing mid-operation

### Changed

- Enhanced frontmatter parsing to preserve existing structure during updates
- Never overwrites existing address or location fields

## [1.2.2] - 2025-12-05

### Added

- Phone number support: Plugin now fetches and stores phone numbers from Google Places API
- Phone numbers are stored in frontmatter (international format preferred, falls back to national format)

### Fixed

- Object stringification linter warning in noteCreator.ts
- Improved type safety for frontmatter value handling

### Changed

- Updated API field mask to include phone number fields

## [1.2.1] - 2025-12-05

### Fixed

- Console statements changed from `console.log` to `console.debug` for better logging practices
- Updated all UI text to use sentence case per Obsidian style guidelines (18+ locations)
- Replaced browser `fetch` API with Obsidian's `requestUrl` API for better plugin compatibility
- Improved type safety by replacing `any` types with `Record<string, unknown>`
- Removed async modifier from `getUniqueFilePath` method (no await needed)
- Enhanced object stringification with proper JSON.stringify handling
- Cleaned up unused variables and imports
- Replaced direct style assignments with `setCssProps` method
- Updated settings heading text to follow Obsidian conventions
- Fixed Promise return types with void operator for event handlers

### Changed

- Updated command names to be more concise
- Improved Notice messages to be more descriptive

## [1.2.0] - 2025-12-04

### Added
- API key validation button in settings for testing Google Places API connectivity
- Warning banner in settings when image downloads are disabled, alerting users about API key exposure in image URLs
- Visual feedback on validation button (Valid, Invalid, Check Console states)
- Improved user notifications for different API validation error states

### Changed
- Enhanced settings UI with better user feedback and security warnings

## [1.1.0] - 2025-12-04

### Added
- Command to insert wiki-link at cursor position after creating place note
- Local image download option in settings
- Image folder configuration setting
- File and folder suggesters in settings for better UX
- Compatibility with Map View plugin via location frontmatter

### Changed
- Updated plugin ID to `places-search`
- Improved frontmatter formatting for better readability
- Enhanced template merging to preserve existing template fields

### Fixed
- Filename collision handling
- Template file path resolution

## [1.0.0] - 2025-12-04

### Added
- Initial release
- Search for places using Google Places API
- Automatic note creation with structured frontmatter
- Support for custom note templates
- Configurable filename patterns and target folders
- Rich metadata extraction:
  - Name and address
  - Cuisine types and categories
  - Google ratings
  - Photos and images
  - Geographic coordinates
  - Business status
  - Google Maps links
- Error handling for API failures
- Settings panel for API key and plugin configuration

[1.2.0]: https://github.com/lunerfox/ObsidianRestaurantSearch/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/lunerfox/ObsidianRestaurantSearch/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/lunerfox/ObsidianRestaurantSearch/releases/tag/v1.0.0

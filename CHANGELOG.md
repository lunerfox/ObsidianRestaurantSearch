# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

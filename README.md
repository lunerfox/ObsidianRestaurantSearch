# Google Places to Obsidian Plugin

An Obsidian plugin that allows you to search for places using Google Places API and automatically create structured notes with rich metadata.

## Overview

This plugin helps Obsidian users who track restaurants, places of interest, or maintain personal location databases. Instead of manually copying and formatting place information, you can search Google Places directly from Obsidian and create notes with structured frontmatter containing all relevant details.

![Recording 2025-12-04 163651](https://github.com/user-attachments/assets/9ada6179-38d2-4f06-a46c-9c18d8e2e2ec)

## Features

- **Search Integration**: Search for places using Google Places API directly from Command Palette
- **Rich Metadata**: Automatically populate frontmatter with place details including:
  - Name and address
  - Cuisine types and categories
  - Google ratings
  - Photos and images
  - Geographic coordinates
  - Business status
  - Google Maps links
- **Template Support**: Use custom note templates that preserve your structure and tags
- **Flexible File Management**: Configure filename patterns and target folders
- Compatibility with [Map View](https://github.com/esm7/obsidian-map-view)

## Installation

### Prerequisites

- Obsidian v1.8.0 or higher
- Google Places API key with required permissions (see setup below)

### Google API Setup

To use this plugin, you need to set up a Google Cloud project and enable the Places API (New):

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable Required APIs**
   - Navigate to "APIs & Services" > "Library"
   - Search for and enable: **Places API (New)**
   - Note: This is different from the legacy "Places API"

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your new API key

4. **Secure Your API Key (Recommended)**
   - Click on your API key to edit restrictions
   - Under "API restrictions", select "Restrict key"
   - Choose only: **Places API (New)**
   - Under "Application restrictions" (optional):
     - Consider adding HTTP referrer restrictions if using on specific devices
     - Or use IP restrictions for additional security

5. **Verify Billing is Enabled**
   - Google Places API (New) requires a billing account
   - Go to "Billing" in Google Cloud Console
   - Set up billing if not already configured
   - Note: Google provides $200 monthly credit which typically covers personal use

### Required API Permissions

This plugin requires the following Google Places API (New) permissions:

- **places.searchText** - For searching places by text query
- **places.get** - For retrieving detailed place information
- **Place Data Fields Used**:
  - `places.id` - Place identifier
  - `places.displayName` - Place name
  - `places.formattedAddress` - Full address
  - `places.types` - Place categories (for cuisine types)
  - `places.rating` - Google user rating
  - `places.photos` - Place photos
  - `places.location` - Geographic coordinates
  - `places.businessStatus` - Open/closed status
  - `places.addressComponents` - Structured address (for city extraction)

### Plugin Installation

1. Download the plugin files to your vault's `.obsidian/plugins/google-places-obsidian/` directory
2. Enable the plugin in Obsidian Settings > Community Plugins
3. Configure your Google Places API key in plugin settings
4. Click "Validate" to test your API key connection

## Configuration

### Required Settings

- **Google Places API Key**: Your API key from Google Cloud Console

### Optional Settings

- **Template File Path**: Path to a template file for note structure (e.g., `Templates/restaurant-snippet.md`)
- **Target Folder**: Folder where new notes will be created (e.g., `Restaurants/`)
- **Filename Format**: Pattern for generated filenames using variables:
  - `{name}` - Place name
  - `{city}` - Extracted city name
  - Default: `{name}`
  - Example: `{city} - {name}` generates "Los Angeles - Joe's Pizza.md"

## Usage

1. Open Command Palette (`Cmd/Ctrl + P`)
2. Select "Search and add place from Google Places"
3. Enter your search query (e.g., "Joe's Pizza NYC")
4. Browse search results showing name and address
5. Select the correct place from results
6. Plugin creates a new note with populated frontmatter
7. Note opens automatically in the active editor

### Generated Frontmatter Fields

The plugin automatically populates these fields:

```yaml
---
cuisine: [Italian, Bar]
city: Los Angeles
rating-google: 4.5
link: https://www.google.com/maps/place/?q=place_id:...
image: https://places.googleapis.com/...
address: 123 Main St, Los Angeles, CA 90001
isClosed: false
location: [34.0522, -118.2437]
---
```

Fields left for manual entry (or from template):
- `Type`, `region`, `neighborhood`
- `aliases`
- `rating-food`, `rating-value`, `rating-service` (personal ratings)
- `Description`
- `dg-publish`, `tags`

## Development

### Tech Stack

- **Language**: TypeScript
- **Build Tool**: esbuild
- **Testing**: Vitest
- **HTTP Client**: Native Fetch API

### Project Structure

```
google-places-plugin/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── settings.ts          # Settings tab & configuration
│   ├── modal.ts             # Search modal UI
│   ├── services/
│   │   ├── googlePlaces.ts  # Google Places API integration
│   │   ├── noteCreator.ts   # File creation and templates
│   │   └── dataMapper.ts    # API data transformation
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   └── __tests__/
├── manifest.json
├── package.json
└── styles.css
```

## API Integration

This plugin uses [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/op-overview) with two main endpoints:

- **Text Search**: Find places by name/location
- **Place Details**: Fetch complete information for a specific place

### API Usage Notes

- Users must provide their own API key
- No rate limiting implemented in MVP
- No caching (each search is a fresh API call)

## Error Handling

The plugin handles common error scenarios:

- **No Results**: Displays message and allows retry
- **Invalid API Key**: Prompts to check settings
- **Rate Limit Exceeded**: Notifies user to try later
- **Missing Template**: Alerts if template file not found
- **Network Errors**: Shows user-friendly error messages

## Roadmap

Future enhancements not included in MVP:

- Updating existing notes
- Bulk imports
- Offline mode and caching
- Custom field mappings
- Integration with other plugins
- Mobile-specific optimizations
- API rate limiting

## Documentation

Additional documentation in the `CONTEXT/` folder:

- `01_SCOPE_AND_DECISIONS.md` - Project requirements and decisions
- `02_TECHNICAL_SPEC.md` - Detailed technical architecture
- `03_IMPLEMENTATION_TASKS.md` - Development task breakdown

## License

MIT

# Scope & Decisions

**Project:** Google Places to Obsidian Plugin

**Date:** December 2, 2025

---

## Project Overview

**Project Name:** Google Places to Obsidian Plugin

**Problem:** Users want to save restaurant/place information from Google Places directly into their Obsidian vault with structured metadata, but currently have to manually copy and format this data.

**Users:** Obsidian users who track restaurants, places of interest, food experiences, or maintain personal location databases.

**Core Functionality:** 
- Search for places using Google Places API
- Display search results with name and address
- Fetch complete place details (name, address, cuisine/category, images, ratings, coordinates)
- Insert all data as structured frontmatter in an Obsidian note
- Support custom template files for note structure
- Provide a search-like interface similar to Obsidian's Book Search plugin

---

## MVP Features

### User Flow
1. User opens Command Palette (Cmd/Ctrl+P)
2. User selects command: "Search and add place from Google Places"
3. Modal dialog appears with a search input field
4. User types place name (e.g., "Joe's Pizza NYC")
5. Plugin queries Google Places API and shows search results (name + address)
6. User selects the correct place from results
7. Plugin fetches full place details and creates a new note with frontmatter
8. Note opens automatically in the active editor pane

### Data Fields

**Frontmatter Fields Populated from Google Places API:**
- **cuisine:** List of food-related types (e.g., ["Italian", "Bar"])
- **city:** Extract from address components
- **rating-google:** Map from Google Places rating (1-5 scale)
- **link:** Google Maps URL for the place
- **image:** First photo URL from Google Places photos array (or template placeholder if none)
- **address:** formatted_address from API
- **isClosed:** Set to `true` only if `business_status === "CLOSED_PERMANENTLY"`, otherwise `false`
- **location:** Array format `[latitude, longitude]` for map plugins

**Fields Left Blank (User Fills Later or Comes from Template):**
- Type (comes from template)
- region
- neighborhood (user fills manually)
- aliases
- rating-food (personal rating)
- rating-value (personal rating)
- rating-service (personal rating)
- Description (personal notes)
- dg-publish (comes from template)
- tags (comes from template)

### Template & File Management

**Template Configuration:**
- Plugin settings allow user to specify a template file path (optional)
- Default: empty (creates note with only populated frontmatter)
- If template specified, plugin copies entire template content
- Plugin only updates the specific frontmatter fields listed above (preserving all other fields from template)

**File Creation Settings (Configurable):**
- **Filename Format:** Configurable pattern with variables
  - Variables: `{name}`, `{city}`
  - Default: `{name}`
  - Example: `{city} - {name}` → "Los Angeles - Joe's Pizza.md"
- **Target Folder:** Configurable folder path
  - Default: root vault
  - User can specify like "Restaurants/" or "Places/Dining/"

---

## Key Technical Decisions

### Google Places API Integration

**API Configuration:**
- Plugin requires users to provide their own Google Places API key in settings
- Uses **Google Places API (New)** (the modern version)
- No rate limiting implementation in MVP
- No caching in MVP (each search/fetch is a fresh API call)

**API Usage:**
1. **Text Search:** For the search dialog - query places by name/location
2. **Place Details:** Fetch full details for selected place (photos, ratings, address components, etc.)

### Image Handling

**Image Strategy:**
- Store Google Places photo URL directly in frontmatter `image:` field
- No local downloads or file management
- Use first available photo from the place's photos array
- If no photos available, use placeholder from template or leave empty

### Cuisine Mapping

**Cuisine Field Population:**
- Extract all food-related types from Google Places API response
- Filter to relevant categories (e.g., "italian_restaurant", "sushi_restaurant", "cafe")
- Convert to readable format: "italian_restaurant" → "Italian"
- Store as YAML list in frontmatter:
  ```yaml
  cuisine:
    - Italian
    - Bar
  ```
- If no food-related types found, leave as empty list `cuisine: []`

---

## Error Handling & Edge Cases

**No Search Results:**
- Display message in modal: "No places found for '{search query}'. Try a different search term."
- Do not create any file
- Allow user to modify search and try again

**API Key Missing or Invalid:**
- Show error message in modal
- Block command from running until valid API key is provided
- Offer link/button to open plugin settings

**API Rate Limit Exceeded:**
- Show error message: "Google API limit reached. Please try again later."
- Do not create file

**Place Has No Photos:**
- Use the placeholder URL from template (falls back to template's default image value)

**Template File Not Found:**
- Show error message: "Template file not found at [path]. Please check plugin settings."
- Block file creation entirely
- Optionally offer to open settings

---

## Plugin Settings

**Configurable Settings:**

1. **Google Places API Key** (required)
   - Text input
   - Used for all API requests
   - Validated on save

2. **Template File Path** (optional)
   - File path input
   - Default: empty (creates note with only populated frontmatter)
   - If specified, must exist or file creation is blocked

3. **Target Folder** (optional)
   - Folder path input
   - Default: root vault
   - Where new place notes are created

4. **Filename Format** (optional)
   - Text input with variable support: `{name}`, `{city}`
   - Default: `{name}`
   - Example: `{city} - {name}` → "Los Angeles - Joe's Pizza.md"

---

## Search Results Display

**Search Result Modal:**
- Display list of matching places
- Each result shows:
  - **Place Name** (bold/prominent)
  - **Address** (formatted_address)
- User clicks/selects a result to proceed
- Maximum results displayed: 10 (or reasonable default from API)

---

## Success Behavior

**After Successful Note Creation:**
- Open the newly created note automatically in the active editor pane
- Note contains populated frontmatter + template content (if template specified)
- User can immediately start filling in personal ratings and notes

---

## Out of Scope (For Later)

**Not Included in MVP:**
- Updating existing notes (only creates new ones)
- Bulk imports
- Offline mode / caching
- Custom field mappings
- Integration with other plugins
- Mobile-specific optimizations
- Rate limiting for API calls

---

## Next Steps

1. **Phase 2:** Create Technical Specification (architecture, data flows, API contracts)
2. **Phase 3:** Break down into Implementation Tasks
3. **Execution:** Generate prompts for Claude Code to build each task

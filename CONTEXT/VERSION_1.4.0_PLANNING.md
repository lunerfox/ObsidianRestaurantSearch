# Version 1.4.0 Planning Document

## User Story
As a user of Obsidian, there are many different types of places that I would like to keep track of. I'd like to be able to define more than one template file to be applied for the Google place search. There should be a command for no template to be applied. In the case where no template is applied, the main information should still be the geo location and address.

## Current State Analysis

### Current Template System
- **Single template**: Users can configure one `templateFilePath` in settings
- **Template loading**: [noteCreator.ts:60-80](src/services/noteCreator.ts#L60-L80)
- **Template parsing**: Extracts YAML frontmatter and body content
- **Template merging**: API data overrides template frontmatter values
- **Fallback behavior**: If no template exists, creates note with `# {placeName}\n\n`

### Current Commands
1. **Search and add place** - Creates note with current template
2. **Search and insert link** - Creates note + inserts wiki-link at cursor
3. **Batch update places** - Updates existing notes with geo data

## Requirements for Version 1.4.0

### Core Requirements
1. ✅ Support multiple template files
2. ✅ Allow users to choose which template to use per search
3. ✅ Provide a "no template" option
4. ✅ When no template is used, still include:
   - Geo location (`location: [lat, lng]`)
   - Address (`address: "..."`)
   - Place name as heading (`# {placeName}`)

### Technical Considerations
- **Backward compatibility**: Users with existing single template should not be affected
- **Settings migration**: Convert `templateFilePath: string` to new structure
- **UI/UX**: Must be intuitive and not add friction to the search flow
- **Template validation**: Handle missing/deleted template files gracefully

---

## Complete User Workflow: Creating and Using Templates

### Example: Adding a "Park" Template

**Step 1: Create the Template File**

User creates a file in their vault at `Templates/park.md`:

```markdown
---
type: park
visited: false
rating-personal:
activities: []
season-best:
---

# Park Notes

## Activities

## Photos

## Wildlife Spotted
```

**Step 2: Register the Template in Settings**

1. Open Settings → Google Places
2. Scroll to "Templates" section
3. Click "[+ Add template]" button
4. New row appears:
   - Template Name: Type "Park"
   - Template File Path: Type "Templates/p..." (autocomplete suggests "Templates/park.md")
   - Select "Templates/park.md"
5. Template is saved automatically

**Step 3: Use the Template**

**Option A - Via Base Command:**
1. Press `Ctrl+P` to open Command Palette
2. Type "Search Google Places"
3. Modal opens with template dropdown
4. Dropdown shows: Restaurant, Cafe, Park, No Template
5. Select "Park" from dropdown
6. Search for "Golden Gate Park"
7. Select the place
8. Note created with park template

**Option B - Via Template-Specific Command:**
1. Press `Ctrl+P` to open Command Palette
2. Type "Search Google Places - Park"
3. Modal opens with "Park" already selected in dropdown
4. Search for "Golden Gate Park"
5. Select the place
6. Note created with park template

**Option C - Assign Hotkey (Power User):**
1. Open Settings → Hotkeys
2. Search for "Search Google Places - Park"
3. Assign `Ctrl+Shift+P`
4. Press `Ctrl+Shift+P` → Modal opens with Park pre-selected
5. Search and create note

**Step 4: Result**

File created at `Places/Golden Gate Park.md`:

```markdown
---
type: park
visited: false
rating-personal:
activities: []
season-best:
address: Golden Gate Park, San Francisco, CA
location: [37.7694, -122.4862]
link: https://maps.google.com/?q=place_id:ChIJW9H...
city: San Francisco
rating-google: 4.8
image: [[attachments/places/golden-gate-park.jpg]]
---

# Park Notes

## Activities

## Photos

## Wildlife Spotted
```

Note how:
- Template frontmatter is merged with API data
- API data (address, location, etc.) overrides template values
- Template body content is preserved
- User can now fill in "Park Notes", "Activities", etc.

---

## Template File Structure

Templates are regular markdown files that users create in their vault. They can contain:

### 1. Frontmatter (Optional)
```yaml
---
key1: value1
key2: value2
custom_array: []
---
```

**Merging Behavior:**
- Template frontmatter provides default values
- API-fetched data (address, location, rating, etc.) always overrides template values
- Custom template keys (not from API) are preserved

### 2. Body Content (Optional)
```markdown
# My Custom Heading

## Section 1

Content here...

## Section 2
```

**Merging Behavior:**
- Body content is appended after frontmatter
- If no template, default body is just `# {PlaceName}\n\n`

### 3. No Template
When "No Template" is selected:
```markdown
---
address: 123 Main St, San Francisco, CA
location: [37.7749, -122.4194]
link: https://maps.google.com/?q=place_id:...
city: San Francisco
rating-google: 4.5
cuisine: [Italian]
image: [[attachments/places/restaurant-name.jpg]]
phone: +1 555-123-4567
isClosed: false
---

# Restaurant Name

```

Only essential geo data is included, no custom fields or body content.

---

## UI Options for Multi-Template Selection

I've identified 4 potential approaches. Let's discuss which one fits your workflow best:

---

### Option A: Named Templates with Dropdown Selection

**How it works:**
- Settings UI allows users to define multiple named templates (e.g., "Restaurant", "Cafe", "Park", "No Template")
- When searching for a place, a dropdown appears in the modal to select which template to use
- Last-used template is remembered as default for next search

**Settings UI:**
```
Templates
┌─────────────────────────────────────────────────┐
│ Template Name    │ Template File Path           │
├──────────────────┼──────────────────────────────┤
│ Restaurant       │ Templates/restaurant.md      │
│ Cafe             │ Templates/cafe.md            │
│ Park             │ Templates/park.md            │
│ No Template      │ (none)                       │
└─────────────────────────────────────────────────┘
[+ Add Template] [- Remove]
```

**Search Modal UI:**
```
┌─────────────────────────────────────────────────┐
│ Search Google Places                            │
├─────────────────────────────────────────────────┤
│ Template: [Restaurant ▼]                        │
│                                                 │
│ Search query: [________________] [Search]       │
│                                                 │
│ Results:                                        │
│ • Restaurant name 1                             │
│ • Restaurant name 2                             │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Most flexible - user chooses template each time
- ✅ Clear template names (better UX than file paths)
- ✅ Easy to add "No Template" option
- ✅ Can rename templates without changing file paths

**Cons:**
- ⚠️ Adds one extra click per search (selecting template)
- ⚠️ More complex settings UI
- ⚠️ Requires remembering which template to use

**Implementation Complexity:** Medium-High

---

### Option B: Automatic Template by Place Type

**How it works:**
- Settings UI maps Google place types to templates
- Plugin automatically selects template based on the place's primary type
- Falls back to default template or "no template" if no match

**Settings UI:**
```
Template Mappings
┌─────────────────────────────────────────────────┐
│ Place Type           │ Template File Path       │
├──────────────────────┼──────────────────────────┤
│ restaurant           │ Templates/restaurant.md  │
│ cafe                 │ Templates/cafe.md        │
│ bar                  │ Templates/bar.md         │
│ park                 │ Templates/park.md        │
│ tourist_attraction   │ Templates/attraction.md  │
└─────────────────────────────────────────────────┘

Default template: [Templates/default.md]
☐ Use no template if no match found
```

**Search Modal UI:**
```
┌─────────────────────────────────────────────────┐
│ Search Google Places                            │
├─────────────────────────────────────────────────┤
│ Search query: [________________] [Search]       │
│                                                 │
│ Results:                                        │
│ • Restaurant name 1                             │
│   (will use: restaurant.md)                     │
│ • Park name 1                                   │
│   (will use: park.md)                           │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Zero friction - fully automatic
- ✅ Smart defaults based on place type
- ✅ No extra UI in search modal
- ✅ Leverages existing Google Places type data

**Cons:**
- ⚠️ Less control - can't override automatic selection
- ⚠️ Need to know Google's place type taxonomy
- ⚠️ What if a place has multiple types? (e.g., "restaurant" + "bar")
- ⚠️ Complex settings UI for mappings

**Implementation Complexity:** Medium

---

### Option C: Command-Based Template Selection

**How it works:**
- Create separate commands for each template
- Users choose template by selecting the appropriate command from Command Palette
- Add a "Search places (no template)" command

**Command Palette:**
```
> Search Google Places - Restaurant template
> Search Google Places - Cafe template
> Search Google Places - Park template
> Search Google Places - No template
> Search Google Places - Insert link (Restaurant)
> Search Google Places - Insert link (Cafe)
...
```

**Settings UI:**
```
Templates
┌─────────────────────────────────────────────────┐
│ Template Name    │ Template File Path           │
├──────────────────┼──────────────────────────────┤
│ Restaurant       │ Templates/restaurant.md      │
│ Cafe             │ Templates/cafe.md            │
│ Park             │ Templates/park.md            │
└─────────────────────────────────────────────────┘
[+ Add Template]

☑ Create commands for each template
☑ Create "no template" command
```

**Pros:**
- ✅ No modal UI changes needed
- ✅ Uses existing Obsidian command system
- ✅ Can assign hotkeys to frequently-used templates
- ✅ Clear template choice before search starts

**Cons:**
- ⚠️ Command Palette gets crowded with many templates
- ⚠️ Need to restart command if you pick wrong template
- ⚠️ Doubles the number of commands (search + insert link variants)
- ⚠️ Can't dynamically see which template you'll use while viewing results

**Implementation Complexity:** Low-Medium

---

### Option D: Hybrid - Default Template + Override in Modal

**How it works:**
- Settings define a default template per place type (automatic)
- Search modal shows the auto-selected template with option to override
- Dropdown only appears if user wants to change the default

**Settings UI:**
```
Default Template Mapping
┌─────────────────────────────────────────────────┐
│ Place Type           │ Template                 │
├──────────────────────┼──────────────────────────┤
│ restaurant           │ [restaurant.md ▼]        │
│ cafe                 │ [cafe.md ▼]              │
│ bar                  │ [restaurant.md ▼]        │
│ park                 │ [park.md ▼]              │
│ (no match)           │ [No Template ▼]          │
└─────────────────────────────────────────────────┘

Available Templates:
- restaurant.md
- cafe.md
- park.md
- No Template
[+ Add Template]
```

**Search Modal UI:**
```
┌─────────────────────────────────────────────────┐
│ Search Google Places                            │
├─────────────────────────────────────────────────┤
│ Search query: [________________] [Search]       │
│                                                 │
│ Results:                                        │
│ • The French Laundry                            │
│   123 Main St, Yountville                       │
│   Template: Restaurant ▼                        │
│   [Select]                                      │
│                                                 │
│ • Blue Bottle Coffee                            │
│   456 Oak Ave, San Francisco                    │
│   Template: Cafe ▼                              │
│   [Select]                                      │
└─────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Best of both worlds - smart defaults + manual override
- ✅ Minimal friction for typical use (just click Select)
- ✅ Full control when needed
- ✅ Template selection happens with full context (you see the place details)

**Cons:**
- ⚠️ Most complex implementation
- ⚠️ Settings UI for type mappings can be complex
- ⚠️ Results list gets more crowded with dropdowns

**Implementation Complexity:** High

---

## Comparison Matrix

| Aspect | Option A | Option B | Option C | Option D |
|--------|----------|----------|----------|----------|
| User Friction | Medium | Low | Low | Low |
| Flexibility | High | Low | High | High |
| Automation | None | Full | None | Partial |
| Settings Complexity | Medium | High | Low | High |
| Modal UI Changes | Simple dropdown | None/Indicator | None | Dropdown per result |
| Hotkey Support | No | Yes (one cmd) | Yes (per template) | Yes (one cmd) |
| Learning Curve | Low | Medium | Low | Medium |
| Implementation Time | 2-3 days | 2-3 days | 1-2 days | 3-4 days |

---

## Recommended Approach: Option A + C Hybrid

**Combining Option A (Named Templates with Dropdown) and Option C (Command-Based Selection)** provides the best user experience:

### How It Works

1. **Base command with dropdown** (Option A):
   - Single "Search Google Places" command opens modal with template dropdown
   - User can change template before or after searching
   - One hotkey serves all use cases

2. **Template-specific commands** (Option C):
   - Additional commands like "Search Google Places - Restaurant"
   - Pre-selects the template in the dropdown
   - Users can still change it if needed
   - Allows multiple hotkeys for frequently-used templates

3. **"No Template" command**:
   - Dedicated command that pre-selects "No Template"
   - Perfect for quick POI capturing

### Benefits of This Hybrid

1. **Maximum flexibility**: Choose between one hotkey + dropdown OR dedicated hotkeys per template
2. **No redundancy**: Commands don't duplicate functionality—they just set the default selection
3. **Progressive disclosure**: New users use one command, power users can add template-specific hotkeys
4. **Consistent UX**: All paths lead to the same modal with the same dropdown
5. **Future-proof**: Easy to add "remember last used" or "smart suggestions"

### User Workflows

**Casual User:**
```
Ctrl+P → "Search Google Places" → Modal opens (dropdown shows last used)
→ Search "blue bottle coffee" → Change dropdown if needed → Select place
```

**Power User:**
```
Ctrl+Shift+R → "Search Google Places - Restaurant" → Modal opens (Restaurant pre-selected)
→ Search query → Select place (or change template if wrong type)

Ctrl+Shift+C → "Search Google Places - Cafe" → Modal opens (Cafe pre-selected)
→ Search query → Select place
```

**Quick Capture:**
```
Ctrl+Shift+N → "Search Google Places - No Template" → Modal opens (No Template pre-selected)
→ Search "golden gate park" → Select place (just geo + address)
```

### Implementation Notes

- Single dropdown at top of search modal (not per-result)
- Dropdown applies to whichever place you select
- Commands are generated dynamically based on templates in settings
- Simple list UI in settings (no complex table)

---

## Migration Strategy

### For Existing Users
```typescript
// Old settings
{
  templateFilePath: "Templates/restaurant.md"
}

// Auto-migrate to new settings
{
  templates: [
    { name: "Default", path: "Templates/restaurant.md" }
  ],
  defaultTemplate: 0 // index of default template
}
```

### Settings Interface Changes
```typescript
// Before
interface GooglePlacesPluginSettings {
  templateFilePath: string;
  // ...
}

// After
interface GooglePlacesPluginSettings {
  templates: Array<{
    name: string;
    path: string; // empty string = no template
  }>;
  defaultTemplate: number; // index, or -1 for "No Template"
  // Remove: templateFilePath (deprecated, auto-migrated)
}
```

---

## Implementation Plan (Option A + C Hybrid)

### Phase 1: Settings Data Structure
- [ ] Update `GooglePlacesPluginSettings` interface to support template array
- [ ] Add migration logic in `loadSettings()` to convert old `templateFilePath` to new format
- [ ] Update default settings to include sample templates
- [ ] Add "No Template" as built-in option

**Files to modify:**
- [src/types/index.ts](src/types/index.ts) - Settings interface
- [src/main.ts](src/main.ts#L93-L100) - Migration logic

### Phase 2: Settings UI

The Settings UI will allow users to define and manage their templates.

**User Workflow:**
1. Open plugin settings
2. Navigate to "Templates" section
3. Click "Add template" button
4. Enter template name (e.g., "Park", "Restaurant", "Cafe")
5. Select template file path using autocomplete file picker
6. Click checkmark or press Enter to save
7. Repeat for additional templates

**Settings UI Mock-up:**
```
┌─────────────────────────────────────────────────────────────┐
│ Google Places Plugin Settings                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Templates                                                   │
│ ─────────                                                   │
│ Define templates for different types of places. Each       │
│ template can be selected when creating a new place note.   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Template Name          Template File Path           │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │ Restaurant             Templates/restaurant.md    [×]│   │
│ │ Cafe                   Templates/cafe.md          [×]│   │
│ │ Park                   Templates/park.md          [×]│   │
│ │ No Template            (Built-in - no file)          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add template]                                            │
│                                                             │
│ ☑ Remember last used template                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Adding a New Template (Expanded View):**
```
┌─────────────────────────────────────────────────────────────┐
│ Templates                                                   │
│ ─────────                                                   │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Template Name          Template File Path           │   │
│ ├─────────────────────────────────────────────────────┤   │
│ │ Restaurant             Templates/restaurant.md    [×]│   │
│ │ Cafe                   Templates/cafe.md          [×]│   │
│ │ Park                   Templates/park.md          [×]│   │
│ │ ┌────────────────┐   ┌─────────────────────────┐   │   │
│ │ │ Museum         │   │ Templates/museum.md     │ [✓]│   │
│ │ └────────────────┘   └─────────────────────────┘   │   │
│ │ No Template            (Built-in - no file)          │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [+ Add template]                                            │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Details:**
- [ ] Create template list UI with add/remove buttons
- [ ] Add text input for template name
- [ ] Add FileSuggest for template path (reuse existing component)
- [ ] Add validation (no duplicate names, valid paths)
- [ ] Show "No Template" option (built-in, can't be deleted)
- [ ] Add setting for "Remember last used template"
- [ ] Each template row shows: name input, path input, delete button
- [ ] "Add template" button adds a new editable row
- [ ] Changes save automatically (like other Obsidian settings)

**Files to modify:**
- [src/settings.ts](src/settings.ts#L40-L52) - Template UI section

**Technical Notes:**
- Similar UX to how Obsidian's core "Templates" plugin manages folder paths
- FileSuggest will autocomplete markdown files from vault
- Template files are standard markdown files with frontmatter
- Users create the template files themselves in their vault
- No validation that template file exists until it's used (graceful degradation)

### Phase 3: NoteCreator Changes
- [ ] Modify `loadTemplate()` to accept template path parameter
- [ ] Update `createNote()` to accept template selection
- [ ] Handle empty template path (no template mode)
- [ ] Ensure minimal note structure when no template: frontmatter (location, address) + heading

**Files to modify:**
- [src/services/noteCreator.ts](src/services/noteCreator.ts#L60-L80) - Template loading

### Phase 4: Modal UI (Dropdown)
- [ ] Add template dropdown at top of PlaceSearchModal
- [ ] Load available templates from settings
- [ ] Accept initial template selection from command parameter
- [ ] Allow user to change template selection in modal
- [ ] Pass selected template to `createNote()`
- [ ] Persist last-used template (if setting enabled)

**Files to modify:**
- [src/modal.ts](src/modal.ts) - Add dropdown UI

### Phase 5: Dynamic Command Registration
- [ ] Unregister old commands and re-register when settings change
- [ ] Generate base command: "Search Google Places" (no pre-selection, uses last-used or first)
- [ ] Generate template-specific commands for each template: "Search Google Places - {name}"
- [ ] Generate "No Template" command: "Search Google Places - No template"
- [ ] Also generate "insert link" variants for all commands
- [ ] Pass template selection to modal on command invocation

**Files to modify:**
- [src/main.ts](src/main.ts#L34-L58) - Command registration

### Phase 6: Insert Link Command Updates
- [ ] Update "insert link" command to support all templates
- [ ] Generate dynamic commands: "Search and insert link - {template name}"
- [ ] Maintain same behavior: create note + insert wiki-link

**Files to modify:**
- [src/main.ts](src/main.ts#L44-L50) - Insert link commands

### Phase 7: Testing & Polish
- [ ] Test migration from old settings format
- [ ] Test with no templates defined (should show "No Template" option)
- [ ] Test with "No Template" option creates minimal note
- [ ] Test template switching during search
- [ ] Test all dynamically generated commands
- [ ] Test command hotkey assignments work correctly
- [ ] Verify "insert link" variants work with all templates
- [ ] Update plugin description and README

### Phase 8: Documentation
- [ ] Update README with multi-template feature
- [ ] Add examples of template configurations
- [ ] Document command naming convention
- [ ] Update CHANGELOG.md with version 1.4.0 entry

---

## Questions for Discussion

### Resolved
- ✅ **UI Approach**: Option A + C Hybrid confirmed

### Remaining Questions

1. **Template naming:**
   - Should we enforce unique template names? (Recommended: Yes)
   - Maximum name length? (Recommended: 50 characters)
   - Allowed characters? (Recommended: Alphanumeric + spaces + hyphens)

2. **Default behavior:**
   - What should happen if no templates are configured?
     - Option 1: Only show "No Template" option
     - Option 2: Show a helpful message in settings to add templates
   - Should there be a "remember my last choice" option? (Recommended: Yes, as a setting)

3. **Batch Update:**
   - Should batch update also support template selection?
   - Or always use "no template" since we're updating existing notes?
   - **Recommendation**: Always use "no template" - batch update only adds missing geo data

4. **Command naming convention:**
   - Format: "Search Google Places - {Template Name}"?
   - Or: "Search places ({Template Name})"?
   - Or: "{Template Name} place search"?
   - **Recommendation**: "Search Google Places - {Template Name}" for consistency

5. **Insert link command naming:**
   - Format: "Search and insert link - {Template Name}"?
   - Or: "Insert place link - {Template Name}"?
   - **Recommendation**: "Search and insert link - {Template Name}"

6. **Initial default template:**
   - After migration, which template should be selected by default?
     - First in list?
     - Last used?
     - "No Template"?
   - **Recommendation**: First template in list (or migrated template)

---

## File Changes Required

### New/Modified Files
- [src/types/index.ts](src/types/index.ts) - Update settings interface
- [src/settings.ts](src/settings.ts) - Template list UI
- [src/services/noteCreator.ts](src/services/noteCreator.ts) - Template parameter support
- [src/modal.ts](src/modal.ts) - Template dropdown UI
- [src/main.ts](src/main.ts) - Settings migration, new command
- [README.md](README.md) - Documentation update
- [CHANGELOG.md](CHANGELOG.md) - Version 1.4.0 entry

### Testing Files to Add/Update
- `tests/unit/settings.test.ts` - Test settings migration
- `tests/unit/noteCreator.test.ts` - Test template selection
- `tests/integration/template-selection.test.ts` - End-to-end test

---

## Success Criteria

Version 1.4.0 will be successful when:
- ✅ Users can define multiple named templates in settings
- ✅ Users can choose which template to use during place search
- ✅ Users can create notes without any template (geo + address only)
- ✅ Existing users' single template is auto-migrated seamlessly
- ✅ All existing tests pass
- ✅ New tests cover template selection logic
- ✅ Documentation is updated

---

## Timeline Estimate (Option A + C Hybrid)

- **Phase 1** (Settings Data Structure): 2-3 hours
- **Phase 2** (Settings UI): 4-6 hours
- **Phase 3** (NoteCreator Changes): 2-3 hours
- **Phase 4** (Modal UI - Dropdown): 3-4 hours
- **Phase 5** (Dynamic Command Registration): 4-5 hours
- **Phase 6** (Insert Link Command Updates): 2-3 hours
- **Phase 7** (Testing & Polish): 5-7 hours
- **Phase 8** (Documentation): 2-3 hours

**Total**: 24-34 hours of development time

### Phase Breakdown

**Quick Wins (Can be done first):**
- Phase 1: Settings data structure and migration
- Phase 3: NoteCreator template parameter support

**Core Functionality:**
- Phase 2: Settings UI for template management
- Phase 4: Modal dropdown implementation
- Phase 5: Dynamic command generation

**Polish:**
- Phase 6: Insert link variants
- Phase 7: Comprehensive testing
- Phase 8: Documentation updates

---

## Next Steps

1. **Review this document** and choose preferred UI option
2. **Discuss questions** listed above
3. **Finalize requirements** based on discussion
4. **Begin implementation** following the chosen option's plan

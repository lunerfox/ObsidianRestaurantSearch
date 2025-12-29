# Release Process

This document describes how to create a new release of the Google Places Search plugin.

## ⚠️ Important: Obsidian Plugin Versioning Requirements

**CRITICAL:** Obsidian plugins have specific versioning requirements:

1. **GitHub release tags must NOT include a 'v' prefix**
   - ✅ Correct: `1.5.2`
   - ❌ Wrong: `v1.5.2`

2. **Tags must exactly match the version in manifest.json**
   - The tag must be the exact version number with no prefix

3. **Required release assets:**
   - `main.js` (compiled plugin code)
   - `manifest.json` (plugin metadata)
   - `styles.css` (plugin styles)

These requirements are enforced by Obsidian's plugin update mechanism. Releases that don't follow these rules will not be recognized by Obsidian.

## Automated Release (Recommended)

The plugin includes automated release scripts that handle the entire release process and ensure compliance with Obsidian's requirements.

### Prerequisites

1. **GitHub CLI** must be installed and authenticated
   - Install: https://cli.github.com/
   - Authenticate: `gh auth login`

2. **Clean working directory**
   - All changes must be committed
   - No uncommitted or staged changes

3. **On main branch** (recommended)
   - The script will warn if you're not on main but will allow you to continue

### Steps

1. **Update version numbers** in these files:
   - `manifest.json` - Update `version` field
   - `package.json` - Update `version` field
   - `versions.json` - Add new version entry
   - `CHANGELOG.md` - Add release notes for the new version

2. **Commit the version changes**:
   ```bash
   git add manifest.json package.json versions.json CHANGELOG.md
   git commit -m "Release version X.Y.Z"
   git push github main
   ```

3. **Run the release script**:

   **On Windows:**
   ```cmd
   release.bat
   ```

   **On Linux/Mac:**
   ```bash
   npm run release
   # or
   ./release.sh
   ```

### What the Script Does

1. Validates that you're on the main branch (with option to override)
2. Checks for uncommitted changes (fails if any exist)
3. Runs `npm run build` to build the plugin
4. Verifies required files exist:
   - `dist/main.js`
   - `manifest.json`
   - `styles.css`
5. Creates a git tag **without 'v' prefix** (e.g., `1.5.2` - required by Obsidian)
6. Pushes the tag to GitHub
7. Extracts release notes from CHANGELOG.md
8. Creates a GitHub release with:
   - Release title
   - Release notes from CHANGELOG
   - Attached assets (main.js, manifest.json, styles.css)
9. Displays the release URL

## Manual Release

If you prefer to create releases manually or the automated script fails:

1. **Build the plugin**:
   ```bash
   npm run build
   ```

2. **Create and push a git tag** (⚠️ NO 'v' prefix - required by Obsidian):
   ```bash
   git tag -a 1.5.2 -m "Release version 1.5.2"
   git push github 1.5.2
   ```

3. **Create a GitHub release**:
   - Go to https://github.com/lunerfox/ObsidianRestaurantSearch/releases/new
   - **IMPORTANT:** Use tag `1.5.2` (NOT `v1.5.2`)
   - Set the release title (e.g., "Version 1.5.2")
   - Copy release notes from CHANGELOG.md
   - Attach these files:
     - `dist/main.js`
     - `manifest.json`
     - `styles.css`
   - Publish the release

## After Release

1. Users with the plugin installed will be notified of the update
2. New users can discover it in the Obsidian Community Plugins browser
3. The release assets are automatically downloaded when users update

## Troubleshooting

### "GitHub CLI not installed"
- Install GitHub CLI: https://cli.github.com/
- Authenticate: `gh auth login`

### "You have uncommitted changes"
- Commit all changes before releasing
- Or stash them: `git stash`

### "Failed to push tag"
- Check your git remote configuration
- Verify you have push access to the repository

### "Failed to create GitHub release"
- The tag has been created but the release failed
- You can either:
  - Fix the error and run the script again
  - Create the release manually using the GitHub web interface

### Build fails
- Check test results: `npm run test:ci`
- Check TypeScript errors: `npm run typecheck`
- Fix any errors before releasing

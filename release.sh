#!/bin/bash
# Automated release script for Obsidian plugin
# This script creates a GitHub release with the required assets

set -e

echo "========================================"
echo "Obsidian Plugin Release Script"
echo "========================================"
echo ""

# Get version from manifest.json
VERSION=$(grep -o '"version": *"[^"]*"' manifest.json | sed 's/"version": *"\(.*\)"/\1/')

echo "Current version: $VERSION"
echo ""

# Check if we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
    echo "WARNING: You are not on the main branch!"
    echo "Current branch: $BRANCH"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "ERROR: You have uncommitted changes"
    echo "Please commit or stash your changes before creating a release"
    exit 1
fi

echo "Building the plugin..."
npm run build

echo ""
echo "Checking required files..."
if [ ! -f "dist/main.js" ]; then
    echo "ERROR: dist/main.js not found"
    exit 1
fi
if [ ! -f "manifest.json" ]; then
    echo "ERROR: manifest.json not found"
    exit 1
fi
if [ ! -f "styles.css" ]; then
    echo "ERROR: styles.css not found"
    exit 1
fi

echo "All required files found"
echo ""

# Create git tag
echo "Creating git tag v$VERSION..."
git tag -a "v$VERSION" -m "Release version $VERSION"

echo "Pushing tag to remote..."
git push github "v$VERSION"

echo ""
echo "Creating GitHub release..."

# Extract release notes from CHANGELOG.md
RELEASE_NOTES=$(awk "/## \[$VERSION\]/,/^## \[/" CHANGELOG.md | sed '$d')

if [ -z "$RELEASE_NOTES" ]; then
    RELEASE_NOTES="Release version $VERSION"
fi

# Create release with assets using GitHub CLI
gh release create "v$VERSION" \
    --title "Version $VERSION" \
    --notes "$RELEASE_NOTES" \
    dist/main.js \
    manifest.json \
    styles.css

echo ""
echo "========================================"
echo "Release v$VERSION created successfully!"
echo "========================================"
echo ""
echo "The release is available at:"
echo "https://github.com/lunerfox/ObsidianRestaurantSearch/releases/tag/v$VERSION"
echo ""

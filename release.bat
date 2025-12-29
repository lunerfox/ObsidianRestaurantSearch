@echo off
REM Automated release script for Obsidian plugin
REM This script creates a GitHub release with the required assets

setlocal enabledelayedexpansion

echo ========================================
echo Obsidian Plugin Release Script
echo ========================================
echo.

REM Get version from manifest.json
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"version\"" manifest.json') do (
    set VERSION=%%a
    set VERSION=!VERSION:"=!
)

echo Current version: %VERSION%
echo.

REM Check if we're on main/master branch
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%a
if not "%BRANCH%"=="main" if not "%BRANCH%"=="master" (
    echo WARNING: You are not on the main/master branch!
    echo Current branch: %BRANCH%
    echo.
    choice /C YN /M "Do you want to continue anyway"
    if errorlevel 2 exit /b 1
)

REM Check for uncommitted changes
git diff-index --quiet HEAD --
if errorlevel 1 (
    echo ERROR: You have uncommitted changes
    echo Please commit or stash your changes before creating a release
    exit /b 1
)

echo Building the plugin...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    exit /b 1
)

echo.
echo Checking required files...
if not exist "dist\main.js" (
    echo ERROR: dist\main.js not found
    exit /b 1
)
if not exist "manifest.json" (
    echo ERROR: manifest.json not found
    exit /b 1
)
if not exist "styles.css" (
    echo ERROR: styles.css not found
    exit /b 1
)

echo All required files found
echo.

REM Create git tag (Obsidian requires tags WITHOUT 'v' prefix)
echo Creating git tag %VERSION%...
git tag -a %VERSION% -m "Release version %VERSION%"
if errorlevel 1 (
    echo ERROR: Failed to create git tag
    exit /b 1
)

echo Pushing tag to remote...
git push github %VERSION%
if errorlevel 1 (
    echo ERROR: Failed to push tag
    echo Rolling back tag creation...
    git tag -d %VERSION%
    exit /b 1
)

echo.
echo Creating GitHub release...

REM Extract release notes from CHANGELOG.md
powershell -Command "$changelog = Get-Content CHANGELOG.md -Raw; $pattern = '## \[%VERSION%\][\s\S]*?(?=\n## \[|$)'; if ($changelog -match $pattern) { $matches[0] } else { 'Release version %VERSION%' }" > release-notes.tmp

REM Create release with assets using GitHub CLI (Obsidian requires tags WITHOUT 'v' prefix)
gh release create %VERSION% ^
    --title "Version %VERSION%" ^
    --notes-file release-notes.tmp ^
    dist\main.js ^
    manifest.json ^
    styles.css

if errorlevel 1 (
    echo ERROR: Failed to create GitHub release
    echo Tag has been pushed but release creation failed
    echo You may need to create the release manually or fix the error and try again
    del release-notes.tmp
    exit /b 1
)

REM Clean up
del release-notes.tmp

echo.
echo ========================================
echo Release %VERSION% created successfully!
echo ========================================
echo.
echo The release is available at:
echo https://github.com/lunerfox/ObsidianRestaurantSearch/releases/tag/%VERSION%
echo.

endlocal

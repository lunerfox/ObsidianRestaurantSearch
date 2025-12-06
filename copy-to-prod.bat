@echo off
REM Copy plugin files to development vault
echo Copying files to development vault...

set SOURCE_DIR=C:\Users\CousCous\Documents\Dev\ObsidianGoogleRestaurantSearch\dist
set TARGET_DIR=C:\Users\CousCous\Documents\Leo Szeto\.obsidian\plugins\google-places-obsidian

REM Create target directory if it doesn't exist
if not exist "%TARGET_DIR%" (
    echo Creating target directory...
    mkdir "%TARGET_DIR%"
)

REM Copy manifest.json
copy /Y "%SOURCE_DIR%\..\manifest.json" "%TARGET_DIR%\manifest.json" >nul
if errorlevel 1 (
    echo Failed to copy manifest.json
    exit /b 1
)

REM Copy styles.css
copy /Y "%SOURCE_DIR%\..\styles.css" "%TARGET_DIR%\styles.css" >nul
if errorlevel 1 (
    echo Failed to copy styles.css
    exit /b 1
)

REM Copy main.js
copy /Y "%SOURCE_DIR%\main.js" "%TARGET_DIR%\main.js" >nul
if errorlevel 1 (
    echo Failed to copy main.js
    exit /b 1
)

echo Successfully copied files to development vault!
pause
exit /b 0

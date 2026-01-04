@echo off
REM Build script for Quack Chrome Extension
REM Creates a ZIP file ready for Chrome Web Store submission

setlocal EnableDelayedExpansion

REM Get version from manifest.json
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"version\"" manifest.json') do (
    set VERSION=%%~a
    set VERSION=!VERSION: =!
    set VERSION=!VERSION:"=!
)

set ZIP_NAME=quack_v%VERSION%.zip

echo Building Quack v%VERSION%...

REM Delete old zip if exists
if exist "%ZIP_NAME%" del "%ZIP_NAME%"

REM Create zip using PowerShell
powershell -Command "Compress-Archive -Path 'manifest.json', 'popup.html', 'icon.png', 'src' -DestinationPath '%ZIP_NAME%' -Force"

if exist "%ZIP_NAME%" (
    echo.
    echo ========================================
    echo SUCCESS: Created %ZIP_NAME%
    echo ========================================
    echo.
    echo Ready to upload to Chrome Web Store!
) else (
    echo.
    echo ERROR: Failed to create ZIP file
    exit /b 1
)

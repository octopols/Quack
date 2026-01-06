#!/bin/bash
# Build script for Quack extension
# Creates a distributable zip file in the compiled/ directory

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to root directory
cd "$ROOT_DIR"

# Extract version from manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from manifest.json"
    exit 1
fi

echo "Building Quack v${VERSION}..."

# Create compiled directory if it doesn't exist
mkdir -p compiled

# Output filename
OUTPUT="compiled/quack-v${VERSION}.zip"

# Remove existing zip if present
rm -f "$OUTPUT"

# Create the zip file
zip -r "$OUTPUT" \
    manifest.json \
    popup.html \
    icon.png \
    src/ \
    icons/ \
    -x "*.DS_Store" \
    -x "*/__MACOSX/*" \
    -x "*.git*"

echo "✓ Created: $OUTPUT"
echo "✓ Size: $(du -h "$OUTPUT" | cut -f1)"

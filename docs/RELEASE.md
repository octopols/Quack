# Release Process

## Quick Links

- **Chrome Web Store**: [Quack Extension](https://chromewebstore.google.com/detail/oeapkmnljmmoldmaigbpccoibbkenapg)
- **GitHub Releases**: [All Releases](https://github.com/octopols/quack/releases)

## Version Information

| Location | How to Check |
|----------|--------------|
| Chrome Web Store | Visit the [store page](https://chromewebstore.google.com/detail/oeapkmnljmmoldmaigbpccoibbkenapg) |
| Latest GitHub Release | Check [releases page](https://github.com/octopols/quack/releases/latest) |
| Code (unreleased) | `manifest.json` → `"version"` field |
| Installed Extension | `chrome://extensions/` → Find Quack → Version shown |

> **Note**: Chrome Web Store may lag behind GitHub releases by 1-3 days due to review process.

## Quick Release

1. Go to Actions → Version Bump
2. Select version type (patch/minor/major)
3. Run workflow
4. Automation handles the rest

## What Happens Automatically

### Version Bump Workflow
- Updates version in manifest.json
- Updates CHANGELOG.md
- Creates and pushes git tag
- Triggers release workflow

### Release Workflow
- Validates manifest version
- Creates extension package (zip)
- Generates source archive
- Creates GitHub release with changelog

### Chrome Web Store Upload
- Creates web store package
- Uploads to Chrome Web Store
- Requires manual publish after review

## Building Locally

### Create Extension Package

```bash
# From repository root
./scripts/build.sh
```

Output: `compiled/quack-v{version}.zip`

### Manual Build (if script unavailable)

```bash
# Create compiled directory
mkdir -p compiled

# Get version from manifest
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

# Create zip
zip -r "compiled/quack-v${VERSION}.zip" \
  manifest.json \
  popup.html \
  icon.png \
  src/ \
  icons/ \
  -x "*.DS_Store" -x "*/.git/*"
```

## Manual Release

If automation fails:

```bash
# Update manifest.json version
vim manifest.json

# Update CHANGELOG.md
vim docs/CHANGELOG.md

# Commit and tag
git add manifest.json docs/CHANGELOG.md
git commit -m "Bump version to v3.2.2"
git tag v3.2.2
git push origin main --tags
```

## Versioning

- **Patch** (3.2.1 → 3.2.2): Bug fixes
- **Minor** (3.2.2 → 3.3.0): New features
- **Major** (3.3.0 → 4.0.0): Breaking changes

## Required Secrets

For Chrome Web Store automation:
- `CHROME_EXTENSION_ID`: `oeapkmnljmmoldmaigbpccoibbkenapg`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

Without these, GitHub releases work but Chrome Web Store upload fails.

## Pre-Release Checklist

1. [ ] Test extension locally on multiple videos
2. [ ] Verify search works (with replies, case sensitivity)
3. [ ] Test all 7 sort options
4. [ ] Check console for errors
5. [ ] Test settings persistence
6. [ ] Test both light/dark themes
7. [ ] Verify SPA navigation handling

## Troubleshooting

**Version mismatch**: Ensure manifest.json version matches git tag exactly

**Release fails**: Check CHANGELOG.md format `## [X.Y.Z] - YYYY-MM-DD`

**Upload fails**: Verify secrets are set and package is under 10MB

**Build fails**: Ensure `compiled/` directory exists

# Release Process

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
- Creates extension package
- Generates source archive
- Creates GitHub release with changelog

### Chrome Web Store Upload
- Creates web store package
- Uploads to Chrome Web Store
- Requires manual publish after review

## Manual Release

If automation fails:

```bash
# Update manifest.json version
vim manifest.json

# Update CHANGELOG.md
vim CHANGELOG.md

# Commit and tag
git add manifest.json CHANGELOG.md
git commit -m "Bump version to v3.1.0"
git tag v3.1.0
git push origin v3.1.0
```

## Versioning

- **Patch** (3.1.1): Bug fixes
- **Minor** (3.2.0): New features
- **Major** (4.0.0): Breaking changes

## Required Secrets

For Chrome Web Store automation:
- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

Without these, GitHub releases work but Chrome Web Store upload fails.

## Pre-Release Checklist

1. Test extension locally
2. Verify on multiple YouTube videos
3. Check console for errors
4. Test settings persistence
5. Test both light/dark themes

## Troubleshooting

**Version mismatch**: Ensure manifest.json version matches git tag exactly
**Release fails**: Check CHANGELOG.md format `## [X.Y.Z] - YYYY-MM-DD`
**Upload fails**: Verify secrets are set and package is under 10MB

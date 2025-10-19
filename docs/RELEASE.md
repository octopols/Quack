# Release Process

This document explains how to create releases for Quack and what gets automated.

## Quick Release

1. Go to Actions → Version Bump → Run workflow
2. Select version type (patch/minor/major)
3. Add changelog entry if needed
4. Wait for automation to handle the rest

That's it. Everything else is automated.

## What Happens Automatically

### Version Bump Workflow

When you run the version bump workflow:

1. **Updates version** in manifest.json
2. **Updates README badge** to match new version
3. **Converts [Unreleased] to [VERSION]** in CHANGELOG.md
4. **Creates new [Unreleased] section** for next changes
5. **Commits changes** and pushes to main
6. **Creates and pushes git tag** (triggers release)

### Release Workflow

Triggered automatically when a version tag is pushed:

1. **Validates manifest version** matches the git tag
2. **Creates clean extension package** (removes .git, .github, screenshots, etc.)
3. **Generates source archive** for Chrome Web Store review
4. **Extracts changelog** from CHANGELOG.md for release notes
5. **Creates GitHub release** with both packages attached

### Chrome Web Store Upload

Triggered when a GitHub release is published:

1. **Creates web store package** (only essential files)
2. **Validates package size** (must be under 10MB)
3. **Uploads to Chrome Web Store** (pending review)
4. **Requires manual publish** after Google's review

## Manual Release (If Needed)

If automation fails or you need manual control:

```bash
# Update version in manifest.json first
vim manifest.json

# Update CHANGELOG.md
vim CHANGELOG.md

# Commit changes
git add manifest.json CHANGELOG.md README.md
git commit -m "Bump version to v2.0.1"

# Create and push tag
git tag v2.0.1
git push origin v2.0.1
```

The tag push will trigger the release workflow.

## File Structure After Release

```
GitHub Release Assets:
├── quack-v2.0.1.zip          # Clean extension package for users
└── quack-source-v2.0.1.zip   # Source code for Chrome Web Store

Chrome Web Store:
└── quack-webstore-v2.0.1.zip # Minimal package for web store
```

## Required Secrets

For Chrome Web Store automation, add these to repository secrets:

- `CHROME_EXTENSION_ID` - Extension ID from Chrome Web Store developer dashboard
- `CHROME_CLIENT_ID` - OAuth2 client ID from Google Cloud Console
- `CHROME_CLIENT_SECRET` - OAuth2 client secret
- `CHROME_REFRESH_TOKEN` - OAuth2 refresh token

Without these secrets, the Chrome Web Store upload will fail, but GitHub releases will still work.

## Versioning Strategy

- **Patch** (2.0.1): Bug fixes, small improvements
- **Minor** (2.1.0): New features, API changes
- **Major** (3.0.0): Breaking changes, architecture changes

The version bump workflow handles incrementing automatically based on your selection.

## Troubleshooting

**Version mismatch error**: Make sure manifest.json version matches the git tag exactly.

**Release workflow fails**: Check that CHANGELOG.md has the correct version format: `## [X.Y.Z] - YYYY-MM-DD`

**Chrome Web Store upload fails**: Verify all required secrets are set and the package is under 10MB.

**Missing changelog**: The release workflow extracts from CHANGELOG.md between version headers. Make sure the format is correct.

## Testing Before Release

Before running version bump:

1. Load extension locally and verify functionality
2. Test on multiple YouTube videos
3. Check console for errors
4. Verify settings persistence
5. Test both light/dark themes

The automated workflows don't run tests, so manual verification is required.

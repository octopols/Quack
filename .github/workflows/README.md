# Release Automation

This directory contains GitHub Actions workflows for automated releases and Chrome Web Store deployment.

## Workflows

### 1. `release.yml` - GitHub Release Creation
**Trigger**: Push tag matching `v*` pattern (e.g., `v2.0.1`)

**Actions**:
- Validates manifest.json version matches tag
- Creates clean extension package (removes dev files)
- Generates source code archive
- Creates GitHub release with changelog
- Uploads both packages as release assets

### 2. `version-bump.yml` - Version Management
**Trigger**: Manual workflow dispatch

**Actions**:
- Bumps version in manifest.json (patch/minor/major)
- Updates README.md version badge
- Adds changelog entry (optional)
- Commits changes and creates tag
- Triggers release workflow

### 3. `chrome-webstore.yml` - Chrome Web Store Upload
**Trigger**: GitHub release published

**Actions**:
- Creates Chrome Web Store compatible package
- Validates package size (<10MB)
- Uploads to Chrome Web Store (requires secrets)
- Sets to pending review (manual publish)

## Usage

### Creating a Release

1. **Manual Version Bump**:
   - Go to Actions → Version Bump → Run workflow
   - Select version type (patch/minor/major)
   - Add changelog entry
   - This creates tag and triggers release

2. **Direct Tag Push**:
   ```bash
   # Update manifest.json version first
   git tag v2.0.1
   git push origin v2.0.1
   ```

### Required Secrets (for Chrome Web Store)

Add these to repository secrets:
- `CHROME_EXTENSION_ID` - Your extension ID from Chrome Web Store
- `CHROME_CLIENT_ID` - OAuth2 client ID
- `CHROME_CLIENT_SECRET` - OAuth2 client secret  
- `CHROME_REFRESH_TOKEN` - OAuth2 refresh token

## File Structure After Release

```
Release Assets:
├── quack-v2.0.1.zip          # Clean extension package
└── quack-source-v2.0.1.zip   # Full source code

Chrome Web Store:
└── quack-webstore-v2.0.1.zip # Web store package
```
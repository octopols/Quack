# Changelog

All notable changes to Quack will be documented in this file.

## [3.0.0] - 2025-10-18

### Added
- YouTube-style search icon button with click functionality
- Moved settings icon outside search box for better UX
- Added comprehensive GitHub automation (releases, version bumping, Chrome Web Store upload)
- Enhanced documentation with project-specific issue and PR templates
- Added screenshot placeholders for better project showcase

## [2.0.0] - 2025-10-18

### Added
- Complete rewrite with modular architecture
- Support for new YouTube data formats (commentViewModel, commentEntityPayload)
- Progressive result streaming
- Configurable settings with persistence
- Match highlighting
- Improved API pagination handling
- Better error handling and format fallbacks
- Fixed extraction issues with updated YouTube DOM structure

### Technical
- Manifest V3 compliance
- Zero external dependencies (vanilla JavaScript)
- Chrome Storage API for settings persistence
- YouTube internal API for comment pagination
- Scoped CSS styling with `quack-` namespace

### Features
- Comprehensive search across all paginated comments
- Progressive result streaming (no blocking UI)
- Configurable search parameters (case sensitivity, reply inclusion, author matching)
- Match highlighting with configurable toggle
- Native YouTube UI integration
- Settings persistence via Chrome Storage API
- Real-time search progress metrics
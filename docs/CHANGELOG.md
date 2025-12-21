# Changelog

All notable changes to Quack are documented here.

## [3.1.0] - 2024-12-22

### Added
- Profile pictures now display for comment authors
- Clickable usernames and profile pictures (opens channel in new tab)
- Channel URL construction from usernames

### Fixed
- Profile picture extraction from YouTube API
- Double tab opening when clicking usernames

### Technical
- Simplified channel URL generation
- Removed all debug console.log statements
- Updated manifest description

## [3.0.0] - 2024-10-18

### Added
- YouTube-style search icon button
- Comprehensive GitHub automation
- Chrome Web Store upload workflow

### Changed
- Moved settings icon outside search box

## [2.0.0] - 2024-10-18

### Added
- Complete rewrite with modular architecture
- Support for new YouTube formats (commentViewModel, commentEntityPayload)
- Progressive result streaming
- Configurable settings with persistence
- Match highlighting
- Improved API pagination

### Technical
- Manifest V3 compliance
- Zero external dependencies
- Chrome Storage API for settings
- Scoped CSS with quack- namespace
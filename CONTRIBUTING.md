# Contributing

## Workflow

1. Create an issue describing the bug or feature
2. Comment asking to be assigned to work on it
3. Wait for assignment before starting work
4. Fork and implement your fix

## Setup

```bash
git clone https://github.com/octopols/quack.git
cd quack
```

Load unpacked extension in `chrome://extensions/` (developer mode).

## Code Standards

- Vanilla JavaScript only
- No external dependencies
- Manifest V3 compliance
- Prefix CSS classes with `quack-`
- Use semicolons
- 2-space indentation

## File Structure

```
src/
├── content.js     # Main orchestration
├── ui.js         # DOM manipulation
├── fetcher.js    # YouTube API calls
├── parser.js     # Data normalization
├── search.js     # Query filtering
├── settings.js   # Chrome storage
└── styles.css    # Scoped styling
```

## Testing

1. Load extension in Chrome
2. Navigate to YouTube video
3. Verify search functionality
4. Test settings persistence
5. Check console for errors

## Pull Requests

- Fork repository
- Create feature branch
- Test thoroughly
- Submit PR with clear description
- Reference issue number if applicable

## Debug

Use Chrome DevTools on YouTube pages. Extension logs prefixed with `[CommentSearch]`.

## Issues

Report bugs with:
- Chrome version
- Console errors
- Reproduction steps
- Expected vs actual behavior
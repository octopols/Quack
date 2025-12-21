# Contributing

## Workflow

1. Create an issue describing the bug or feature
2. Wait for assignment before starting work
3. Fork the repository
4. Implement your changes
5. Submit PR using the template

## Setup

```bash
git clone https://github.com/octopols/quack.git
cd quack
```

Load unpacked extension at `chrome://extensions/` (enable Developer mode).

## Code Standards

- Vanilla JavaScript only (no dependencies)
- Manifest V3 compliance
- CSS classes prefixed with `quack-`
- 2-space indentation, semicolons required
- No console.log in production code

## Testing Checklist

Before submitting PR:

1. Load extension in Chrome
2. Test on YouTube video with 1000+ comments
3. Verify search works correctly
4. Test settings persistence
5. Check both light and dark themes
6. No console errors

## File Structure

```
src/
├── content.js     # Main orchestration
├── ui.js         # DOM manipulation
├── fetcher.js    # YouTube API
├── parser.js     # Data normalization
├── search.js     # Filtering logic
├── settings.js   # Chrome storage
└── styles.css    # Styling
```

## Pull Requests

- Reference issue number
- Include screenshots for UI changes
- Test thoroughly before submission
- Follow PR template completely

## Debug Tips

- Check Chrome DevTools console
- Look for errors in YouTube's `ytInitialData`
- Monitor Network tab for API calls
- Extension logs prefixed with `[Quack]`
# Contributing

## Workflow

1. Create an issue describing the bug or feature
2. Comment asking to be assigned to work on it
3. Wait for assignment before starting work
4. Fork and implement your fix
5. Submit PR using the provided template

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

## Testing Requirements

1. Load extension in Chrome
2. Navigate to YouTube video with comments
3. Verify search functionality works
4. Test settings persistence across sessions
5. Check console for `[CommentSearch]` errors
6. Test on videos with 1000+ comments
7. Verify both light/dark theme compatibility

## Performance Testing

Before submitting PR, measure:
- Memory usage (Chrome Task Manager - Shift+Esc)
- CPU impact during search operations
- Search completion time on large comment sets

## Pull Requests

- Use issue templates for proper bug reporting
- Follow PR template checklist completely
- Test thoroughly before submission
- Reference related issue number
- Include screenshots for UI changes

## Debug Tips

- Use Chrome DevTools on YouTube pages
- Extension logs prefixed with `[CommentSearch]`
- Check `ytInitialData` for comment structure changes
- Monitor network tab for YouTube API calls
- Verify manifest.json syntax with `jq`

## Common Issues

- Search box not appearing: Check page URL and comments section loading
- No results: Verify case sensitivity and reply inclusion settings
- Performance issues: Test on videos with reasonable comment counts
- Parser errors: YouTube changes comment data structures frequently
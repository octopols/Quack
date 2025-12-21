# Architecture

## File Structure

```
src/
├── content.js      # Main controller, orchestrates all modules
├── ui.js          # DOM manipulation and rendering
├── fetcher.js     # YouTube API interaction
├── parser.js      # Comment data normalization
├── search.js      # Query filtering logic
├── settings.js    # Chrome storage persistence
└── styles.css     # Scoped CSS (quack- namespace)
```

## Module Dependencies

```
content.js
├── settings.js (state management)
├── ui.js (view layer)
├── fetcher.js (data layer)
│   └── parser.js (data processing)
└── search.js (business logic)
```

## Data Flow

```
User Input → content.js → fetcher.js → YouTube API
                ↓
         parser.js (normalize)
                ↓
         search.js (filter)
                ↓
         ui.js (render progressively)
```

## Search Flow

1. User enters query and presses Enter
2. UI shows loading state
3. Fetcher extracts YouTube config and continuation token
4. Fetcher fetches comment pages (paginated)
5. Parser normalizes each page's data
6. Search filters comments matching query
7. UI streams results to DOM progressively
8. Repeat until all pages fetched

## Comment Object Structure

```javascript
{
  id: "comment_id",
  author: "username",
  text: "comment content",
  timestamp: "2 days ago",
  likes: "42",
  authorThumbnail: [{url: "..."}],
  channelUrl: "https://youtube.com/@username",
  isReply: false,
  replies: []
}
```

## Settings Storage

```javascript
// Stored in chrome.storage.sync
{
  caseSensitive: false,
  searchInReplies: true,
  searchInAuthorNames: false,
  highlightMatches: true
}
```

## Loading Order

1. settings.js (no dependencies)
2. parser.js (used by fetcher)
3. fetcher.js (depends on parser)
4. search.js (independent)
5. ui.js (creates DOM)
6. content.js (orchestrator)
7. styles.css (parallel)

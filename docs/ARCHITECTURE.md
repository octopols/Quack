# Architecture

## File Structure

```
src/
├── content.js      # Main controller, orchestrates all modules
├── ui.js           # DOM manipulation and rendering
├── fetcher.js      # YouTube API interaction and pagination
├── parser.js       # Comment data normalization
├── search.js       # Query filtering logic
├── sorter.js       # Sorting algorithms (7 methods)
├── settings.js     # Chrome storage persistence
└── styles.css      # Scoped CSS (quack-* namespace)
```

## Module Dependencies

```
content.js
├── settings.js (state management)
├── ui.js (view layer)
│   └── Custom sort button replacement
├── fetcher.js (data layer)
│   └── parser.js (data processing)
├── search.js (filtering logic)
└── sorter.js (ordering logic)
```

## Data Flow

```
User Input → content.js → fetcher.js → YouTube API
                ↓
         parser.js (normalize + extract reply tokens)
                ↓
         search.js (filter by query)
                ↓
         sorter.js (calculate relevance + sort)
                ↓
         ui.js (render progressively)
```

## Search Flow

1. User enters query and presses Enter
2. **Sort button is immediately replaced** with custom Quack control
3. UI shows loading state with progress bar
4. Fetcher extracts YouTube config and continuation token
5. Fetcher fetches comment pages (paginated)
6. Parser normalizes each page's data and extracts reply tokens
7. Search filters comments matching query
8. **Sorter calculates relevance scores** for each match
9. **If searchInReplies enabled:** Fetcher paginates through ALL reply pages
10. Parser normalizes reply data (`isReply: true`, `parentCommentId`)
11. Search filters replies matching query
12. Content.js groups replies with parents using cache
13. **Dynamic sorting**: If custom sort active, re-sorts and re-renders on each batch
14. UI streams results to DOM with nested replies
15. Repeat until all pages fetched
16. On search clear, **native YouTube sort button is restored**

## Sorting Logic

### Available Sort Orders

| Order | Key | Algorithm |
|-------|-----|-----------|
| Most Relevant | `relevance` | Custom score based on query matches |
| Top Comments | `top` | Parse likes (handles K/M suffixes) |
| Newest First | `newest` | Parse timestamp ("X ago" format) |
| Oldest First | `oldest` | Reverse of newest |
| Most Replies | `replies` | Reply count comparison |
| Longest | `length` | Text character count |
| Author (A-Z) | `author` | Alphabetical username sort |

### Relevance Scoring

```javascript
score = (queryMatches × 10) + (authorMatch × 5) + (likes × 0.1) + (replies × 0.5)
```

## Comment Object Structure

```javascript
{
  id: "comment_id",
  author: "username",
  text: "comment content",
  timestamp: "2 days ago",
  likes: "42",                    // String, may contain K/M suffix
  authorThumbnail: [{url: "..."}],
  channelUrl: "https://youtube.com/@username",
  isReply: false,
  parentCommentId: "parent_id",   // For replies only
  replyContinuationToken: "...",  // If comment has replies
  replyCount: 10,                 // Number of replies
  replies: [],                    // Nested reply objects (when displayed)
  relevanceScore: 42.5            // Calculated during search
}
```

## UI Components

### Custom Sort Button

When search is active, YouTube's native sort button is hidden and replaced with:

```html
<div class="quack-sort-wrapper">
  <button class="quack-sort-btn">Sort by</button>
  <div class="quack-sort-dropdown-menu">
    <!-- 7 sort options with checkmark for selected -->
  </div>
</div>
```

### Sort Button Lifecycle

1. `ui.injectSortReplacement(callback)` - Creates the custom button
2. `ui.toggleSortButton(true)` - Hides native, shows custom (search start)
3. `ui.toggleSortButton(false)` - Shows native, hides custom (search clear)

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
5. sorter.js (independent)
6. ui.js (creates DOM)
7. content.js (orchestrator)
8. styles.css (parallel)

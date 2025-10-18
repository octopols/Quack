# Quack - Architecture

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       USER INTERFACE                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Search Input  │  Settings Icon  │  Loading Indicator │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Progressive Results Display                  │ │
│  │  ┌─────────────────────────────────────────────────┐   │ │
│  │  │  Comment 1                                       │   │ │
│  │  │  Comment 2                                       │   │ │
│  │  │  Comment 3                                       │   │ │
│  │  │  ...                                             │   │ │
│  │  └─────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
                    ┌───────┴────────┐
                    │   ui.js        │
                    │  (View Layer)  │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │  content.js    │
                    │ (Controller)   │
                    └───┬───┬───┬───┬┘
                        │   │   │   │
        ┌───────────────┘   │   │   └───────────────┐
        │                   │   │                   │
┌───────▼────────┐  ┌───────▼───────┐  ┌──────────▼──────────┐
│   fetcher.js   │  │   search.js   │  │   settings.js       │
│  (Data Layer)  │  │ (Business     │  │  (State Mgmt)       │
│                │  │  Logic)       │  │                     │
│ • YouTube API  │  │ • Filtering   │  │ • Chrome Storage    │
│ • Pagination   │  │ • Highlighting│  │ • Persistence       │
└───────┬────────┘  └───────────────┘  └─────────────────────┘
        │
┌───────▼────────┐
│   parser.js    │
│ (Data Process) │
│                │
│ • Format 1     │
│ • Format 2     │
│ • Format 3     │
└────────────────┘
```

## Search Flow

```
User Query Input (Enter Key)
            │
            ▼
    ┌───────────────┐
    │  content.js   │
    │ handleSearch()│
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐
    │    ui.js      │
    │ showLoading() │
    └───────┬───────┘
            │
            ▼
    ┌───────────────────┐
    │   fetcher.js      │
    │ fetchAllComments()│
    └───────┬───────────┘
            │
            ▼
    ┌──────────────────┐      ┌─────────────────┐
    │ Extract YouTube  │──────▶│ Get Config &    │
    │ Page Data        │      │ Continuation    │
    └──────┬───────────┘      └─────────────────┘
           │
           ▼
    ┌──────────────────┐
    │  Fetch Page 1    │
    └──────┬───────────┘
           │
           ▼
    ┌──────────────────┐      ┌─────────────────┐
    │   parser.js      │──────▶│ Parse & Extract │
    │ parseComments()  │      │ Normalize Data  │
    └──────┬───────────┘      └─────────────────┘
           │
           ▼
    ┌──────────────────┐      ┌─────────────────┐
    │   search.js      │──────▶│ Filter Matches  │
    │ filterComments() │      │ Apply Settings  │
    └──────┬───────────┘      └─────────────────┘
           │
           ▼
    ┌──────────────────┐      ┌─────────────────┐
    │     ui.js        │──────▶│ Stream to DOM   │
    │ addCommentResult │      │ (Progressive)   │
    └──────┬───────────┘      └─────────────────┘
           │
           │   Continuation Token?
           ├─────YES─────┐
           │             ▼
           │      Fetch Next Page
           │             │
           │             └──────┐
           │                    │
           NO                   │
           │                    │
           ▼                    │
    ┌──────────────────┐       │
    │     ui.js        │       │
    │ showFinalResults │       │
    └──────────────────┘       │
                                │
                                └─────▶ Iterate Until Complete
```

## Data Structure Flow

```
YouTube Page DOM
    │
    ▼
┌─────────────────────────────────────┐
│     ytInitialData (Window Object)   │
│  ┌───────────────────────────────┐  │
│  │  commentThreadRenderer        │  │
│  │    ├─ commentRenderer (old)   │  │
│  │    └─ commentViewModel (new)  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│        parser.js Processing         │
│  ┌───────────────────────────────┐  │
│  │  Format Detection             │  │
│  │  Field Extraction:            │  │
│  │    • id                       │  │
│  │    • author                   │  │
│  │    • text                     │  │
│  │    • timestamp                │  │
│  │    • likes                    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│      Normalized Comment Object      │
│  {                                  │
│    id: "xyz123",                    │
│    author: "John Doe",              │
│    text: "Great video!",            │
│    timestamp: "2 days ago",         │
│    likes: "42",                     │
│    isReply: false,                  │
│    replies: []                      │
│  }                                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│       search.js Filtering           │
│  if (text.includes(query) ||        │
│      author.includes(query)) {      │
│    return true;                     │
│  }                                  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│         DOM Rendering               │
│  ┌───────────────────────────────┐  │
│  │  <div class="quack-comment">   │  │
│  │    <author>John Doe</author>  │  │
│  │    <text>Great video!</text>  │  │
│  │    <likes>42</likes>          │  │
│  │  </div>                       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Module Dependencies

```
content.js (Orchestration)
    │
    ├──▶ settings.js (State management)
    │
    ├──▶ ui.js (DOM manipulation)
    │    │
    │    └──▶ styles.css
    │
    ├──▶ fetcher.js (API interaction)
    │    │
    │    └──▶ parser.js (Data normalization)
    │
    └──▶ search.js (Query filtering)
```

## Script Loading Order

```
1. manifest.json           ← Chrome extension entry
    │
    ├─▶ 2. settings.js     ← No dependencies
    │
    ├─▶ 3. parser.js       ← Used by fetcher
    │
    ├─▶ 4. fetcher.js      ← Depends on parser
    │
    ├─▶ 5. search.js       ← Independent
    │
    ├─▶ 6. ui.js           ← Creates DOM elements
    │
    └─▶ 7. content.js      ← Main controller
    
    Plus: styles.css       ← Loaded in parallel
```

## Event Flow

```
Page Load
    │
    ▼
┌─────────────────────┐
│ Wait for Comments   │
│ Section (DOM)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Initialize Modules  │
│ • settings          │
│ • ui                │
│ • fetcher           │
│ • search            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Inject Search UI    │
│ Attach Listeners    │
└──────────┬──────────┘
           │
           ▼
     Wait for Input
           │
           ▼
    ┌──────────────┐
    │ Query + Enter│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Execute      │
    │ Search       │
    └──────────────┘
```

## Settings Persistence

```
┌────────────────────────────────────┐
│      Chrome Storage API            │
│  ┌──────────────────────────────┐  │
│  │  quackSettings:              │  │
│  │  {                           │  │
│  │    caseSensitive: false,     │  │
│  │    searchInReplies: true,    │  │
│  │    searchInAuthorNames: false│  │
│  │    highlightMatches: true    │  │
│  │  }                           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
           ▲           │
           │ write     │ read
           │           ▼
┌──────────────────────────────────┐
│       settings.js                │
│  • init()                        │
│  • getSettings()                 │
│  • updateSettings()              │
│  • resetSettings()               │
└──────────────────────────────────┘
```

## CSS Namespace Strategy

```
Prefix: quack-
        └─── YouTube Comment Search

Examples:
  • quack-search-container
  • quack-search-input
  • quack-settings-popup
  • quack-loading-indicator
  • quack-comment-result
  • quack-highlight

Rationale:
  - Avoids collision with YouTube's CSS
  - Easy identification in DevTools
  - Scoped styling without Shadow DOM overhead
```

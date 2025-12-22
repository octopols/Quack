// Content Script - Main Entry Point
// Quack - YouTube Comment Search Extension

// Check if we're on a YouTube watch page
function isYouTubeWatchPage() {
  return location.pathname === '/watch' && location.search.includes('v=');
}

// Global instances
let ui = null;
let fetcher = null;
let searcher = null;
let sorter = null;
let currentSearchQuery = '';
let allMatches = [];  // Store ALL matched comments for sorting
let currentSortOrder = 'relevance';  // Default sort order


/**
 * Cleanup existing UI and state before re-initialization
 */
function cleanup() {
  // Cleanup existing instance

  // Remove existing search bar if it exists
  const existingSearchContainer = document.querySelector('.quack-search-container');
  if (existingSearchContainer) {
    existingSearchContainer.remove();
  }

  // Remove settings popup if it exists
  const existingSettingsPopup = document.querySelector('.quack-settings-popup');
  if (existingSettingsPopup) {
    existingSettingsPopup.remove();
  }

  // Clear search if active
  if (ui) {
    ui.clearSearch();
  }

  // Abort any ongoing fetches
  if (fetcher) {
    fetcher.abort();
  }

  // Reset global state
  ui = null;
  fetcher = null;
  searcher = null;
  currentSearchQuery = '';


}


async function init() {
  // Always cleanup first to avoid duplicates
  cleanup();
  try {
    // Wait for YouTube page to be ready
    await waitForElement('ytd-comments-header-renderer', 10000);

    // Wait a bit more for comments to start loading
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize settings
    await settingsManager.init();

    // Create instances
    ui = new CommentSearchUI();
    fetcher = new CommentFetcher();
    searcher = new CommentSearcher();
    sorter = new CommentSorter();

    // Initialize UI
    ui.init();

    // Set initial settings
    searcher.setSettings(settingsManager.getSettings());
    ui.updateSettingsUI(settingsManager.getSettings());

    // Attach event listeners
    attachEventListeners();
  } catch (error) {
    // Initialization failed, fail silently
  }
}


function attachEventListeners() {
  // Search box - Enter key
  if (ui.searchBox) {
    ui.searchBox.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Don't search if disabled or already searching
        if (ui.searchBox.disabled || ui.isSearchActive) {
          return;
        }
        const query = ui.searchBox.value.trim();
        if (query) {
          handleSearch(query);
        }
      }
    });

    // Clear search on Escape
    ui.searchBox.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClearSearch();
      }
    });
  }

  // Search button
  if (ui.searchButton) {
    ui.searchButton.addEventListener('click', (e) => {
      e.preventDefault();
      // Don't search if disabled or already searching
      if (ui.searchButton.disabled || ui.isSearchActive) {
        return;
      }
      const query = ui.searchBox.value.trim();
      if (query) {
        handleSearch(query);
      }
    });
  }

  // Settings button
  if (ui.settingsButton) {
    ui.settingsButton.addEventListener('click', (e) => {
      e.stopPropagation();
      ui.showSettings();
    });
  }

  // Settings popup - close button
  if (ui.settingsPopup) {
    const closeButton = ui.settingsPopup.querySelector('.quack-settings-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        ui.hideSettings();
      });
    }

    // Settings checkboxes
    const caseSensitive = document.getElementById('quack-case-sensitive');
    const searchReplies = document.getElementById('quack-search-replies');
    const searchAuthors = document.getElementById('quack-search-authors');
    const highlightMatches = document.getElementById('quack-highlight-matches');

    const updateSettings = async () => {
      const newSettings = {
        caseSensitive: caseSensitive.checked,
        searchInReplies: searchReplies.checked,
        searchInAuthorNames: searchAuthors.checked,
        highlightMatches: highlightMatches.checked
      };

      await settingsManager.updateSettings(newSettings);
      searcher.setSettings(newSettings);

      // Re-run search if active
      if (ui.isSearchActive && currentSearchQuery) {
        handleSearch(currentSearchQuery);
      }
    };

    highlightMatches.addEventListener('change', updateSettings);
  }

  // Hijack YouTube's sort dropdown - wait for UI to be ready
  setTimeout(() => {
    ui.injectSortReplacement((sortOrder) => {

      currentSortOrder = sortOrder;
      resortResults(sortOrder);
    });
  }, 1000);

  // Close settings popup when clicking outside
  document.addEventListener('click', (e) => {
    if (ui.settingsPopup &&
      ui.settingsPopup.style.display === 'block' &&
      !ui.settingsPopup.contains(e.target) &&
      e.target !== ui.settingsButton) {
      ui.hideSettings();
    }
  });

  // Handle YouTube navigation (SPA) with multiple detection methods
  setupNavigationDetection();
}


/**
 * Setup detection for YouTube's sort dropdown changes
 */
function setupYouTubeSortDetection() {
  // Find YouTube's sort dropdown
  const sortMenu = document.querySelector('yt-sort-filter-sub-menu-renderer yt-dropdown-menu');

  // Early return removed to support lazy loading


  // Listen for clicks on sort menu items
  document.addEventListener('click', (e) => {
    // Check if click is on a sort menu item
    const menuItem = e.target.closest('tp-yt-paper-item');
    if (!menuItem) return;

    // Robust sort menu detection (handles overlay/body movement)
    const textContent = (menuItem.textContent || '').trim();
    const isSortMenu = menuItem.closest('yt-sort-filter-sub-menu-renderer') ||
      textContent.includes('Show featured comments') ||
      textContent.includes('Show recent comments');

    if (!isSortMenu) return;

    // Only process if we have search results
    if (allMatches.length === 0) return;

    // Get the text content to determine which sort was selected
    const itemText = menuItem.textContent.trim();

    let newSortOrder = null;

    if (itemText.includes('Top')) {
      newSortOrder = 'top';
    } else if (itemText.includes('Newest')) {
      newSortOrder = 'newest';
    }

    if (newSortOrder && newSortOrder !== currentSortOrder) {

      currentSortOrder = newSortOrder;

      // Small delay to let YouTube update its UI
      setTimeout(() => {
        resortResults(newSortOrder);
      }, 100);
    }
  }, true); // Use capture to catch events early
}


/**
 * Re-sort all search results by specified order
 */
function resortResults(sortOrder) {
  if (allMatches.length === 0) return;

  // Sort all matches
  const sorted = sorter.sortComments(allMatches, sortOrder);

  // Clear existing results
  ui.clearResults();

  // Re-render in new order
  for (const comment of sorted) {
    ui.addCommentResult(comment, currentSearchQuery, searcher);
  }
}


async function handleSearch(query) {
  // Prevent search if already in progress
  if (ui.isSearchActive) {
    return;
  }
  currentSearchQuery = query;

  // Abort any ongoing fetch
  if (fetcher) {
    fetcher.abort();
  }

  // Show loading state (this will also disable search inputs)
  ui.showLoadingState();

  // Enable sort button immediately for dynamic sorting
  ui.toggleSortButton(true);

  try {
    // Reset searcher and allMatches
    searcher.reset();
    allMatches = [];  // Clear previous matches

    let matchCount = 0;
    let totalCommentsSearched = 0;

    // Get settings for reply fetching
    const settings = await settingsManager.getSettings();
    const shouldFetchReplies = settings.searchInReplies;

    // Cache to store parent comments for later reply nesting
    const parentCommentCache = new Map();



    // Fetch all comments with progressive display
    await fetcher.fetchAllComments(
      // Progress callback
      (checked, total) => {
        ui.updateLoadingProgress(checked, total);
      },
      // Batch callback - process and display matches as they arrive
      (comments) => {
        totalCommentsSearched += comments.length;

        // Cache any top-level comments that might have replies
        for (const comment of comments) {
          if (!comment.isReply) {
            parentCommentCache.set(comment.id, comment);
          }
        }

        const matches = searcher.filterComments(comments, query);

        // Calculate relevance scores for all matches
        for (const match of matches) {
          match.relevanceScore = sorter.calculateRelevance(match, query);
        }

        // Separate top-level comments and replies
        const topLevelMatches = matches.filter(m => !m.isReply);
        const replyMatches = matches.filter(m => m.isReply);

        // Group replies with their parent comments
        const parentMap = new Map();

        // First, add all top-level comment matches to the map
        for (const match of topLevelMatches) {
          if (!parentMap.has(match.id)) {
            parentMap.set(match.id, { comment: match, replies: [], matched: true });
          }
        }

        // Then, handle reply matches - look up parents from cache
        for (const reply of replyMatches) {
          if (reply.parentCommentId) {
            let parent = parentMap.get(reply.parentCommentId);

            // If parent not in map, find it from cache
            if (!parent) {
              const parentComment = parentCommentCache.get(reply.parentCommentId);
              if (parentComment) {
                parent = { comment: parentComment, replies: [], matched: false };
                parentMap.set(reply.parentCommentId, parent);
              }
            }

            if (parent) {
              parent.replies.push(reply);
            } else {
              // Parent not found - add reply standalone
              allMatches.push(reply);  // Store in allMatches
              if (currentSortOrder === 'relevance') {
                ui.addCommentResult(reply, query, searcher, true);
              }
              matchCount++;
            }
          }
        }

        // Display comments with their nested replies
        for (const { comment, replies, matched } of parentMap.values()) {
          // Attach replies to comment object for nested rendering
          if (replies.length > 0) {
            comment.replies = replies;
          }

          // Store in allMatches (store the parent with its replies attached)
          if (matched) {
            allMatches.push(comment);
          }

          if (currentSortOrder === 'relevance') {
            ui.addCommentResult(comment, query, searcher);
          }

          // Only count matches, not context parents
          if (matched) {
            matchCount++;
          }
          matchCount += replies.length; // Count all matched replies
        }
      },
      // Pass reply fetching setting
      shouldFetchReplies
    );

    // If using custom sort, re-sort and render on every batch for dynamic updates
    if (currentSortOrder !== 'relevance') {
      resortResults(currentSortOrder);
    }

    // Show final results
    ui.showFinalResults(matchCount);

  } catch (error) {
    // Try fallback to DOM extraction
    try {
      const domComments = fetcher.extractCommentsFromDOM();
      const matches = searcher.filterComments(domComments, query);

      ui.hideLoadingIndicator();
      ui.enableSearch();

      for (const match of matches) {
        ui.addCommentResult(match, query, searcher);
      }

      ui.showFinalResults(matches.length);
      ui.showError('Could not load all comments. Showing visible comments only.');

    } catch (fallbackError) {
      ui.showError('Failed to search comments. Please try again.');
    }
  }
}


function handleClearSearch() {
  currentSearchQuery = '';

  if (fetcher) {
    fetcher.abort();
  }

  if (ui) {
    ui.clearSearch();
    ui.toggleSortButton(false); // Restore native sort button
  }

  if (searcher) {
    searcher.reset();
  }
}


function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}




function setupNavigationDetection() {
  let lastUrl = location.href;
  let initTimeout = null;


  // Intercept History API calls (catches YouTube SPA navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    checkForNavigation();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    checkForNavigation();
  };

  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', () => {
    checkForNavigation();
  });

  function checkForNavigation() {
    const currentUrl = location.href;

    if (currentUrl !== lastUrl) {

      lastUrl = currentUrl;

      if (isYouTubeWatchPage()) {
        // Navigated to a watch page - wait longer for DOM to settle

        setTimeout(() => {
          init();
        }, 1500); // Increased from 1000ms to 1500ms
      }
    }
  }
}

function getVideoIdFromUrl(url) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (isYouTubeWatchPage()) {
      init();
    }
    setupNavigationDetection();
  });
} else {
  if (isYouTubeWatchPage()) {
    init();
  }
  setupNavigationDetection();
}

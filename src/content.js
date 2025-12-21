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
let currentSearchQuery = '';


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

    // Initialize UI
    ui.init();

    // Set initial settings
    searcher.setSettings(settingsManager.getSettings());
    ui.updateSettingsUI(settingsManager.getSettings());

    // Attach event listeners
    attachEventListeners();
  } catch (error) {
    console.error('[Quack] Initialization failed:', error);
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

    caseSensitive.addEventListener('change', updateSettings);
    searchReplies.addEventListener('change', updateSettings);
    searchAuthors.addEventListener('change', updateSettings);
    highlightMatches.addEventListener('change', updateSettings);
  }

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

  try {
    // Reset searcher
    searcher.reset();

    let matchCount = 0;
    let totalCommentsSearched = 0;

    // Get settings for reply fetching
    const settings = await settingsManager.getSettings();
    const shouldFetchReplies = settings.searchInReplies;

    // Cache to store parent comments for later reply nesting
    const parentCommentCache = new Map();

    console.log('[Quack] 📋 Settings:', settings);
    console.log(`[Quack] 🔧 Reply fetching: ${shouldFetchReplies ? 'ENABLED' : 'DISABLED'}`);

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
              // Parent not found at all - show reply standalone
              ui.addCommentResult(reply, query, searcher, true);
              matchCount++;
            }
          } else {
          }
        }

        // Display comments with their nested replies
        for (const { comment, replies, matched } of parentMap.values()) {
          // Attach replies to comment object for nested rendering
          if (replies.length > 0) {
            comment.replies = replies;
          }
          ui.addCommentResult(comment, query, searcher);

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

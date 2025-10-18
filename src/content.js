/**
 * Content Script - Main Entry Point
 * Orchestrates all modules and handles user interactions
 */

// Global instances
let ui = null;
let fetcher = null;
let searcher = null;
let currentSearchQuery = '';

/**
 * Initialize the extension
 */
async function init() {
  console.log('[CommentSearch] Initializing extension...');

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

    console.log('[CommentSearch] Extension initialized successfully');
  } catch (error) {
    console.error('[CommentSearch] Initialization error:', error);
  }
}

/**
 * Attach event listeners to UI elements
 */
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

  // Handle YouTube navigation (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('/watch')) {
        console.log('[CommentSearch] YouTube navigation detected, reinitializing...');
        setTimeout(() => {
          handleClearSearch();
          init();
        }, 1000);
      }
    }
  }).observe(document, { subtree: true, childList: true });
}

/**
 * Handle search operation
 * @param {string} query - Search query
 */
async function handleSearch(query) {
  // Prevent search if already in progress
  if (ui.isSearchActive) {
    console.log('[CommentSearch] Search already in progress, ignoring new request');
    return;
  }

  console.log('[CommentSearch] Starting search for:', query);
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

    // Fetch all comments with progressive display
    await fetcher.fetchAllComments(
      // Progress callback
      (checked, total) => {
        ui.updateLoadingProgress(checked, total);
      },
      // Batch callback - process and display matches as they arrive
      (comments) => {
        const matches = searcher.filterComments(comments, query);
        
        for (const match of matches) {
          ui.addCommentResult(match, query, searcher);
          matchCount++;
        }
      }
    );

    // Show final results
    ui.showFinalResults(matchCount);

    console.log(`[CommentSearch] Search complete. Found ${matchCount} matches.`);

  } catch (error) {
    console.error('[CommentSearch] Search error:', error);
    
    // Try fallback to DOM extraction
    console.log('[CommentSearch] Attempting DOM extraction fallback...');
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
      console.error('[CommentSearch] Fallback also failed:', fallbackError);
      ui.showError('Failed to search comments. Please try again.');
    }
  }
}

/**
 * Handle clear search operation
 */
function handleClearSearch() {
  console.log('[CommentSearch] Clearing search');
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

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Element>} The found element
 */
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

/**
 * Check if we're on a YouTube watch page
 */
function isYouTubeWatchPage() {
  return window.location.hostname === 'www.youtube.com' && 
         window.location.pathname === '/watch';
}

// Initialize when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (isYouTubeWatchPage()) {
      setTimeout(init, 1000);
    }
  });
} else {
  if (isYouTubeWatchPage()) {
    setTimeout(init, 1000);
  }
}

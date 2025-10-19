// Content Script - Main Entry Point
console.log('[Quack] Content script loaded on:', location.href);

// Check if we're on a YouTube watch page
function isYouTubeWatchPage() {
  return location.pathname === '/watch' && location.search.includes('v=');
}

// Global instances
let ui = null;
let fetcher = null;
let searcher = null;
let currentSearchQuery = '';


async function init() {
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
    // Initialization failed, extension won't work
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
  
  // Intercept History API calls (catches YouTube SPA navigation)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(checkForNavigation, 100);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(checkForNavigation, 100);
  };
  
  // Listen for popstate events
  window.addEventListener('popstate', () => {
    setTimeout(checkForNavigation, 100);
  });
  
  function checkForNavigation() {
    const currentUrl = location.href;
    
    if (currentUrl !== lastUrl && isYouTubeWatchPage()) {
      // Navigated to a watch page, initialize
      handleClearSearch();
      setTimeout(() => {
        init();
      }, 1000);
      lastUrl = currentUrl;
    } else if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
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
      setTimeout(init, 1000);
    }
    setupNavigationDetection();
  });
} else {
  if (isYouTubeWatchPage()) {
    setTimeout(init, 1000);
  }
  setupNavigationDetection();
}

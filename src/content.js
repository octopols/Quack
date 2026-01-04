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
let allMatches = [];  // Store matched comments for UI display (includes parents for context)
let allMatchedItems = [];  // Store ONLY matched comments/replies for count and download
let allFetchedComments = [];  // Store ALL fetched comments for download
let currentSortOrder = 'relevance';  // Default sort order
let isInitializing = false;  // Guard against duplicate init calls


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
  allFetchedComments = [];
  allMatches = [];
  allMatchedItems = [];
}


/**
 * Get the current video title for filename
 */
function getVideoTitle() {
  const titleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string');
  let title = titleElement?.textContent?.trim() || 'youtube_video';
  // Clean title for filename
  return title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
}


async function init() {
  // Guard against duplicate concurrent initializations
  if (isInitializing) {
    return;
  }
  isInitializing = true;

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

    // Create settings popup with loaded settings (so checkboxes have correct initial state)
    const loadedSettings = settingsManager.getSettings();
    ui.createSettingsPopup(loadedSettings);

    // Also update UI (for toggle buttons)
    ui.updateSettingsUI(loadedSettings);

    // Set initial settings
    searcher.setSettings(settingsManager.getSettings());

    // Attach event listeners
    attachEventListeners();
  } catch (error) {
    // Initialization failed silently
  } finally {
    isInitializing = false;
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

    // Show search history on focus
    ui.searchBox.addEventListener('focus', () => {
      const history = settingsManager.getHistory();
      if (history.length > 0) {
        ui.showSearchHistory(history);
      }
    });

    // Hide search history on blur (with delay for click to register)
    ui.searchBox.addEventListener('blur', () => {
      setTimeout(() => ui.hideSearchHistory(), 200);
    });
  }

  // Search history item click (delegated)
  document.addEventListener('click', (e) => {
    const historyItem = e.target.closest('.quack-history-item');
    if (historyItem) {
      const query = historyItem.dataset.query;
      if (query && ui.searchBox) {
        ui.searchBox.value = query;
        ui.hideSearchHistory();
        handleSearch(query);
      }
    }
  });

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

    // Handle checkbox changes - save settings when toggled
    ui.settingsPopup.addEventListener('change', async (e) => {
      if (e.target.type === 'checkbox') {
        // Query checkboxes from within the popup element itself, not the global document
        const popup = ui.settingsPopup;
        const caseSensitive = popup.querySelector('#quack-case-sensitive');
        const searchReplies = popup.querySelector('#quack-search-replies');
        const searchAuthors = popup.querySelector('#quack-search-authors');
        const highlightMatches = popup.querySelector('#quack-highlight-matches');

        const newSettings = {
          caseSensitive: caseSensitive?.checked || false,
          searchInReplies: searchReplies?.checked || false,
          searchInAuthorNames: searchAuthors?.checked || false,
          highlightMatches: highlightMatches?.checked || false
        };

        await settingsManager.updateSettings(newSettings);

        // Update searcher with new settings
        if (searcher) {
          searcher.setSettings(settingsManager.getSettings());
        }
      }
    });
  }

  // Download button dropdown toggle
  if (ui.downloadButton) {
    ui.downloadButton.addEventListener('click', (e) => {
      e.stopPropagation();
      ui.toggleDownloadMenu();
    });
  }

  // Fetch All Comments button
  if (ui.fetchAllBtn) {
    ui.fetchAllBtn.addEventListener('click', async () => {
      ui.hideDownloadMenu();
      await handleFetchAllComments();
    });
  }

  // Download Search Results button
  if (ui.downloadResultsBtn) {
    ui.downloadResultsBtn.addEventListener('click', () => {
      ui.hideDownloadMenu();
      if (allMatchedItems.length > 0) {
        const videoTitle = getVideoTitle();
        const searchTerm = currentSearchQuery.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `${videoTitle}_search_${searchTerm}.json`;
        ui.downloadAsJson(allMatchedItems, filename);
      }
    });
  }

  // CSV Download handlers
  const fetchAllCsvBtn = document.getElementById('quack-fetch-all-csv');
  if (fetchAllCsvBtn) {
    fetchAllCsvBtn.addEventListener('click', async () => {
      if (allFetchedComments.length > 0) {
        const videoTitle = getVideoTitle();
        const filename = `${videoTitle}_all_comments.csv`;
        ui.downloadAsCsv(allFetchedComments, filename);
        ui.hideDownloadMenu();
      } else {
        await handleFetchAllCommentsCsv();
      }
    });
  }

  const downloadResultsCsvBtn = document.getElementById('quack-download-results-csv');
  if (downloadResultsCsvBtn) {
    downloadResultsCsvBtn.addEventListener('click', () => {
      ui.hideDownloadMenu();
      if (allMatchedItems.length > 0) {
        const videoTitle = getVideoTitle();
        const searchTerm = currentSearchQuery.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filename = `${videoTitle}_search_${searchTerm}.csv`;
        ui.downloadAsCsv(allMatchedItems, filename);
      }
    });
  }

  // Close download menu when clicking outside
  document.addEventListener('click', (e) => {
    if (ui.downloadMenu && !ui.downloadMenu.contains(e.target) && !ui.downloadButton.contains(e.target)) {
      ui.hideDownloadMenu();
    }
  });

  // Global Esc key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Check if user is typing in a different input (e.g. YouTube search or comment box)
      const activeEl = document.activeElement;
      const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable;
      // If typing in OUR search box, let the local handler deal with it (or bubble up)
      const isOurSearchBox = activeEl === ui.searchBox;

      // If typing in another input, don't interfere
      if (isInput && !isOurSearchBox) {
        return;
      }

      // If menus are open or search is active
      if (ui.isSearchActive ||
        (ui.settingsPopup && ui.settingsPopup.style.display === 'block') ||
        (ui.downloadMenu && ui.downloadMenu.classList.contains('visible'))) {

        e.preventDefault();

        // 1. Close menus if open
        let menuClosed = false;
        if (ui.settingsPopup && ui.settingsPopup.style.display === 'block') {
          ui.hideSettings();
          menuClosed = true;
        }

        if (ui.downloadMenu && ui.downloadMenu.classList.contains('visible')) {
          ui.hideDownloadMenu();
          menuClosed = true;
        }

        if (menuClosed) return;

        // 2. Hide search history
        ui.hideSearchHistory();

        // 3. Clear search if active or has text
        if (ui.isSearchActive || (ui.searchBox && ui.searchBox.value.trim() !== '')) {
          handleClearSearch();
          // Blur search box to return focus to page
          if (isOurSearchBox) {
            ui.searchBox.blur();
          }
        }
      }
    }
  });

  // Settings checkboxes
  const caseSensitive = document.getElementById('quack-case-sensitive');
  const searchReplies = document.getElementById('quack-search-replies');
  const searchAuthors = document.getElementById('quack-search-authors');
  const highlightMatches = document.getElementById('quack-highlight-matches');

  const updateSettings = async () => {
    try {
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
    } catch (error) {
      // Settings save failed silently
    }
  };

  if (caseSensitive) caseSensitive.addEventListener('change', updateSettings);
  if (searchReplies) searchReplies.addEventListener('change', updateSettings);
  if (searchAuthors) searchAuthors.addEventListener('change', updateSettings);
  if (highlightMatches) highlightMatches.addEventListener('change', updateSettings);

  // Regex toggle button
  if (ui.regexToggle) {
    ui.regexToggle.addEventListener('click', async () => {
      const settings = settingsManager.getSettings();
      settings.useRegex = !settings.useRegex;
      await settingsManager.updateSettings(settings);
      searcher.setSettings(settings);
      ui.updateToggleButtons(settings);
      ui.clearRegexError();

      if (ui.isSearchActive && currentSearchQuery) {
        handleSearch(currentSearchQuery);
      }
    });
  }

  // Whole word toggle button
  if (ui.wholeWordToggle) {
    ui.wholeWordToggle.addEventListener('click', async () => {
      const settings = settingsManager.getSettings();
      settings.wholeWord = !settings.wholeWord;
      await settingsManager.updateSettings(settings);
      searcher.setSettings(settings);
      ui.updateToggleButtons(settings);

      if (ui.isSearchActive && currentSearchQuery) {
        handleSearch(currentSearchQuery);
      }
    });
  }

  // Keyboard shortcuts for toggles (Alt+R for regex, Alt+W for whole word)
  if (ui.searchBox) {
    ui.searchBox.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        ui.regexToggle?.click();
      } else if (e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        ui.wholeWordToggle?.click();
      }
    });
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
      !ui.settingsButton.contains(e.target)) {
      ui.hideSettings();
    }
  });

  // Handle YouTube navigation (SPA) with multiple detection methods
  setupNavigationDetection();

  // Cancel search button (delegated event since it's dynamically created)
  document.addEventListener('click', (e) => {
    if (e.target.id === 'quack-cancel-search') {
      handleCancelSearch();
    }
  });
}


/**
 * Handle cancel search - abort fetching and show partial results
 */
function handleCancelSearch() {
  if (fetcher) {
    fetcher.abort();
  }
  ui.showFinalResults(allMatchedItems.length);
  ui.updateDownloadButtons(allMatchedItems.length);
}


/**
 * Fetch all comments without searching - for download
 */
async function handleFetchAllComments() {
  // If we already have fetched comments from a search, use those directly
  if (allFetchedComments.length > 0) {
    const videoTitle = getVideoTitle();
    const filename = `${videoTitle}_all_comments.json`;
    ui.downloadAsJson(allFetchedComments, filename);
    ui.hideDownloadMenu();
    return;
  }

  // Show loading in dropdown instead of YouTube UI
  ui.showDownloadLoading();

  // Abort any ongoing fetch
  if (fetcher) {
    fetcher.abort();
  }

  try {
    allFetchedComments = [];
    let commentCount = 0;

    await fetcher.fetchAllComments(
      (checked, total) => {
        // Update progress in dropdown
        ui.updateDownloadProgress(commentCount);
      },
      (comments) => {
        allFetchedComments.push(...comments);
        commentCount = allFetchedComments.length;
        ui.updateDownloadProgress(commentCount);
      },
      true // Always fetch replies for download
    );

    // Download immediately after fetching
    const videoTitle = getVideoTitle();
    const filename = `${videoTitle}_all_comments.json`;
    ui.downloadAsJson(allFetchedComments, filename);

    // Reset dropdown to normal state
    ui.hideDownloadLoading();
    ui.hideDownloadMenu();

  } catch (error) {
    ui.hideDownloadLoading();
    ui.hideDownloadMenu();
  }
}


/**
 * Fetch all comments and download as CSV
 */
async function handleFetchAllCommentsCsv() {
  ui.showDownloadLoading();

  if (fetcher) {
    fetcher.abort();
  }

  try {
    allFetchedComments = [];
    let commentCount = 0;

    await fetcher.fetchAllComments(
      (checked, total) => {
        ui.updateDownloadProgress(commentCount);
      },
      (comments) => {
        allFetchedComments.push(...comments);
        commentCount = allFetchedComments.length;
        ui.updateDownloadProgress(commentCount);
      },
      true
    );

    const videoTitle = getVideoTitle();
    const filename = `${videoTitle}_all_comments.csv`;
    ui.downloadAsCsv(allFetchedComments, filename);

    ui.hideDownloadLoading();
    ui.hideDownloadMenu();

  } catch (error) {
    ui.hideDownloadLoading();
    ui.hideDownloadMenu();
  }
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

  // Show loading state (this will also disable search inputs)
  ui.showLoadingState();

  // Enable sort button immediately for dynamic sorting
  ui.toggleSortButton(true);

  try {
    // Reset searcher and allMatches
    searcher.reset();
    allMatches = [];  // Clear previous matches (for UI display)
    allMatchedItems = [];  // Clear previous matched items (for count/download)

    // Get settings from manager (already synced via checkbox change listeners)
    const settings = settingsManager.getSettings();
    searcher.setSettings(settings);

    // Clear any previous regex error
    ui.clearRegexError();

    // Check for regex errors before proceeding
    if (settings.useRegex) {
      searcher.buildPattern(query);
      if (searcher.hasRegexError()) {
        ui.showRegexError(searcher.getRegexError());
      }
    }

    // Cache to store parent comments for later reply nesting
    const parentCommentCache = new Map();

    // Helper function to process comments and find matches
    const processComments = (comments) => {
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

      // Add all matched items to allMatchedItems for count/download
      allMatchedItems.push(...topLevelMatches);
      allMatchedItems.push(...replyMatches);

      // Group replies with their parent comments for UI display
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

          // If parent not in map, find it from cache (for context)
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
            // Parent not found - add reply standalone to UI
            allMatches.push(reply);
            if (currentSortOrder === 'relevance') {
              ui.addCommentResult(reply, query, searcher, true);
            }
          }
        }
      }

      // Display comments with their nested replies in UI
      for (const { comment, replies, matched } of parentMap.values()) {
        // Attach replies to comment object for nested rendering
        if (replies.length > 0) {
          comment.replies = replies;
        }

        // Add to allMatches for UI display (parent matched OR has matching replies for context)
        if (matched || replies.length > 0) {
          allMatches.push(comment);
        }

        if (currentSortOrder === 'relevance') {
          ui.addCommentResult(comment, query, searcher);
        }
      }

      // Update count dynamically as we find matches
      ui.updateMatchCount(allMatchedItems.length);
    };

    // Check if we already have fetched comments to search on
    if (allFetchedComments.length > 0) {
      // Use cached comments - instant search!
      processComments(allFetchedComments);
    } else {
      // Fetch fresh comments
      const shouldFetchReplies = settings.searchInReplies;

      // Abort any ongoing fetch
      if (fetcher) {
        fetcher.abort();
      }

      allFetchedComments = [];

      await fetcher.fetchAllComments(
        // Progress callback
        (checked, total) => {
          ui.updateLoadingProgress(checked, total);
        },
        // Batch callback - process and display matches as they arrive
        (comments) => {
          // Store all fetched comments for reuse
          allFetchedComments.push(...comments);

          processComments(comments);
        },
        shouldFetchReplies
      );
    }

    // If using custom sort, re-sort and render
    if (currentSortOrder !== 'relevance') {
      resortResults(currentSortOrder);
    }

    // Check if search was aborted or cleared during fetch
    if (!currentSearchQuery || (ui && !ui.isSearchActive)) {
      return;
    }

    // Show final results (count of actual matched comments)
    ui.showFinalResults(allMatchedItems.length);

    // Update download buttons with counts
    ui.updateDownloadButtons(allMatchedItems.length);

    // Save to search history
    settingsManager.addToHistory(query);

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
  allFetchedComments = []; // Clear cached comments to force fresh fetch on next search
  allMatches = [];
  allMatchedItems = [];

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

function setupNavigationDetection() {
  // Use YouTube's native navigation events for reliable SPA detection

  // Cleanup when navigation starts
  window.addEventListener('yt-navigate-start', () => {
    cleanup();
  });

  // Re-initialize when navigation finishes
  window.addEventListener('yt-navigate-finish', () => {
    if (isYouTubeWatchPage()) {
      // Small delay to ensure DOM is fully settled
      setTimeout(() => {
        init();
      }, 1000);
    }
  });
}

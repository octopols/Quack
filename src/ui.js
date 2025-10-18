/**
 * UI Module
 * Handles all UI components for the comment search extension
 */

class CommentSearchUI {
  constructor() {
    this.searchBox = null;
    this.searchButton = null;
    this.settingsButton = null;
    this.settingsPopup = null;
    this.commentsSection = null;
    this.loadingIndicator = null;
    this.originalComments = null;
    this.isSearchActive = false;
  }

  /**
   * Initialize UI components
   */
  init() {
    this.findCommentsSection();
    this.createSearchBox();
    this.createSettingsPopup();
  }

  /**
   * Find YouTube's comments section
   */
  findCommentsSection() {
    // Try different selectors for comments section
    const selectors = [
      'ytd-comments#comments',
      '#comments',
      'ytd-item-section-renderer#sections'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        this.commentsSection = element;
        console.log('[UI] Found comments section:', selector);
        return;
      }
    }

    console.warn('[UI] Could not find comments section');
  }

  /**
   * Create search box and add to page
   */
  createSearchBox() {
    // Find the comments header where we'll add the search box
    const commentsHeader = document.querySelector('ytd-comments-header-renderer');
    if (!commentsHeader) {
      console.warn('[UI] Could not find comments header');
      return;
    }

    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.className = 'quack-search-container';
    searchContainer.innerHTML = `
      <div class="quack-search-box">
        <input 
          type="text" 
          id="quack-search-input" 
          class="quack-search-input"
          placeholder="Search comments..."
          autocomplete="off"
        />
        <button id="quack-search-button" class="quack-search-button" title="Search">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </div>
      <button id="quack-settings-button" class="quack-settings-button" title="Search Settings">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      </button>
    `;

    // Insert after the sort dropdown
    const sortMenu = commentsHeader.querySelector('#sort-menu');
    if (sortMenu) {
      sortMenu.parentNode.insertBefore(searchContainer, sortMenu.nextSibling);
    } else {
      commentsHeader.appendChild(searchContainer);
    }

    this.searchBox = searchContainer.querySelector('#quack-search-input');
    this.searchButton = searchContainer.querySelector('#quack-search-button');
    this.settingsButton = searchContainer.querySelector('#quack-settings-button');

    console.log('[UI] Search box created');
  }

  /**
   * Create settings popup
   */
  createSettingsPopup() {
    const popup = document.createElement('div');
    popup.className = 'quack-settings-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
      <div class="quack-settings-header">
        <span>⚙️ Search Settings</span>
        <button class="quack-settings-close">&times;</button>
      </div>
      <div class="quack-settings-body">
        <label class="quack-setting-item">
          <input type="checkbox" id="quack-case-sensitive" />
          <span>Case sensitive</span>
        </label>
        <label class="quack-setting-item">
          <input type="checkbox" id="quack-search-replies" />
          <span>Search in replies</span>
        </label>
        <label class="quack-setting-item">
          <input type="checkbox" id="quack-search-authors" />
          <span>Search in author names</span>
        </label>
        <label class="quack-setting-item">
          <input type="checkbox" id="quack-highlight-matches" />
          <span>Highlight matches</span>
        </label>
      </div>
    `;

    document.body.appendChild(popup);
    this.settingsPopup = popup;

    console.log('[UI] Settings popup created');
  }

  /**
   * Show settings popup
   */
  showSettings() {
    if (this.settingsPopup) {
      this.settingsPopup.style.display = 'block';
      this.positionSettingsPopup();
    }
  }

  /**
   * Hide settings popup
   */
  hideSettings() {
    if (this.settingsPopup) {
      this.settingsPopup.style.display = 'none';
    }
  }

  /**
   * Position settings popup near the settings button
   */
  positionSettingsPopup() {
    if (!this.settingsButton || !this.settingsPopup) return;

    const rect = this.settingsButton.getBoundingClientRect();
    this.settingsPopup.style.top = (rect.bottom + 5) + 'px';
    this.settingsPopup.style.left = (rect.left - 200) + 'px';
  }

  /**
   * Update settings checkboxes
   * @param {Object} settings - Current settings
   */
  updateSettingsUI(settings) {
    if (!this.settingsPopup) return;

    document.getElementById('quack-case-sensitive').checked = settings.caseSensitive;
    document.getElementById('quack-search-replies').checked = settings.searchInReplies;
    document.getElementById('quack-search-authors').checked = settings.searchInAuthorNames;
    document.getElementById('quack-highlight-matches').checked = settings.highlightMatches;
  }

  /**
   * Clear comments section and show loading state
   */
  showLoadingState() {
    if (!this.commentsSection) {
      this.findCommentsSection();
    }

    if (!this.commentsSection) {
      console.error('[UI] Cannot show loading state: comments section not found');
      return;
    }

    // Save original comments (if not already saved)
    if (!this.originalComments) {
      const contentsContainer = this.commentsSection.querySelector('#contents');
      if (contentsContainer) {
        this.originalComments = contentsContainer.cloneNode(true);
      }
    }

    // Clear comments
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (contentsContainer) {
      contentsContainer.innerHTML = '';
    }

    // Create loading indicator
    this.createLoadingIndicator();
    this.isSearchActive = true;
  }

  /**
   * Create loading indicator
   */
  createLoadingIndicator() {
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (!contentsContainer) return;

    const loader = document.createElement('div');
    loader.className = 'quack-loading-indicator';
    loader.id = 'quack-loading';
    loader.innerHTML = `
      <div class="quack-loading-spinner"></div>
      <div class="quack-loading-text">
        <div>🔍 Searching comments...</div>
        <div id="quack-loading-progress">Checked 0 of 0 total comments</div>
      </div>
    `;

    contentsContainer.appendChild(loader);
    this.loadingIndicator = loader;
  }

  /**
   * Update loading progress
   * @param {number} checked - Number of comments checked
   * @param {number} total - Total number of comments
   */
  updateLoadingProgress(checked, total) {
    const progressElement = document.getElementById('quack-loading-progress');
    if (progressElement) {
      progressElement.textContent = `Checked ${checked.toLocaleString()} of ${total.toLocaleString()} total comments`;
    }
  }

  /**
   * Hide loading indicator
   */
  hideLoadingIndicator() {
    if (this.loadingIndicator) {
      this.loadingIndicator.remove();
      this.loadingIndicator = null;
    }
  }

  /**
   * Add a comment to the results
   * @param {Object} comment - Comment object
   * @param {string} query - Search query for highlighting
   */
  addCommentResult(comment, query, searcher) {
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (!contentsContainer) return;

    // Create comment element
    const commentElement = document.createElement('div');
    commentElement.className = 'quack-comment-result';
    
    const highlightedText = searcher.highlightMatches(comment.text, query);
    const highlightedAuthor = searcher.settings.searchInAuthorNames 
      ? searcher.highlightMatches(comment.author, query)
      : searcher.escapeHtml(comment.author);

    commentElement.innerHTML = `
      <div class="quack-comment-header">
        <span class="quack-comment-author">${highlightedAuthor}</span>
        <span class="quack-comment-time">${searcher.escapeHtml(comment.timestamp)}</span>
      </div>
      <div class="quack-comment-text">${highlightedText}</div>
      <div class="quack-comment-footer">
        <span class="quack-comment-likes">👍 ${searcher.escapeHtml(comment.likes)}</span>
      </div>
    `;

    // Insert before loading indicator if it exists, otherwise append
    if (this.loadingIndicator) {
      contentsContainer.insertBefore(commentElement, this.loadingIndicator);
    } else {
      contentsContainer.appendChild(commentElement);
    }
  }

  /**
   * Show final results message
   * @param {number} matchCount - Number of matches found
   */
  showFinalResults(matchCount) {
    this.hideLoadingIndicator();
    
    if (matchCount === 0) {
      this.showNoResults();
    } else {
      this.showResultsCount(matchCount);
    }

    this.isSearchActive = false;
  }

  /**
   * Show no results message
   */
  showNoResults() {
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (!contentsContainer) return;

    const message = document.createElement('div');
    message.className = 'quack-no-results';
    message.innerHTML = `
      <div class="quack-no-results-icon">🔍</div>
      <div class="quack-no-results-text">No comments match your search</div>
      <div class="quack-no-results-hint">Try different keywords or adjust your search settings</div>
    `;

    contentsContainer.appendChild(message);
  }

  /**
   * Show results count
   * @param {number} count - Number of results
   */
  showResultsCount(count) {
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (!contentsContainer) return;

    const message = document.createElement('div');
    message.className = 'quack-results-count';
    message.textContent = `Found ${count.toLocaleString()} matching comment${count === 1 ? '' : 's'}`;

    contentsContainer.insertBefore(message, contentsContainer.firstChild);
  }

  /**
   * Restore original comments
   */
  restoreOriginalComments() {
    if (!this.originalComments || !this.commentsSection) return;

    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (contentsContainer) {
      contentsContainer.innerHTML = '';
      contentsContainer.appendChild(this.originalComments.cloneNode(true));
    }

    this.isSearchActive = false;
  }

  /**
   * Clear search and restore original state
   */
  clearSearch() {
    if (this.searchBox) {
      this.searchBox.value = '';
    }
    this.restoreOriginalComments();
    this.hideLoadingIndicator();
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (!contentsContainer) return;

    contentsContainer.innerHTML = '';

    const errorElement = document.createElement('div');
    errorElement.className = 'quack-error';
    errorElement.innerHTML = `
      <div class="quack-error-icon">⚠️</div>
      <div class="quack-error-text">${message}</div>
    `;

    contentsContainer.appendChild(errorElement);
    this.isSearchActive = false;
  }
}

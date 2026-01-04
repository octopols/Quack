// UI Module - Comment search interface

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


  init() {
    this.findCommentsSection();
    this.createSearchBox();
    this.createSettingsPopup();
    this.setupGlobalClickHandlers();
  }


  setupGlobalClickHandlers() {
    // Set up keyboard navigation
    this.setupKeyboardNavigation();

    // Set up copy functionality
    this.setupCopyFunctionality();

    // Use document-level event delegation for like buttons
    document.addEventListener('click', (e) => {
      const target = e.target;

      // Check if clicked element is within a like button
      const likeButton = target.closest('#like-button');
      if (likeButton) {
        const commentElement = target.closest('ytd-comment-thread-renderer[data-comment-id]');
        if (commentElement) {

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const commentId = commentElement.getAttribute('data-comment-id');
          const commentAuthor = commentElement.getAttribute('data-comment-author');
          const buttonElement = likeButton.querySelector('button');

          if (buttonElement) {
            this.handleLikeClick(buttonElement, likeButton, { id: commentId, author: commentAuthor });
          }
          return false;
        }
      }
    }, true); // Use capture phase to intercept before YouTube's handlers
  }


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
        return;
      }
    }
  }


  createSearchBox() {
    // Check if search bar already exists and remove it
    const existingSearchContainer = document.querySelector('.quack-search-container');
    if (existingSearchContainer) {

      existingSearchContainer.remove();
    }

    // Find the comments header where we'll add the search box
    const commentsHeader = document.querySelector('ytd-comments-header-renderer');
    if (!commentsHeader) {

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
        <div class="quack-search-toggles">
          <button id="quack-regex-toggle" class="quack-toggle-btn" title="Use Regular Expression (Alt+R)">.*</button>
          <button id="quack-word-toggle" class="quack-toggle-btn" title="Match Whole Word (Alt+W)"><span class="quack-whole-word">ab</span></button>
        </div>
        <button id="quack-search-button" class="quack-search-button" title="Search">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </button>
      </div>
      <div class="quack-download-wrapper">
        <button id="quack-download-button" class="quack-icon-button" title="Export Comments">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
        </button>
        <div id="quack-download-menu" class="quack-dropdown-menu">
          <div id="quack-download-loading" class="quack-download-loading" style="display: none;">
            <div class="quack-download-spinner"></div>
            <span id="quack-download-progress">Fetching comments...</span>
          </div>
          <div id="quack-download-options">
            <button id="quack-fetch-all" class="quack-dropdown-item">
              <span>Download All Comments</span>
              <span class="quack-item-hint">Fetch & export</span>
            </button>
            <button id="quack-download-results" class="quack-dropdown-item" disabled>
              <span>Download Search Results</span>
              <span class="quack-item-count" id="quack-results-count"></span>
            </button>
          </div>
        </div>
      </div>
      <button id="quack-settings-button" class="quack-icon-button" title="Search Settings">
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
    this.regexToggle = searchContainer.querySelector('#quack-regex-toggle');
    this.wholeWordToggle = searchContainer.querySelector('#quack-word-toggle');
    this.downloadButton = searchContainer.querySelector('#quack-download-button');
    this.downloadMenu = searchContainer.querySelector('#quack-download-menu');
    this.fetchAllBtn = searchContainer.querySelector('#quack-fetch-all');
    this.downloadResultsBtn = searchContainer.querySelector('#quack-download-results');
    this.settingsPopup = null;
  }


  createSettingsPopup() {
    const popup = document.createElement('div');
    popup.className = 'quack-settings-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
      <div class="quack-settings-header">
        <span>Search Settings</span>
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
  }

  /**
   * Position settings popup near the settings button
   */
  positionSettingsPopup() {
    if (!this.settingsButton || !this.settingsPopup) return;

    const rect = this.settingsButton.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    this.settingsPopup.style.top = (rect.bottom + scrollY + 5) + 'px';
    this.settingsPopup.style.left = (rect.left + scrollX - 200) + 'px';
  }

  injectSortReplacement(onSortCallback) {
    if (this.sortWrapper) return; // Already injected

    const sortMenu = this.commentsSection ? this.commentsSection.querySelector('#sort-menu') : document.querySelector('#sort-menu');
    if (!sortMenu) return;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'quack-sort-wrapper';
    wrapper.style.display = 'none'; // Hidden by default
    wrapper.innerHTML = `
      <button class="quack-sort-btn">
        <div class="quack-sort-icon">
          <svg viewBox="0 0 24 24"><path d="M21 5H3a1 1 0 000 2h18a1 1 0 100-2Zm-6 6H3a1 1 0 000 2h12a1 1 0 000-2Zm-6 6H3a1 1 0 000 2h6a1 1 0 000-2Z"/></svg>
        </div>
        <span>Sort by</span>
      </button>
      <div class="quack-sort-dropdown-menu">
        <div class="quack-sort-item selected" data-value="relevance">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Most Relevant</div>
        </div>
        <div class="quack-sort-item" data-value="top">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Top comments</div>
        </div>
        <div class="quack-sort-item" data-value="newest">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Newest first</div>
        </div>
         <div class="quack-sort-item" data-value="oldest">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Oldest first</div>
        </div>
         <div class="quack-sort-item" data-value="replies">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Most replies</div>
        </div>
         <div class="quack-sort-item" data-value="length">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Longest</div>
        </div>
         <div class="quack-sort-item" data-value="author">
          <div class="quack-sort-check"><svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg></div>
          <div class="quack-sort-label">Author (A-Z)</div>
        </div>
      </div>
    `;

    // Add click handlers
    const btn = wrapper.querySelector('.quack-sort-btn');
    const menu = wrapper.querySelector('.quack-sort-dropdown-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        menu.classList.remove('visible');
      }
    });

    const items = wrapper.querySelectorAll('.quack-sort-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        const val = item.dataset.value;
        // Update selected visual state
        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');

        menu.classList.remove('visible');
        if (onSortCallback) onSortCallback(val);
      });
    });

    // Insert before sort menu so it takes its place when toggled
    sortMenu.parentNode.insertBefore(wrapper, sortMenu);

    this.sortWrapper = wrapper;
    this.nativeSortMenu = sortMenu;
  }

  toggleSortButton(showCustom) {
    // Re-find elements if reference lost (SPA nav)
    if (!this.nativeSortMenu || !this.nativeSortMenu.isConnected) {
      this.nativeSortMenu = this.commentsSection?.querySelector('#sort-menu') || document.querySelector('#sort-menu');
    }

    if (!this.sortWrapper || !this.nativeSortMenu) return;

    if (showCustom) {
      this.nativeSortMenu.style.display = 'none';
      this.sortWrapper.style.display = 'inline-flex';
    } else {
      this.nativeSortMenu.style.display = '';
      this.sortWrapper.style.display = 'none';

      // Reset selection to relevance
      const items = this.sortWrapper.querySelectorAll('.quack-sort-item');
      items.forEach(i => i.classList.remove('selected'));
      this.sortWrapper.querySelector('[data-value="relevance"]')?.classList.add('selected');
    }
  }


  showSettings() {
    this.hideDownloadMenu();
    if (this.settingsPopup) {
      this.settingsPopup.style.display = 'block';
      this.positionSettingsPopup();
    }
  }


  hideSettings() {
    if (this.settingsPopup) {
      this.settingsPopup.style.display = 'none';
    }
  }



  /**
   * Update settings checkboxes
   * @param {Object} settings - Current settings
   */
  updateSettingsUI(settings) {
    if (!this.settingsPopup) {
      return;
    }

    const caseSensitive = document.getElementById('quack-case-sensitive');
    const searchReplies = document.getElementById('quack-search-replies');
    const searchAuthors = document.getElementById('quack-search-authors');
    const highlightMatches = document.getElementById('quack-highlight-matches');

    if (caseSensitive) caseSensitive.checked = settings.caseSensitive;
    if (searchReplies) searchReplies.checked = settings.searchInReplies;
    if (searchAuthors) searchAuthors.checked = settings.searchInAuthorNames;
    if (highlightMatches) highlightMatches.checked = settings.highlightMatches;

    // Update toggle buttons
    this.updateToggleButtons(settings);
  }

  /**
   * Update toggle button visual states
   */
  updateToggleButtons(settings) {
    if (this.regexToggle) {
      this.regexToggle.classList.toggle('active', settings.useRegex);
    }
    if (this.wholeWordToggle) {
      this.wholeWordToggle.classList.toggle('active', settings.wholeWord);
    }
  }

  /**
   * Show regex error state on input
   */
  showRegexError(errorMessage) {
    if (!this.searchBox) return;

    const searchBoxContainer = this.searchBox.closest('.quack-search-box');
    if (searchBoxContainer) {
      searchBoxContainer.classList.add('quack-regex-error');
    }
    this.searchBox.classList.add('quack-regex-error');
    this.searchBox.title = `Invalid regex: ${errorMessage}`;
  }

  /**
   * Clear regex error state
   */
  clearRegexError() {
    if (!this.searchBox) return;

    const searchBoxContainer = this.searchBox.closest('.quack-search-box');
    if (searchBoxContainer) {
      searchBoxContainer.classList.remove('quack-regex-error');
    }
    this.searchBox.classList.remove('quack-regex-error');
    this.searchBox.title = '';
  }

  /**
   * Update download button states and counts
   * @param {number} filteredCount - Number of filtered/matched comments
   */
  updateDownloadButtons(filteredCount) {
    const countEl = document.getElementById('quack-results-count');

    if (countEl) {
      countEl.textContent = filteredCount > 0 ? `(${filteredCount})` : '';
    }

    if (this.downloadResultsBtn) {
      this.downloadResultsBtn.disabled = filteredCount === 0;
    }
  }

  /**
   * Toggle download dropdown menu visibility
   */
  toggleDownloadMenu() {
    this.hideSettings();
    if (this.downloadMenu) {
      this.downloadMenu.classList.toggle('visible');
    }
  }

  /**
   * Hide download dropdown menu
   */
  hideDownloadMenu() {
    if (this.downloadMenu) {
      this.downloadMenu.classList.remove('visible');
    }
  }

  /**
   * Show download loading state in dropdown
   */
  showDownloadLoading() {
    const loading = document.getElementById('quack-download-loading');
    const options = document.getElementById('quack-download-options');
    if (loading) loading.style.display = 'flex';
    if (options) options.style.display = 'none';
    // Ensure menu stays visible
    if (this.downloadMenu) {
      this.downloadMenu.classList.add('visible');
    }
  }

  /**
   * Hide download loading state and show options
   */
  hideDownloadLoading() {
    const loading = document.getElementById('quack-download-loading');
    const options = document.getElementById('quack-download-options');
    if (loading) loading.style.display = 'none';
    if (options) options.style.display = 'block';
  }

  /**
   * Update download progress text
   * @param {number} count - Number of comments fetched
   */
  updateDownloadProgress(count) {
    const progress = document.getElementById('quack-download-progress');
    if (progress) {
      progress.textContent = `Fetching... ${count} comments`;
    }
  }

  /**
   * Download data as JSON file
   * @param {Array} data - Array of comments to download
   * @param {string} filename - Filename for the download
   */
  downloadAsJson(data, filename) {
    // Clean data for export (remove internal properties)
    const cleanData = data.map(comment => ({
      id: comment.id,
      author: comment.author,
      authorChannelUrl: comment.authorChannelUrl,
      text: comment.text,
      likes: comment.likes,
      publishedTime: comment.publishedTime,
      isReply: comment.isReply,
      parentId: comment.parentId || null,
      replyCount: comment.replyCount || 0,
      replies: comment.replies ? comment.replies.map(reply => ({
        id: reply.id,
        author: reply.author,
        authorChannelUrl: reply.authorChannelUrl,
        text: reply.text,
        likes: reply.likes,
        publishedTime: reply.publishedTime,
        isReply: true,
        parentId: reply.parentId
      })) : []
    }));

    const jsonStr = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear comments section and show loading state
   */
  showLoadingState() {
    if (!this.commentsSection) {
      this.findCommentsSection();
    }

    if (!this.commentsSection) {
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

      // Create results count element at top (will be updated dynamically)
      const resultsCount = document.createElement('div');
      resultsCount.className = 'quack-results-count';
      resultsCount.id = 'quack-live-count';
      resultsCount.textContent = 'Found 0 matching comments';
      contentsContainer.appendChild(resultsCount);
    }

    // Create loading indicator
    this.createLoadingIndicator();
    this.disableSearch();

    // Add search active class
    if (this.commentsSection) {
      this.commentsSection.classList.add('quack-search-active');
    }

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
        <div>Searching comments...</div>
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
   * Update match count dynamically during search
   * @param {number} count - Number of matching comments found so far
   */
  updateMatchCount(count) {
    const liveCount = document.getElementById('quack-live-count');
    if (liveCount) {
      liveCount.textContent = `Found ${count.toLocaleString()} matching comment${count === 1 ? '' : 's'}`;
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
   * Set up keyboard navigation for search results
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Only handle keys when search is active and not typing in input
      if (!this.isSearchActive || e.target === this.searchBox) return;

      const comments = document.querySelectorAll('.quack-search-active ytd-comment-thread-renderer');
      if (comments.length === 0) return;

      const currentFocused = document.querySelector('.quack-comment-focused');
      let currentIndex = -1;

      if (currentFocused) {
        currentIndex = Array.from(comments).indexOf(currentFocused);
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'j': // Vim-style navigation
          e.preventDefault();
          this.focusComment(comments, Math.min(currentIndex + 1, comments.length - 1));
          break;
        case 'ArrowUp':
        case 'k': // Vim-style navigation
          e.preventDefault();
          this.focusComment(comments, Math.max(currentIndex - 1, 0));
          break;
        case 'l': // Like current comment
          e.preventDefault();
          if (currentFocused) {
            const likeButton = currentFocused.querySelector('#like-button button');
            if (likeButton) likeButton.click();
          }
          break;
        case 'c': // Copy current comment
          e.preventDefault();
          if (currentFocused) {
            this.copyCommentText(currentFocused);
          }
          break;
        case 'Escape':
          e.preventDefault();
          this.clearCommentFocus();
          break;
      }
    });
  }

  /**
   * Focus a specific comment in the results
   * @param {NodeList} comments - List of comment elements
   * @param {number} index - Index to focus
   */
  focusComment(comments, index) {
    // Remove previous focus
    this.clearCommentFocus();

    if (index >= 0 && index < comments.length) {
      const comment = comments[index];
      comment.classList.add('quack-comment-focused');
      comment.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Clear comment focus
   */
  clearCommentFocus() {
    const focused = document.querySelectorAll('.quack-comment-focused');
    focused.forEach(el => el.classList.remove('quack-comment-focused'));
  }

  /**
   * Set up copy functionality for comments
   */
  setupCopyFunctionality() {
    document.addEventListener('contextmenu', (e) => {
      const commentElement = e.target.closest('ytd-comment-thread-renderer[data-comment-id]');
      if (commentElement && this.isSearchActive) {
        e.preventDefault();
        this.showCommentContextMenu(e, commentElement);
      }
    });
  }

  /**
   * Show context menu for comment
   * @param {Event} e - Context menu event
   * @param {HTMLElement} commentElement - Comment element
   */
  showCommentContextMenu(e, commentElement) {
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'quack-context-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: var(--yt-spec-menu-background);
      border: 1px solid var(--yt-spec-10-percent-layer);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      z-index: 10000;
      min-width: 150px;
    `;

    const options = [
      { text: 'Copy comment text', action: () => this.copyCommentText(commentElement) },
      { text: 'Copy comment link', action: () => this.copyCommentLink(commentElement) },
      { text: 'Go to author channel', action: () => this.goToAuthorChannel(commentElement) }
    ];

    options.forEach(option => {
      const item = document.createElement('div');
      item.className = 'quack-context-menu-item';
      item.textContent = option.text;
      item.style.cssText = `
        padding: 12px;
        cursor: pointer;
        color: var(--yt-spec-text-primary);
        font-size: 14px;
        border-radius: 4px;
        margin: 4px;
      `;

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = 'var(--yt-spec-badge-chip-background)';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = '';
      });

      item.addEventListener('click', () => {
        option.action();
        document.body.removeChild(menu);
      });

      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Remove menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', () => {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      }, { once: true });
    }, 100);
  }

  /**
   * Copy comment text to clipboard
   * @param {HTMLElement} commentElement - Comment element
   */
  async copyCommentText(commentElement) {
    const textElement = commentElement.querySelector('#content-text');
    if (textElement) {
      try {
        await navigator.clipboard.writeText(textElement.textContent);
        this.showToast('Comment text copied to clipboard!');
      } catch (err) {
        this.showToast('Failed to copy text', 'error');
      }
    }
  }

  /**
   * Copy comment link to clipboard
   * @param {HTMLElement} commentElement - Comment element
   */
  async copyCommentLink(commentElement) {
    const commentId = commentElement.getAttribute('data-comment-id');
    const videoId = new URLSearchParams(window.location.search).get('v');

    if (commentId && videoId) {
      const link = `${window.location.origin}/watch?v=${videoId}&lc=${commentId}`;
      try {
        await navigator.clipboard.writeText(link);
        this.showToast('Comment link copied to clipboard!');
      } catch (err) {
        this.showToast('Failed to copy link', 'error');
      }
    }
  }

  /**
   * Navigate to author's channel
   * @param {HTMLElement} commentElement - Comment element
   */
  goToAuthorChannel(commentElement) {
    const authorName = commentElement.getAttribute('data-comment-author');
    if (authorName) {
      // Try to find existing author link in DOM first
      const authorLink = commentElement.querySelector('#author-text');
      if (authorLink && authorLink.href && authorLink.href !== '#') {
        window.open(authorLink.href, '_blank');
      } else {
        // Fallback: search for the author
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(authorName)}`;
        window.open(searchUrl, '_blank');
      }
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Message to show
   * @param {string} type - Type of toast (info, error)
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `quack-toast quack-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : '#4caf50'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10001;
      font-size: 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      animation: quack-fadeIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'quack-fadeOut 0.3s ease-out';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }





  /**
   * Create a native YouTube comment element using the actual YT structure
   * @param {Object} comment - Comment object
   * @param {string} query - Search query for highlighting
   * @param {Object} searcher - Searcher instance for highlighting
   * @param {boolean} isReply - Whether this is a reply comment
   * @param {string} parentAuthor - Parent author name for reply indicator
   * @returns {HTMLElement} Comment element
   */
  createNativeCommentElement(comment, query, searcher, isReply = false, parentAuthor = null) {
    // Create the main comment thread container
    const commentThread = document.createElement('ytd-comment-thread-renderer');
    commentThread.className = 'style-scope ytd-item-section-renderer';
    commentThread.setAttribute('use-small-avatars', '');

    const highlightedText = searcher.highlightMatches(comment.text, query);
    const highlightedAuthor = searcher.settings.searchInAuthorNames
      ? searcher.highlightMatches(comment.author, query)
      : searcher.escapeHtml(comment.author);

    // Get actual profile photo URL or use default
    const thumbnailUrl = (comment.authorThumbnail && comment.authorThumbnail.length > 0)
      ? comment.authorThumbnail[0].url
      : 'https://yt3.googleusercontent.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';

    // Get channel URL for clickable profile links
    const channelUrl = comment.channelUrl || '#';

    // Use smaller avatar for replies
    const avatarSize = isReply ? '32' : '40';

    // Build reply indicator if this is a reply
    const replyIndicator = isReply && parentAuthor ? `
      <div class="quack-reply-indicator" style="
        font-size: 12px;
        color: var(--yt-spec-text-secondary);
        margin-bottom: 4px;
        font-style: italic;
      ">
        ↳ In reply to @${searcher.escapeHtml(parentAuthor)}
      </div>
    ` : '';

    // Use the exact YouTube comment structure
    commentThread.innerHTML = `
      <div id="comment-container" class="style-scope ytd-comment-thread-renderer">
        <div class="threadline style-scope ytd-comment-thread-renderer" hidden=""><div class="continuation style-scope ytd-comment-thread-renderer"></div></div>
        <div class="removed-placeholder style-scope ytd-comment-thread-renderer" hidden=""></div>
        <ytd-comment-view-model id="comment" class="style-scope ytd-comment-thread-renderer" use-small-avatars="" web-watch-compact-comments="" optimal-reading-width-comments="">
          <div id="paid-comment-background" class="style-scope ytd-comment-view-model"></div>
          <div id="linked-comment-badge" class="style-scope ytd-comment-view-model"></div>
          
          <div id="body" class="style-scope ytd-comment-view-model">
            <div id="author-thumbnail" class="style-scope ytd-comment-view-model">
              <a href="${channelUrl}" target="_blank" class="style-scope ytd-comment-view-model">
                <button id="author-thumbnail-button" class="style-scope ytd-comment-view-model" aria-label="${searcher.escapeHtml(comment.author)}">
                  <yt-img-shadow fit="" height="${avatarSize}" width="${avatarSize}" class="style-scope ytd-comment-view-model no-transition" style="background-color: transparent;" loaded="">
                    <img id="img" draggable="false" class="style-scope yt-img-shadow" alt="" height="${avatarSize}" width="${avatarSize}" src="${thumbnailUrl}">
                  </yt-img-shadow>
                </button>
              </a>
            </div>
            <div id="main" class="style-scope ytd-comment-view-model">
              ${replyIndicator}
              <div id="header" class="style-scope ytd-comment-view-model">
                <div id="pinned-comment-badge" class="style-scope ytd-comment-view-model"></div>
                <div id="header-author" class="style-scope ytd-comment-view-model">
                  <h3 class="style-scope ytd-comment-view-model">
                    <a id="author-text" class="yt-simple-endpoint style-scope ytd-comment-view-model" href="${channelUrl}" target="_blank">
                      <span class="style-scope ytd-comment-view-model">${highlightedAuthor}</span>
                    </a>
                  </h3>
                  <span id="author-comment-badge" class="style-scope ytd-comment-view-model"></span>
                  <span id="sponsor-comment-badge" class="style-scope ytd-comment-view-model"></span>
                  <span dir="auto" id="published-time-text" class="style-scope ytd-comment-view-model">
                    <a class="yt-simple-endpoint style-scope ytd-comment-view-model" href="#">
                      ${searcher.escapeHtml(comment.timestamp)}
                    </a>
                  </span>
                </div>
              </div>
              
              <div id="expander" class="style-scope ytd-comment-view-model">
                <div id="content" class="style-scope ytd-comment-view-model">
                  <yt-attributed-string id="content-text" class="style-scope ytd-comment-view-model">
                    <span class="yt-core-attributed-string yt-core-attributed-string--white-space-pre-wrap" dir="auto" role="text">${highlightedText}</span>
                  </yt-attributed-string>
                </div>
              </div>
              
              <ytd-comment-engagement-bar id="action-buttons" class="style-scope ytd-comment-view-model">
                <div id="toolbar" class="style-scope ytd-comment-engagement-bar">
                  <ytd-toggle-button-renderer id="like-button" button-tooltip-position="bottom" icon-size="16" class="style-scope ytd-comment-engagement-bar" button-renderer="true">
                    <yt-button-shape>
                      <button class="yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-s yt-spec-button-shape-next--icon-button yt-spec-button-shape-next--enable-backdrop-filter-experiment" aria-pressed="false" aria-label="Like this comment" aria-disabled="false">
                        <div aria-hidden="true" class="yt-spec-button-shape-next__icon">
                          <span class="ytIconWrapperHost" style="width: 16px; height: 16px;">
                            <span class="yt-icon-shape ytSpecIconShapeHost">
                              <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
                                  <path d="M9.221 1.795a1 1 0 011.109-.656l1.04.173a4 4 0 013.252 4.784L14 9h4.061a3.664 3.664 0 013.576 2.868A3.68 3.68 0 0121 14.85l.02.087A3.815 3.815 0 0120 18.5v.043l-.01.227a2.82 2.82 0 01-.135.663l-.106.282A3.754 3.754 0 0116.295 22h-3.606l-.392-.007a12.002 12.002 0 01-5.223-1.388l-.343-.189-.27-.154a2.005 2.005 0 00-.863-.26l-.13-.004H3.5a1.5 1.5 0 01-1.5-1.5V12.5A1.5 1.5 0 013.5 11h1.79l.157-.013a1 1 0 00.724-.512l.063-.145 2.987-8.535Zm-1.1 9.196A3 3 0 015.29 13H4v4.998h1.468a4 4 0 011.986.528l.27.155.285.157A10 10 0 0012.69 20h3.606c.754 0 1.424-.483 1.663-1.2l.03-.126a.819.819 0 00.012-.131v-.872l.587-.586c.388-.388.577-.927.523-1.465l-.038-.23-.02-.087-.21-.9.55-.744A1.663 1.663 0 0018.061 11H14a2.002 2.002 0 01-1.956-2.418l.623-2.904a2 2 0 00-1.626-2.392l-.21-.035-2.71 7.741Z"></path>
                                </svg>
                              </div>
                            </span>
                          </span>
                        </div>
                        <yt-touch-feedback-shape aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
                          <div class="yt-spec-touch-feedback-shape__stroke"></div>
                          <div class="yt-spec-touch-feedback-shape__fill"></div>
                        </yt-touch-feedback-shape>
                      </button>
                    </yt-button-shape>
                  </ytd-toggle-button-renderer>
                  <span id="vote-count-middle" class="style-scope ytd-comment-engagement-bar">
                    ${searcher.escapeHtml(comment.likes)}
                  </span>
                  
                  <ytd-button-renderer id="reply-button-end" force-icon-button="true" class="style-scope ytd-comment-engagement-bar" button-renderer="" button-next="">
                    <yt-button-shape>
                      <button class="yt-spec-button-shape-next yt-spec-button-shape-next--text yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-s yt-spec-button-shape-next--enable-backdrop-filter-experiment" aria-label="Reply">
                        <div class="yt-spec-button-shape-next__button-text-content">
                          <span class="yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap" role="text">Reply</span>
                        </div>
                        <yt-touch-feedback-shape aria-hidden="true" class="yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response">
                          <div class="yt-spec-touch-feedback-shape__stroke"></div>
                          <div class="yt-spec-touch-feedback-shape__fill"></div>
                        </yt-touch-feedback-shape>
                      </button>
                    </yt-button-shape>
                  </ytd-button-renderer>
                </div>
              </ytd-comment-engagement-bar>
            </div>
          </div>
        </ytd-comment-view-model>
      </div>
    `;

    return commentThread;
  }

  /**
   * Show reply dialog for a comment
   * @param {HTMLElement} commentElement - Comment element
   * @param {Object} comment - Comment data
   */
  showReplyDialog(commentElement, comment) {
    // Check if reply dialog already exists
    const existingDialog = commentElement.querySelector('.quack-reply-dialog');
    if (existingDialog) {
      existingDialog.remove();
      return;
    }

    const replyDialog = document.createElement('div');
    replyDialog.className = 'quack-reply-dialog';
    replyDialog.style.cssText = `
      margin-top: 12px;
      padding: 16px;
      background: var(--yt-spec-badge-chip-background);
      border-radius: 8px;
      border-left: 3px solid var(--yt-spec-call-to-action);
    `;

    replyDialog.innerHTML = `
      <div style="margin-bottom: 12px; font-size: 14px; color: var(--yt-spec-text-secondary);">
        Replying to ${comment.author}
      </div>
      <textarea 
        class="quack-reply-input" 
        placeholder="Add a reply..." 
        style="
          width: 100%; 
          min-height: 80px; 
          padding: 12px; 
          border: 1px solid var(--yt-spec-10-percent-layer);
          border-radius: 8px;
          background: var(--yt-spec-base-background);
          color: var(--yt-spec-text-primary);
          font-family: Roboto, Arial, sans-serif;
          font-size: 14px;
          resize: vertical;
          outline: none;
        "
      ></textarea>
      <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
        <button class="quack-reply-cancel" style="
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: var(--yt-spec-text-secondary);
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
        <button class="quack-reply-submit" style="
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: var(--yt-spec-call-to-action);
          color: white;
          cursor: pointer;
          font-size: 14px;
        ">Reply</button>
      </div>
    `;

    // Add event listeners
    const cancelBtn = replyDialog.querySelector('.quack-reply-cancel');
    const submitBtn = replyDialog.querySelector('.quack-reply-submit');
    const textarea = replyDialog.querySelector('.quack-reply-input');

    cancelBtn.addEventListener('click', () => replyDialog.remove());

    submitBtn.addEventListener('click', () => {
      const replyText = textarea.value.trim();
      if (replyText) {
        this.showToast('Reply functionality is read-only in search results', 'info');
        replyDialog.remove();
      }
    });

    // Focus textarea
    setTimeout(() => textarea.focus(), 100);

    // Insert after the comment content
    const insertPoint = commentElement.querySelector('#action-buttons') || commentElement.querySelector('.ytd-comment-engagement-bar');
    if (insertPoint) {
      insertPoint.parentNode.insertBefore(replyDialog, insertPoint.nextSibling);
    }
  }

  /**
   * Add invisible overlays over like buttons for reliable clicking
   * @param {HTMLElement} commentElement - The comment element
   * @param {Object} comment - Comment data
   */
  addButtonOverlays(commentElement, comment) {
    const likeButton = commentElement.querySelector('#like-button');


    if (likeButton) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10;
        cursor: pointer;
        background: transparent;
      `;
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const buttonElement = likeButton.querySelector('button');
        if (buttonElement) {
          this.handleLikeClick(buttonElement, likeButton, comment);
        }
      });

      likeButton.style.position = 'relative';
      likeButton.appendChild(overlay);
    }


  }

  /**
   * Set up interactions for a comment element to make buttons work
   * @param {HTMLElement} commentElement - The comment element
   * @param {Object} comment - Comment data
   */
  setupCommentInteractions(commentElement, comment) {
    // Handle like button click - more robust event handling
    const likeButton = commentElement.querySelector('#like-button button');
    const likeButtonRenderer = commentElement.querySelector('#like-button');

    if (likeButton) {
      // Try multiple event attachment methods

      // Method 1: Direct event listener with capture
      likeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        this.handleLikeClick(likeButton, likeButtonRenderer, comment);
      }, true);

      // Also handle keyboard activation
      likeButton.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleLikeClick(likeButton, likeButtonRenderer, comment);
        }
      });
    }

    // Handle reply button click - show reply box
    const replyButton = commentElement.querySelector('#reply-button-end button');
    if (replyButton) {
      replyButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.showReplyDialog(commentElement, comment);
      });
    }

    // Handle author name click - go to channel
    const authorLink = commentElement.querySelector('#author-text');
    if (authorLink) {
      authorLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToAuthorChannel(commentElement);
      });
    }

    // Handle author thumbnail click - go to channel
    const authorThumbnail = commentElement.querySelector('#author-thumbnail-button');
    if (authorThumbnail) {
      authorThumbnail.addEventListener('click', (e) => {
        e.preventDefault();
        this.goToAuthorChannel(commentElement);
      });
    }

    // Handle timestamp click - copy permalink
    const timestamp = commentElement.querySelector('#published-time-text a');
    if (timestamp) {
      timestamp.addEventListener('click', (e) => {
        e.preventDefault();
        this.copyCommentLink(commentElement);
        this.showToast('Comment link copied!');
      });
    }
  }

  /**
   * Handle like button click
   * @param {HTMLElement} button - The like button element
   * @param {HTMLElement} renderer - The button renderer element
   * @param {Object} comment - Comment data
   */
  handleLikeClick(button, renderer, comment) {
    // Toggle liked state visually
    const isLiked = button.getAttribute('aria-pressed') === 'true';
    const newState = !isLiked;

    button.setAttribute('aria-pressed', newState.toString());

    // Update visual state with YouTube's styling
    if (newState) {
      // Liked state - use YouTube's exact blue color
      button.style.color = '#065fd4 !important';
      button.setAttribute('aria-label', 'Remove like from this comment');
      if (renderer) {
        renderer.setAttribute('toggled', '');
        renderer.classList.add('style-default-active');
      }
      // Update the icon color specifically
      const icon = button.querySelector('svg');
      if (icon) icon.style.fill = '#065fd4';
    } else {
      // Not liked state
      button.style.color = '';
      button.setAttribute('aria-label', 'Like this comment');
      if (renderer) {
        renderer.removeAttribute('toggled');
        renderer.classList.remove('style-default-active');
      }
      // Reset icon color
      const icon = button.querySelector('svg');
      if (icon) icon.style.fill = '';
    }

    // Visual feedback animation
    button.style.transform = 'scale(0.9)';
    button.style.transition = 'transform 0.1s ease';
    setTimeout(() => {
      button.style.transform = '';
    }, 100);

  }



  /**
   * Add a comment to the results
   * @param {Object} comment - Comment object
   * @param {string} query - Search query for highlighting
   * @param {boolean} isReply - Whether this is a reply comment
   * @param {string} parentAuthor - Parent comment author name (for reply indicator)
   */
  addCommentResult(comment, query, searcher, isReply = false, parentAuthor = null) {
    const contentsContainer = this.commentsSection.querySelector('#contents');
    if (!contentsContainer) return;

    // Create native-looking comment element
    const commentElement = this.createNativeCommentElement(comment, query, searcher, isReply, parentAuthor);

    // Add some additional styling to make it blend better
    commentElement.style.marginBottom = '16px';

    // Add a data attribute to track this comment
    commentElement.setAttribute('data-comment-id', comment.id);
    commentElement.setAttribute('data-comment-author', comment.author);

    // Set up event handlers for native-like behavior
    this.setupCommentInteractions(commentElement, comment);

    // Insert before loading indicator if it exists, otherwise append
    if (this.loadingIndicator) {
      contentsContainer.insertBefore(commentElement, this.loadingIndicator);
    } else {
      contentsContainer.appendChild(commentElement);
    }

    // If this comment has replies, add them nested
    if (comment.replies && comment.replies.length > 0) {
      const repliesContainer = document.createElement('div');
      repliesContainer.className = 'quack-replies-container';
      repliesContainer.style.cssText = `
        margin-left: 48px;
        border-left: 2px solid var(--yt-spec-10-percent-layer);
        padding-left: 12px;
        margin-top: 8px;
      `;

      // Create a wrapper to insert replies
      const replyWrapper = document.createElement('div');

      for (const reply of comment.replies) {
        const replyElement = this.createNativeCommentElement(reply, query, searcher, true, comment.author);
        replyElement.style.marginBottom = '12px';
        replyElement.setAttribute('data-comment-id', reply.id);
        replyElement.setAttribute('data-comment-author', reply.author);
        this.setupCommentInteractions(replyElement, reply);
        replyWrapper.appendChild(replyElement);
      }

      repliesContainer.appendChild(replyWrapper);

      // Insert replies container after the parent comment
      if (this.loadingIndicator) {
        contentsContainer.insertBefore(repliesContainer, this.loadingIndicator);
      } else {
        contentsContainer.appendChild(repliesContainer);
      }
    }
  }

  /**
   * Show final results message
   * @param {number} matchCount - Number of matches found
   */
  showFinalResults(matchCount) {
    this.hideLoadingIndicator();
    this.enableSearch();

    if (matchCount === 0) {
      this.showNoResults();
    } else {
      this.showResultsCount(matchCount);
    }

    // Keep search active class since we're showing search results
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
    // Try to reuse the existing live count element
    const liveCount = document.getElementById('quack-live-count');
    if (liveCount) {
      liveCount.textContent = `Found ${count.toLocaleString()} matching comment${count === 1 ? '' : 's'}`;
      return;
    }

    // Fallback: create new element if live count doesn't exist
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
    this.enableSearch();

    // Remove search active class
    if (this.commentsSection) {
      this.commentsSection.classList.remove('quack-search-active');
    }
  }

  /**
   * Disable search input and button
   */
  disableSearch() {
    if (this.searchBox) {
      this.searchBox.disabled = true;
      this.searchBox.style.opacity = '0.6';
    }
    if (this.searchButton) {
      this.searchButton.disabled = true;
      this.searchButton.style.opacity = '0.6';
      this.searchButton.style.cursor = 'not-allowed';
    }
  }

  /**
   * Enable search input and button
   */
  enableSearch() {
    if (this.searchBox) {
      this.searchBox.disabled = false;
      this.searchBox.style.opacity = '1';
    }
    if (this.searchButton) {
      this.searchButton.disabled = false;
      this.searchButton.style.opacity = '1';
      this.searchButton.style.cursor = 'pointer';
    }
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
    this.enableSearch();

    // Remove search active class
    if (this.commentsSection) {
      this.commentsSection.classList.remove('quack-search-active');
    }


    // Remove search active class
    if (this.commentsSection) {
      this.commentsSection.classList.remove('quack-search-active');
    }

    this.isSearchActive = false;
  }

  /**
   * Clear all search results from UI
   */
  clearResults() {
    const contentsContainer = this.commentsSection?.querySelector('#contents');
    if (!contentsContainer) return;

    // Remove all quack result elements
    const quackResults = contentsContainer.querySelectorAll('ytd-comment-thread-renderer[data-comment-id]');
    quackResults.forEach(el => el.remove());

    // Remove no results/error messages
    const messages = contentsContainer.querySelectorAll('.quack-no-results, .quack-error, .quack-results-count');
    messages.forEach(el => el.remove());
  }
}

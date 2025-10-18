/**
 * Search Module
 * Handles filtering comments based on search query and settings
 */

class CommentSearcher {
  constructor() {
    this.currentQuery = '';
    this.settings = {};
    this.matchCount = 0;
  }

  /**
   * Set search settings
   * @param {Object} settings - Search settings
   */
  setSettings(settings) {
    this.settings = settings;
  }

  /**
   * Check if text matches the query
   * @param {string} text - Text to search in
   * @param {string} query - Search query
   * @returns {boolean} True if matches
   */
  matchesQuery(text, query) {
    if (!text || !query) return false;

    const searchText = this.settings.caseSensitive ? text : text.toLowerCase();
    const searchQuery = this.settings.caseSensitive ? query : query.toLowerCase();

    return searchText.includes(searchQuery);
  }

  /**
   * Check if a comment matches the search criteria
   * @param {Object} comment - Comment object
   * @param {string} query - Search query
   * @returns {boolean} True if comment matches
   */
  commentMatches(comment, query) {
    if (!comment || !query) return false;

    // Search in comment text (always enabled)
    if (this.matchesQuery(comment.text, query)) {
      return true;
    }

    // Search in author name if enabled
    if (this.settings.searchInAuthorNames && this.matchesQuery(comment.author, query)) {
      return true;
    }

    // Search in replies if enabled
    if (this.settings.searchInReplies && comment.replies && comment.replies.length > 0) {
      for (const reply of comment.replies) {
        if (this.commentMatches(reply, query)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Filter an array of comments
   * @param {Array} comments - Array of comments
   * @param {string} query - Search query
   * @returns {Array} Filtered comments
   */
  filterComments(comments, query) {
    if (!query || query.trim() === '') {
      return comments;
    }

    this.currentQuery = query.trim();
    this.matchCount = 0;

    const matches = [];

    for (const comment of comments) {
      if (this.commentMatches(comment, this.currentQuery)) {
        matches.push(comment);
        this.matchCount++;
      }
    }

    return matches;
  }

  /**
   * Get match count
   * @returns {number} Number of matches
   */
  getMatchCount() {
    return this.matchCount;
  }

  /**
   * Highlight matches in text
   * @param {string} text - Text to highlight
   * @param {string} query - Query to highlight
   * @returns {string} HTML with highlighted matches
   */
  highlightMatches(text, query) {
    if (!this.settings.highlightMatches || !query || !text) {
      return this.escapeHtml(text);
    }

    const searchQuery = this.settings.caseSensitive ? query : query.toLowerCase();
    const searchText = this.settings.caseSensitive ? text : text.toLowerCase();

    let result = '';
    let lastIndex = 0;

    while (true) {
      const index = searchText.indexOf(searchQuery, lastIndex);
      if (index === -1) {
        result += this.escapeHtml(text.substring(lastIndex));
        break;
      }

      // Add text before match
      result += this.escapeHtml(text.substring(lastIndex, index));
      
      // Add highlighted match
      const match = text.substring(index, index + query.length);
      result += `<mark class="quack-highlight">${this.escapeHtml(match)}</mark>`;
      
      lastIndex = index + query.length;
    }

    return result;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Reset search state
   */
  reset() {
    this.currentQuery = '';
    this.matchCount = 0;
  }
}

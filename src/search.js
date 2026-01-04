// Search Module - Comment filtering and matching

class CommentSearcher {
  constructor() {
    this.currentQuery = '';
    this.settings = {};
    this.matchCount = 0;
    this.lastRegexError = null;
  }


  setSettings(settings) {
    this.settings = settings;
  }


  /**
   * Escape special regex characters for literal matching
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }


  /**
   * Build regex pattern based on settings
   * @returns {RegExp|null} Returns regex or null if invalid
   */
  buildPattern(query) {
    this.lastRegexError = null;

    try {
      let pattern = this.settings.useRegex ? query : this.escapeRegex(query);

      if (this.settings.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }

      const flags = this.settings.caseSensitive ? 'g' : 'gi';
      return new RegExp(pattern, flags);
    } catch (e) {
      this.lastRegexError = e.message;
      return null;
    }
  }


  /**
   * Check if text matches query based on current settings
   */
  matchesQuery(text, query) {
    if (!text || !query) return false;

    const regex = this.buildPattern(query);

    if (regex) {
      return regex.test(text);
    } else {
      // Fallback to simple includes if regex is invalid
      const searchText = this.settings.caseSensitive ? text : text.toLowerCase();
      const searchQuery = this.settings.caseSensitive ? query : query.toLowerCase();
      return searchText.includes(searchQuery);
    }
  }


  /**
   * Check if there's a regex error
   */
  hasRegexError() {
    return this.lastRegexError !== null;
  }


  /**
   * Get the last regex error message
   */
  getRegexError() {
    return this.lastRegexError;
  }


  commentMatches(comment, query) {
    if (!comment || !query) return false;

    // Strict check: If this is a reply and searching replies is disabled, ignore it completely
    if (comment.isReply && !this.settings.searchInReplies) {
      return false;
    }

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


  highlightMatches(text, query) {
    if (!this.settings.highlightMatches || !query || !text) {
      return this.escapeHtml(text);
    }

    const regex = this.buildPattern(query);

    if (!regex) {
      // Fallback for invalid regex
      return this.escapeHtml(text);
    }

    // Reset regex lastIndex for global matching
    regex.lastIndex = 0;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      result += this.escapeHtml(text.substring(lastIndex, match.index));

      // Add highlighted match
      result += `<mark class="quack-highlight">${this.escapeHtml(match[0])}</mark>`;

      lastIndex = match.index + match[0].length;

      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    // Add remaining text
    result += this.escapeHtml(text.substring(lastIndex));

    return result;
  }


  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


  reset() {
    this.currentQuery = '';
    this.matchCount = 0;
    this.lastRegexError = null;
  }
}

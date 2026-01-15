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


  /**
   * Check if comment passes advanced filters (creator, hearted, links, likes, date)
   */
  passesFilters(comment) {
    const filters = this.settings.filters || {};

    // Creator filter
    if (filters.creatorOnly && !comment.isCreator) {
      return false;
    }

    // Hearted filter
    if (filters.heartedOnly && !comment.isHearted) {
      return false;
    }

    // Has links filter
    if (filters.hasLinks && !comment.hasLinks) {
      return false;
    }

    // Min likes filter
    if (filters.minLikes > 0) {
      const likes = comment.likesNumeric || 0;
      if (likes < filters.minLikes) {
        return false;
      }
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      if (!this.matchesDateRange(comment.timestamp, filters.dateRange)) {
        return false;
      }
    }

    return true;
  }


  /**
   * Check if timestamp matches date range filter
   * Timestamps are relative like "2 hours ago", "3 days ago", "1 week ago"
   */
  matchesDateRange(timestamp, dateRange) {
    if (!timestamp || !dateRange || dateRange === 'all') return true;

    const lower = timestamp.toLowerCase();

    // Parse relative time from timestamp
    const hoursMatch = lower.match(/(\d+)\s*(hour|hr)/);
    const daysMatch = lower.match(/(\d+)\s*day/);
    const weeksMatch = lower.match(/(\d+)\s*week/);
    const monthsMatch = lower.match(/(\d+)\s*month/);
    const yearsMatch = lower.match(/(\d+)\s*year/);

    let hoursAgo = 0;

    if (yearsMatch) {
      hoursAgo = parseInt(yearsMatch[1]) * 365 * 24;
    } else if (monthsMatch) {
      hoursAgo = parseInt(monthsMatch[1]) * 30 * 24;
    } else if (weeksMatch) {
      hoursAgo = parseInt(weeksMatch[1]) * 7 * 24;
    } else if (daysMatch) {
      hoursAgo = parseInt(daysMatch[1]) * 24;
    } else if (hoursMatch) {
      hoursAgo = parseInt(hoursMatch[1]);
    } else if (lower.includes('minute') || lower.includes('second') || lower.includes('just now')) {
      hoursAgo = 0;
    } else {
      // Unknown format, include it
      return true;
    }

    switch (dateRange) {
      case '24h':
        return hoursAgo <= 24;
      case 'week':
        return hoursAgo <= 7 * 24;
      case 'month':
        return hoursAgo <= 30 * 24;
      default:
        return true;
    }
  }


  filterComments(comments, query) {
    this.currentQuery = query?.trim() || '';
    this.matchCount = 0;

    const matches = [];

    for (const comment of comments) {
      // Apply advanced filters first
      if (!this.passesFilters(comment)) {
        continue;
      }

      // If there's a query, apply text matching
      if (this.currentQuery) {
        if (this.commentMatches(comment, this.currentQuery)) {
          matches.push(comment);
          this.matchCount++;
        }
      } else {
        // No query - just apply filters
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

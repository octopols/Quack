/**
 * CommentSorter - Handles sorting of search results
 */
class CommentSorter {
    /**
     * Sort comments by specified order
     * @param {Array} comments - Array of comment objects
     * @param {string} order - Sort order type
     * @returns {Array} Sorted comments
     */
    sortComments(comments, order) {
        const sorted = [...comments]; // Clone to avoid mutation

        switch (order) {
            case 'top':
                return this.sortByLikes(sorted);
            case 'newest':
                return this.sortByTime(sorted, 'desc');
            case 'oldest':
                return this.sortByTime(sorted, 'asc');
            case 'relevance':
                return this.sortByRelevance(sorted);
            case 'replies':
                return this.sortByReplies(sorted);
            case 'length':
                return this.sortByLength(sorted);
            case 'author':
                return this.sortByAuthor(sorted);
            default:
                return sorted;
        }
    }

    /**
     * Sort by likes (most liked first)
     */
    sortByLikes(comments) {
        return comments.sort((a, b) => {
            const likesA = this.parseLikes(a.likes);
            const likesB = this.parseLikes(b.likes);
            return likesB - likesA;
        });
    }

    /**
     * Sort by timestamp
     * @param {string} direction - 'asc' for oldest first, 'desc' for newest first
     */
    sortByTime(comments, direction = 'desc') {
        return comments.sort((a, b) => {
            const timeA = this.parseTimestamp(a.timestamp);
            const timeB = this.parseTimestamp(b.timestamp);
            return direction === 'desc' ? timeB - timeA : timeA - timeB;
        });
    }

    /**
     * Sort by search relevance score
     */
    sortByRelevance(comments) {
        return comments.sort((a, b) => {
            const scoreA = a.relevanceScore || 0;
            const scoreB = b.relevanceScore || 0;
            return scoreB - scoreA;
        });
    }

    /**
     * Sort by number of replies
     */
    sortByReplies(comments) {
        return comments.sort((a, b) => {
            const repliesA = a.replyCount || (a.replies ? a.replies.length : 0);
            const repliesB = b.replyCount || (b.replies ? b.replies.length : 0);
            return repliesB - repliesA;
        });
    }

    /**
     * Sort by comment length (longest first)
     */
    sortByLength(comments) {
        return comments.sort((a, b) => {
            const lengthA = a.text ? a.text.length : 0;
            const lengthB = b.text ? b.text.length : 0;
            return lengthB - lengthA;
        });
    }

    /**
     * Sort by author name (alphabetically)
     */
    sortByAuthor(comments) {
        return comments.sort((a, b) => {
            const authorA = (a.author || '').toLowerCase();
            const authorB = (b.author || '').toLowerCase();
            return authorA.localeCompare(authorB);
        });
    }

    /**
     * Parse likes string to number
     * Handles formats: "42", "1.2K", "3.5M", ""
     */
    parseLikes(likesStr) {
        if (!likesStr || likesStr === '' || likesStr === '0') return 0;

        const str = likesStr.trim().toUpperCase();
        const num = parseFloat(str);

        if (str.includes('M')) return Math.floor(num * 1000000);
        if (str.includes('K')) return Math.floor(num * 1000);

        return Math.floor(num) || 0;
    }

    /**
     * Parse timestamp to milliseconds ago
     * Handles formats: "2 days ago", "3 weeks ago", "1 year ago", "just now"
     */
    parseTimestamp(timeStr) {
        if (!timeStr) return 0;

        const str = timeStr.toLowerCase();

        // Handle "just now" or "now"
        if (str.includes('just now') || str === 'now') {
            return Date.now();
        }

        // Parse "X unit(s) ago"
        const match = str.match(/(\d+)\s+(second|minute|hour|day|week|month|year)/);
        if (!match) return 0;

        const amount = parseInt(match[1]);
        const unit = match[2];

        const units = {
            'second': 1000,
            'minute': 60 * 1000,
            'hour': 60 * 60 * 1000,
            'day': 24 * 60 * 60 * 1000,
            'week': 7 * 24 * 60 * 60 * 1000,
            'month': 30 * 24 * 60 * 60 * 1000,
            'year': 365 * 24 * 60 * 60 * 1000
        };

        const msAgo = amount * (units[unit] || 0);
        return Date.now() - msAgo;
    }

    /**
     * Calculate relevance score for a comment
     * Based on query matches, position, and context
     */
    calculateRelevance(comment, query) {
        if (!query || !comment.text) return 0;

        const text = comment.text.toLowerCase();
        const queryLower = query.toLowerCase();
        let score = 0;

        // Exact match in text
        const exactMatches = (text.match(new RegExp(queryLower, 'g')) || []).length;
        score += exactMatches * 10;

        // Match near beginning gets bonus
        const firstMatch = text.indexOf(queryLower);
        if (firstMatch >= 0 && firstMatch < 50) {
            score += 5;
        }

        // Author name match gets bonus
        if (comment.author && comment.author.toLowerCase().includes(queryLower)) {
            score += 15;
        }

        // Longer comments with matches get slight penalty (to favor concise answers)
        if (text.length > 500) {
            score -= 2;
        }

        return score;
    }
}

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommentSorter;
}

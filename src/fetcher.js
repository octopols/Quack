// Fetcher Module - YouTube API comment fetching

class CommentFetcher {
  constructor() {
    this.abortController = null;
    this.ytcfg = null;
    this.totalComments = 0;
    this.fetchedComments = 0;
    this.maxPages = 100;
  }


  extractYtConfig() {
    try {
      // Try window.ytcfg first
      if (window.ytcfg && window.ytcfg.data_) {
        return window.ytcfg.data_;
      }

      // Try to extract from page HTML
      const scripts = document.getElementsByTagName('script');
      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('ytcfg.set')) {
          const match = content.match(/ytcfg\.set\s*\(\s*({.+?})\s*\)\s*;/);
          if (match) {
            return JSON.parse(match[1]);
          }
        }
      }

      return null;
    } catch (error) {
      // Silently ignore errors in production
      return null;
    }
  }


  extractInitialData() {
    try {
      // Try window.ytInitialData first
      if (window.ytInitialData) {
        return window.ytInitialData;
      }

      // Try to extract from page HTML with multiple patterns
      const scripts = document.getElementsByTagName('script');

      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes('ytInitialData')) {
          // Try multiple regex patterns
          const patterns = [
            /var\s+ytInitialData\s*=\s*({.+?});/,
            /window\["ytInitialData"\]\s*=\s*({.+?});/,
            /ytInitialData\s*=\s*({.+?});/
          ];

          for (let i = 0; i < patterns.length; i++) {
            const match = content.match(patterns[i]);
            if (match) {
              return JSON.parse(match[1]);
            }
          }
        }
      }

      return null;
    } catch (error) {
      // Silently ignore errors in production
      return null;
    }
  }


  extractCommentCountFromDOM() {
    try {
      // Try various selectors for the comment count display
      const selectors = [
        'ytd-comments-header-renderer h2 yt-formatted-string',
        'ytd-comments-header-renderer #count',
        '#count.ytd-comments-header-renderer',
        'ytd-comments-header-renderer [id="count"]',
        'h2.ytd-comments-header-renderer yt-formatted-string'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const text = element.textContent.trim();

          // Extract number from text like "1,234" or "1,234 Comments"
          const match = text.match(/[\d,]+/);
          if (match) {
            const count = parseInt(match[0].replace(/,/g, ''), 10);
            return count;
          }
        }
      }

      return null;
    } catch (error) {
      // Silently ignore errors in production
      return null;
    }
  }


  getInitialContinuation(data) {
    try {
      // Find itemSectionRenderer
      const itemSections = searchDict(data, 'itemSectionRenderer');
      for (const section of itemSections) {
        const continuations = searchDict(section, 'continuationEndpoint');
        if (continuations.length > 0) {
          return continuations[0].continuationCommand?.token || null;
        }
      }

      // Try finding in comments section directly
      const continuations = searchDict(data, 'continuationEndpoint');
      if (continuations.length > 0) {
        return continuations[0].continuationCommand?.token || null;
      }

      return null;
    } catch (error) {
      // Silently ignore errors in production
      return null;
    }
  }


  async fetchCommentsPage(continuationToken) {
    try {
      if (!this.ytcfg) {
        throw new Error('YouTube config not initialized');
      }

      const apiKey = this.ytcfg.INNERTUBE_API_KEY;
      const context = this.ytcfg.INNERTUBE_CONTEXT;

      if (!apiKey || !context) {
        throw new Error('Missing API key or context');
      }

      const url = `https://www.youtube.com/youtubei/v1/next?key=${apiKey}`;
      const body = {
        context: context,
        continuation: continuationToken
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this.abortController?.signal
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      }
      return null;
    }
  }


  async fetchRepliesForComment(parentCommentId, continuationToken) {
    try {
      const allReplies = [];
      let currentToken = continuationToken;
      let replyPageCount = 0;
      const maxReplyPages = 20; // Limit reply pages per comment

      while (currentToken && replyPageCount < maxReplyPages) {
        replyPageCount++;


        // Fetch reply page
        const pageData = await this.fetchCommentsPage(currentToken);
        if (!pageData) {

          break;
        }

        // Parse replies from the page
        const replies = parseComments(pageData);


        // Mark as replies
        replies.forEach(reply => {
          reply.isReply = true;
          reply.parentCommentId = parentCommentId;
        });

        allReplies.push(...replies);

        // Get next continuation token for more replies
        const nextToken = getContinuationToken(pageData);
        if (!nextToken) {
          break;
        }

        currentToken = nextToken;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return allReplies;
    } catch (error) {
      return [];
    }
  }


  async fetchAllComments(onProgress, onBatch, shouldFetchReplies = false) {
    try {
      // Create new abort controller
      this.abortController = new AbortController();

      // Log reply setting


      // Extract YouTube config
      this.ytcfg = this.extractYtConfig();
      if (!this.ytcfg) {
        throw new Error('Failed to extract YouTube configuration');
      }

      // Extract initial data
      const initialData = this.extractInitialData();
      if (!initialData) {
        throw new Error('Failed to extract initial data');
      }

      // Get total comment count - try from data first, then from DOM
      let extractedTotal = getTotalCommentCount(initialData);

      // If not found in data, try to extract from the visible comment count on page
      if (!extractedTotal) {
        extractedTotal = this.extractCommentCountFromDOM();
      }

      this.totalComments = extractedTotal || 0;
      this.fetchedComments = 0;

      // Log initial totals


      // Get initial continuation token
      let continuationToken = this.getInitialContinuation(initialData);
      if (!continuationToken) {
        throw new Error('Failed to get initial continuation token');
      }

      const allComments = [];
      let pageCount = 0;

      // Fetch pages
      while (continuationToken && pageCount < this.maxPages) {
        pageCount++;

        // Fetch page
        const pageData = await this.fetchCommentsPage(continuationToken);
        if (!pageData) {
          break;
        }

        // Parse comments from page
        const comments = parseComments(pageData);

        // Log page results


        // Log reply token information
        // Log reply token information (removed)


        // Add to all comments
        allComments.push(...comments);
        this.fetchedComments += comments.length;

        const topLevelComments = allComments.filter(c => !c.isReply).length;
        const totalWithReplies = this.fetchedComments;
        const progressPercent = this.totalComments > 0 ? ((topLevelComments / this.totalComments) * 100).toFixed(1) : 'N/A';


        // Notify progress
        if (onProgress) {
          onProgress(this.fetchedComments, this.totalComments, continuationToken);
        }

        // Notify batch ready
        if (onBatch && comments.length > 0) {
          onBatch(comments);
        }

        // Fetch replies if setting is enabled (only for top-level comments)
        if (shouldFetchReplies) {
          const commentsWithReplies = comments.filter(c => !c.isReply && c.replyContinuationToken);

          for (let i = 0; i < commentsWithReplies.length; i++) {
            const comment = commentsWithReplies[i];

            if (comment.replyContinuationToken) {
              const replies = await this.fetchRepliesForComment(comment.id, comment.replyContinuationToken);

              if (replies.length > 0) {
                comment.replies = replies;
                this.fetchedComments += replies.length;

                // Update progress with replies
                if (onProgress) {
                  onProgress(this.fetchedComments, this.totalComments, continuationToken);
                }

                // Optionally notify about reply batch
                if (onBatch) {
                  onBatch(replies);
                }
              }
            }
          }
        }

        // Get next continuation token
        const nextToken = getContinuationToken(pageData);
        if (!nextToken) {
          break;
        }

        continuationToken = nextToken;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return allComments;

    } catch (error) {
      throw error;
    }
  }


  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }


  extractCommentsFromDOM() {
    try {
      const comments = [];

      // Try multiple selectors for comments
      const selectors = [
        'ytd-comment-thread-renderer',
        'ytd-comment-renderer',
        '#comment',
        '[id*="comment"]'
      ];

      let commentElements = [];
      for (const selector of selectors) {
        commentElements = document.querySelectorAll(selector);
        if (commentElements.length > 0) {
          break;
        }
      }

      for (const element of commentElements) {
        try {
          // Try multiple selectors for each component
          const authorElement = element.querySelector('#author-text') ||
            element.querySelector('.ytd-comment-renderer #author-text') ||
            element.querySelector('a#author-text') ||
            element.querySelector('[id*="author"]');

          const contentElement = element.querySelector('#content-text') ||
            element.querySelector('#content #content-text') ||
            element.querySelector('yt-formatted-string#content-text') ||
            element.querySelector('[id*="content-text"]');

          const timeElement = element.querySelector('.published-time-text a') ||
            element.querySelector('yt-formatted-string.published-time-text a') ||
            element.querySelector('[id*="published-time"]') ||
            element.querySelector('a[href*="lc="]');

          const likesElement = element.querySelector('#vote-count-middle') ||
            element.querySelector('#vote-count-left') ||
            element.querySelector('[id*="vote-count"]') ||
            element.querySelector('[aria-label*="like"]');

          if (contentElement && contentElement.textContent) {
            // Try to get profile photo from thumbnail element
            const thumbnailElement = element.querySelector('#author-thumbnail img') ||
              element.querySelector('yt-img-shadow img') ||
              element.querySelector('[id*="thumbnail"] img');

            const thumbnailUrl = thumbnailElement?.src || null;
            const authorThumbnails = thumbnailUrl ? [{ url: thumbnailUrl }] : [];


            const authorName = authorElement?.textContent?.trim() || 'Unknown';

            // Construct channel URL from username
            const channelUrl = authorName !== 'Unknown' ? `https://www.youtube.com/${authorName}` : '';

            const comment = {
              id: element.getAttribute('id') || `dom-${Date.now()}-${Math.random()}`,
              author: authorElement?.textContent?.trim() || 'Unknown',
              text: contentElement.textContent?.trim() || '',
              timestamp: timeElement?.textContent?.trim() || '',
              likes: likesElement?.textContent?.trim() || '0',
              authorThumbnail: authorThumbnails,
              channelUrl: channelUrl,
              isReply: false,
              replies: []
            };

            if (comment.text) {
              comments.push(comment);
            }
          }
        } catch (error) {
          // Skip invalid comments
        }
      }

      return comments;
    } catch (error) {
      return [];
    }
  }
}

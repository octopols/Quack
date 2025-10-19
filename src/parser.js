/**
 * Parser Module
 * Handles parsing YouTube comment data from both old and new formats
 */

/**
 * Recursively search for a key in nested objects/arrays
 * @param {Object|Array} obj - Object or array to search
 * @param {string} searchKey - Key to search for
 * @returns {Array} Array of values found
 */
function searchDict(obj, searchKey) {
  const results = [];
  const stack = [obj];

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      stack.push(...current);
    } else if (typeof current === 'object' && current !== null) {
      for (const [key, value] of Object.entries(current)) {
        if (key === searchKey) {
          results.push(value);
        } else {
          stack.push(value);
        }
      }
    }
  }

  return results;
}

/**
 * Extract text from YouTube text objects (runs format)
 * @param {Object} textObj - YouTube text object
 * @returns {string} Extracted text
 */
function extractText(textObj) {
  if (!textObj) return '';
  
  if (textObj.simpleText) {
    return textObj.simpleText;
  }
  
  if (textObj.runs && Array.isArray(textObj.runs)) {
    return textObj.runs.map(run => run.text || '').join('');
  }
  
  if (typeof textObj === 'string') {
    return textObj;
  }
  
  return '';
}

/**
 * Parse comment from old format (commentRenderer)
 * @param {Object} renderer - commentRenderer object
 * @returns {Object} Parsed comment
 */
function parseCommentRenderer(renderer) {
  try {
    // Extract author thumbnail with multiple fallback paths
    let authorThumbnail = [];
    if (renderer.authorThumbnail?.thumbnails) {
      authorThumbnail = renderer.authorThumbnail.thumbnails;
    } else if (renderer.authorThumbnail) {
      // Sometimes it's directly an array
      authorThumbnail = Array.isArray(renderer.authorThumbnail) ? renderer.authorThumbnail : [renderer.authorThumbnail];
    }
    
    const comment = {
      id: renderer.commentId || '',
      author: extractText(renderer.authorText),
      text: extractText(renderer.contentText),
      timestamp: extractText(renderer.publishedTimeText),
      likes: extractText(renderer.voteCount) || '0',
      authorThumbnail: authorThumbnail,
      isReply: false,
      replies: []
    };

    // Check if this is a reply based on comment structure
    if (renderer.commentId && renderer.commentId.includes('.')) {
      comment.isReply = true;
    }

    return comment;
  } catch (error) {
    console.warn('[Parser] Error parsing commentRenderer:', error);
    return null;
  }
}

/**
 * Parse comment from new format (commentViewModel)
 * @param {Object} viewModel - commentViewModel object
 * @returns {Object} Parsed comment
 */
function parseCommentViewModel(viewModel) {
  try {
    // Extract author thumbnail with comprehensive fallback paths
    let authorThumbnail = [];
    const author = viewModel.author || {};
    
    if (author.avatar?.image?.sources) {
      authorThumbnail = author.avatar.image.sources;
    } else if (author.avatarThumbnails) {
      authorThumbnail = author.avatarThumbnails;
    } else if (author.thumbnail?.thumbnails) {
      authorThumbnail = author.thumbnail.thumbnails;
    } else if (viewModel.authorThumbnail) {
      authorThumbnail = Array.isArray(viewModel.authorThumbnail) ? viewModel.authorThumbnail : [viewModel.authorThumbnail];
    }
    
    const comment = {
      id: viewModel.commentId || viewModel.commentKey || '',
      author: author.displayName || '',
      text: viewModel.content?.text || viewModel.content?.content || '',
      timestamp: viewModel.publishedTime || '',
      likes: viewModel.likeCount?.toString() || '0',
      authorThumbnail: authorThumbnail,
      isReply: false,
      replies: []
    };

    // Check if this is a reply
    if (comment.id && comment.id.includes('.')) {
      comment.isReply = true;
    }

    return comment;
  } catch (error) {
    console.warn('[Parser] Error parsing commentViewModel:', error);
    return null;
  }
}

/**
 * Parse comment from commentEntityPayload format
 * @param {Object} entity - commentEntityPayload object
 * @returns {Object} Parsed comment
 */
function parseCommentEntity(entity) {
  try {
    const properties = entity.properties || {};
    const author = entity.author || {};
    const toolbar = entity.toolbar || {};
    
    // Extract author thumbnail with comprehensive fallback paths
    let authorThumbnail = [];
    if (author.avatarThumbnails) {
      authorThumbnail = author.avatarThumbnails;
    } else if (author.avatar?.image?.sources) {
      authorThumbnail = author.avatar.image.sources;
    } else if (author.thumbnail?.thumbnails) {
      authorThumbnail = author.thumbnail.thumbnails;
    } else if (properties.authorThumbnail) {
      authorThumbnail = Array.isArray(properties.authorThumbnail) ? properties.authorThumbnail : [properties.authorThumbnail];
    }
    
    const comment = {
      id: properties.commentId || '',
      author: author.displayName || '',
      text: properties.content?.content || '',
      timestamp: properties.publishedTime || '',
      likes: toolbar.likeCountNotliked?.trim() || '0',
      authorThumbnail: authorThumbnail,
      isReply: false,
      replies: []
    };

    // Check if this is a reply
    if (comment.id && comment.id.includes('.')) {
      comment.isReply = true;
    }

    return comment;
  } catch (error) {
    console.warn('[Parser] Error parsing commentEntity:', error);
    return null;
  }
}

/**
 * Parse comments from API response data
 * @param {Object} data - YouTube API response data
 * @returns {Array} Array of parsed comments
 */
function parseComments(data) {
  const comments = [];

  try {
    // Try parsing new format (commentEntityPayload)
    const entities = searchDict(data, 'commentEntityPayload');
    if (entities.length > 0) {
      for (const entity of entities) {
        const comment = parseCommentEntity(entity);
        if (comment && comment.text) {
          comments.push(comment);
        }
      }
      return comments;
    }

    // Try parsing commentViewModel format
    const viewModels = searchDict(data, 'commentViewModel');
    for (const vm of viewModels) {
      // Sometimes nested as commentViewModel.commentViewModel
      const actualViewModel = vm.commentViewModel || vm;
      const comment = parseCommentViewModel(actualViewModel);
      if (comment && comment.text) {
        comments.push(comment);
      }
    }

    if (comments.length > 0) {
      return comments;
    }

    // Try parsing old format (commentRenderer)
    const renderers = searchDict(data, 'commentRenderer');
    for (const renderer of renderers) {
      const comment = parseCommentRenderer(renderer);
      if (comment && comment.text) {
        comments.push(comment);
      }
    }

  } catch (error) {
    console.error('[Parser] Error parsing comments:', error);
  }

  return comments;
}

/**
 * Get continuation token from response
 * @param {Object} data - YouTube API response data
 * @returns {string|null} Continuation token or null
 */
function getContinuationToken(data) {
  try {
    const continuations = searchDict(data, 'continuationEndpoint');
    if (continuations.length > 0) {
      const continuation = continuations[0];
      return continuation.continuationCommand?.token || null;
    }
  } catch (error) {
    console.warn('[Parser] Error getting continuation token:', error);
  }
  return null;
}

/**
 * Extract total comment count from data
 * @param {Object} data - YouTube page data
 * @returns {number|null} Total comment count or null
 */
function getTotalCommentCount(data) {
  try {
    console.log('[Parser] Attempting to extract total comment count...');
    
    // Try to find comment count in various locations
    const countTexts = [
      ...searchDict(data, 'commentsHeaderRenderer'),
      ...searchDict(data, 'commentsEntryPointHeaderRenderer')
    ];

    console.log(`[Parser] Found ${countTexts.length} comment header renderers`);

    for (const countData of countTexts) {
      const countText = extractText(countData.countText || countData.commentCount);
      console.log('[Parser] Extracted count text:', countText);
      
      if (countText) {
        // Extract number from text like "1,234 Comments"
        const match = countText.match(/[\d,]+/);
        if (match) {
          const count = parseInt(match[0].replace(/,/g, ''), 10);
          console.log('[Parser] Extracted comment count:', count);
          return count;
        }
      }
    }
    
    console.warn('[Parser] Could not find total comment count in data');
  } catch (error) {
    console.warn('[Parser] Error getting comment count:', error);
  }
  return null;
}

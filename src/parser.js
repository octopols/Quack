// Parser Module - YouTube comment data parsing


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


function parseCommentRenderer(renderer) {
  try {
    // Extract author thumbnail with multiple fallback paths
    let authorThumbnail = [];
    if (renderer.authorThumbnail?.thumbnails) {
      authorThumbnail = renderer.authorThumbnail.thumbnails;
    } else if (renderer.authorThumbnail) {
      authorThumbnail = Array.isArray(renderer.authorThumbnail) ? renderer.authorThumbnail : [renderer.authorThumbnail];
    }

    const commentText = extractText(renderer.contentText);
    const likesString = extractText(renderer.voteCount) || '0';
    const likesNumeric = parseInt(likesString.replace(/[^0-9]/g, ''), 10) || 0;
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const hasLinks = urlPattern.test(commentText);

    const comment = {
      id: renderer.commentId || '',
      author: extractText(renderer.authorText),
      text: commentText,
      timestamp: extractText(renderer.publishedTimeText),
      likes: likesString,
      likesNumeric: likesNumeric,
      authorThumbnail: authorThumbnail,
      isReply: false,
      isCreator: renderer.authorIsChannelOwner === true,
      isHearted: !!(renderer.creatorHeart),
      hasLinks: hasLinks,
      replies: []
    };

    if (renderer.commentId && renderer.commentId.includes('.')) {
      comment.isReply = true;
    }

    return comment;
  } catch (error) {
    return null;
  }
}


function parseCommentViewModel(viewModel) {
  try {
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

    const commentText = viewModel.content?.text || viewModel.content?.content || '';
    const likesString = viewModel.likeCount?.toString() || '0';
    const likesNumeric = parseInt(likesString.replace(/[^0-9]/g, ''), 10) || 0;
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const hasLinks = urlPattern.test(commentText);

    const comment = {
      id: viewModel.commentId || viewModel.commentKey || '',
      author: author.displayName || '',
      text: commentText,
      timestamp: viewModel.publishedTime || '',
      likes: likesString,
      likesNumeric: likesNumeric,
      authorThumbnail: authorThumbnail,
      isReply: false,
      isCreator: author.isCreator === true,
      isHearted: !!(viewModel.creatorHeart),
      hasLinks: hasLinks,
      replies: []
    };

    if (comment.id && comment.id.includes('.')) {
      comment.isReply = true;
    }

    return comment;
  } catch (error) {
    return null;
  }
}


function parseCommentEntity(entity) {
  try {
    const properties = entity.properties || {};
    const author = entity.author || {};
    const toolbar = entity.toolbar || {};

    // Extract author thumbnail - YouTube provides it in multiple formats
    let authorThumbnail = [];

    // Check entity.avatar.image.sources first (most common in new format)
    if (entity.avatar?.image?.sources) {
      authorThumbnail = entity.avatar.image.sources;
    }
    // Check author.avatarThumbnailUrl (direct string URL)
    else if (author.avatarThumbnailUrl) {
      authorThumbnail = [{ url: author.avatarThumbnailUrl }];
    }
    // Fallback to other possible locations
    else if (author.avatar?.image?.sources) {
      authorThumbnail = author.avatar.image.sources;
    } else if (author.thumbnail?.thumbnails) {
      authorThumbnail = author.thumbnail.thumbnails;
    } else if (properties.authorThumbnail) {
      authorThumbnail = Array.isArray(properties.authorThumbnail) ? properties.authorThumbnail : [properties.authorThumbnail];
    }

    // Extract channel URL for clickable profile links
    let channelUrl = author.displayName ? `https://www.youtube.com/${author.displayName}` : '';

    // Parse likes to numeric value
    const likesString = toolbar.likeCountNotliked?.trim() || '0';
    let likesNumeric = 0;
    if (likesString && likesString !== ' ') {
      // Handle formats like "1K", "2.5K", "1M" etc
      const normalized = likesString.toUpperCase().replace(/,/g, '');
      if (normalized.includes('K')) {
        likesNumeric = parseFloat(normalized) * 1000;
      } else if (normalized.includes('M')) {
        likesNumeric = parseFloat(normalized) * 1000000;
      } else {
        likesNumeric = parseInt(normalized, 10) || 0;
      }
    }

    // Check for links in comment text
    const commentText = properties.content?.content || '';
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const hasLinks = urlPattern.test(commentText);

    // Check if creator hearted this comment (presence of creatorThumbnailUrl indicates heart)
    const isHearted = !!(toolbar.creatorThumbnailUrl);

    const comment = {
      id: properties.commentId || '',
      author: author.displayName || '',
      text: commentText,
      timestamp: properties.publishedTime || '',
      likes: likesString,
      likesNumeric: likesNumeric,
      authorThumbnail: authorThumbnail,
      channelUrl: channelUrl,
      isReply: false,
      isCreator: author.isCreator === true,
      isHearted: isHearted,
      hasLinks: hasLinks,
      replies: []
    };

    // Check if this is a reply: Use replyLevel (strongest signal) or ID format
    if ((properties.replyLevel && Number(properties.replyLevel) > 0) ||
      (comment.id && comment.id.includes('.'))) {
      comment.isReply = true;
    }

    return comment;
  } catch (error) {
    return null;
  }
}


function parseComments(data) {
  const comments = [];

  try {
    // Extract reply metadata first (before parsing comments)
    const replyMetadata = getReplyCountAndContinuation(data);

    // Try parsing new format (commentEntityPayload)
    const entities = searchDict(data, 'commentEntityPayload');
    if (entities.length > 0) {
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const comment = parseCommentEntity(entity);
        if (comment && comment.text) {
          // Attach reply metadata by index (same order in API response)
          const metadata = replyMetadata[i];
          if (metadata && metadata.replyContinuationToken) {
            comment.replyCount = metadata.replyCount;
            comment.replyContinuationToken = metadata.replyContinuationToken;
          }
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
        // Attach reply metadata if available
        const metadata = replyMap.get(comment.id);
        if (metadata) {
          comment.replyCount = metadata.replyCount;
          comment.replyContinuationToken = metadata.replyContinuationToken;
        }
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
        // Attach reply metadata if available
        const metadata = replyMap.get(comment.id);
        if (metadata) {
          comment.replyCount = metadata.replyCount;
          comment.replyContinuationToken = metadata.replyContinuationToken;
        }
        comments.push(comment);
      }
    }

  } catch (error) {
    // Parse error, return empty array
  }

  return comments;
}


function getReplyCountAndContinuation(data) {
  try {
    const commentThreads = searchDict(data, 'commentThreadRenderer');
    const results = [];

    for (let i = 0; i < commentThreads.length; i++) {
      const thread = commentThreads[i];
      const result = {
        index: i,
        replyCount: 0,
        replyContinuationToken: null
      };

      if (thread.replies?.commentRepliesRenderer) {
        const repliesRenderer = thread.replies.commentRepliesRenderer;

        // Get reply count
        if (repliesRenderer.moreText) {
          const replyText = extractText(repliesRenderer.moreText);
          const match = replyText.match(/(\d+)/);
          if (match) {
            result.replyCount = parseInt(match[1], 10);
          }
        }

        // Get continuation token for loading replies
        if (repliesRenderer.subThreads && repliesRenderer.subThreads[0]) {
          const subThread = repliesRenderer.subThreads[0];
          if (subThread.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
            result.replyContinuationToken = subThread.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
          }
        }
      }

      results.push(result);
    }

    return results;
  } catch (error) {

    return [];
  }
}


function getContinuationToken(data) {
  try {
    // Method 1: Standard continuationEndpoint (most common for top-level comments)
    const continuations = searchDict(data, 'continuationEndpoint');
    if (continuations.length > 0) {
      const continuation = continuations[0];
      const token = continuation.continuationCommand?.token;
      if (token) {

        return token;
      }
    }

    // Method 2: Check continuations array (alternative location)
    const continuationsArrays = searchDict(data, 'continuations');
    for (const arr of continuationsArrays) {
      if (Array.isArray(arr) && arr.length > 0) {
        const token = arr[0]?.nextContinuationData?.continuation;
        if (token) {

          return token;
        }
      }
    }

    // Method 3: Check subThreads (for reply pagination)
    const repliesRenderers = searchDict(data, 'commentRepliesRenderer');
    for (const renderer of repliesRenderers) {
      if (renderer.subThreads && renderer.subThreads[0]) {
        const subThread = renderer.subThreads[0];
        if (subThread.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
          const token = subThread.continuationItemRenderer.continuationEndpoint.continuationCommand.token;

          return token;
        }
      }
    }

    // Method 4: Search for any continuationCommand token broadly
    const commands = searchDict(data, 'continuationCommand');
    if (commands.length > 0 && commands[0].token) {

      return commands[0].token;
    }

    // Method 5: Check onResponseReceivedEndpoints (common in reply pagination)
    if (data.onResponseReceivedEndpoints && Array.isArray(data.onResponseReceivedEndpoints)) {
      for (const endpoint of data.onResponseReceivedEndpoints) {
        // Look for appendContinuationItemsAction which contains more items
        if (endpoint.appendContinuationItemsAction) {
          const items = endpoint.appendContinuationItemsAction.continuationItems;
          if (items && Array.isArray(items)) {
            for (const item of items) {
              // Check for continuationItemRenderer
              if (item.continuationItemRenderer) {
                const token = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
                if (token) {
                  return token;
                }
              }
            }
          }
        }
      }
    }

    // Check for continuationItemRenderer at various levels
    const contItems = searchDict(data, 'continuationItemRenderer');
    if (contItems.length > 0) {
      const token = contItems[0]?.continuationEndpoint?.continuationCommand?.token;
      if (token) {
        return token;
      }
    }
  } catch (error) {

  }
  return null;
}


function getTotalCommentCount(data) {
  try {
    // Try to find comment count in various locations
    const countTexts = [
      ...searchDict(data, 'commentsHeaderRenderer'),
      ...searchDict(data, 'commentsEntryPointHeaderRenderer')
    ];

    for (const countData of countTexts) {
      const countText = extractText(countData.countText || countData.commentCount);

      if (countText) {
        // Extract number from text like "1,234 Comments"
        const match = countText.match(/[\d,]+/);
        if (match) {
          const count = parseInt(match[0].replace(/,/g, ''), 10);
          return count;
        }
      }
    }
  } catch (error) {
  }
  return null;
}

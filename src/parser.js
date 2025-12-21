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
    return null;
  }
}


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
    // Simply construct URL from username
    let channelUrl = author.displayName ? `https://www.youtube.com/${author.displayName}` : '';



    const comment = {
      id: properties.commentId || '',
      author: author.displayName || '',
      text: properties.content?.content || '',
      timestamp: properties.publishedTime || '',
      likes: toolbar.likeCountNotliked?.trim() || '0',
      authorThumbnail: authorThumbnail,
      channelUrl: channelUrl,
      isReply: false,
      replies: []
    };

    // Check if this is a reply
    if (comment.id && comment.id.includes('.')) {
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
    // Parse error, return empty array
  }

  return comments;
}


function getContinuationToken(data) {
  try {
    const continuations = searchDict(data, 'continuationEndpoint');
    if (continuations.length > 0) {
      const continuation = continuations[0];
      return continuation.continuationCommand?.token || null;
    }
  } catch (error) {
    // Could not get continuation token
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

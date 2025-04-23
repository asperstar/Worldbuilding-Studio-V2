// src/components/forums/ForumPostItem.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStorage } from '../../contexts/StorageContext';
import ReplyList from './ReplyList';
import ReplyForm from './ReplyForm';

function ForumPostItem({ post, showFullContent = false }) {
  const { currentUser, likeForumPost, unlikeForumPost, getPostReplies } = useStorage();
  const [isLiked, setIsLiked] = useState(post.likedBy?.includes(currentUser?.uid));
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState(null);

  const toggleLike = async () => {
    if (!currentUser) return;
    
    try {
      if (isLiked) {
        await unlikeForumPost('general', post.id);
        setLikeCount(prev => prev - 1);
      } else {
        await likeForumPost('general', post.id);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Error toggling like:', err);
      setError('Failed to update like status.');
    }
  };

  const toggleReplies = async () => {
    if (!showReplies) {
      await loadReplies();
    }
    setShowReplies(!showReplies);
  };

  const loadReplies = async () => {
    if (isLoadingReplies) return;
    
    setIsLoadingReplies(true);
    setError(null);
    
    try {
      const postReplies = await getPostReplies('general', post.id);
      setReplies(postReplies);
    } catch (err) {
      console.error('Error loading replies:', err);
      setError('Failed to load replies.');
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleReplyCreated = (newReply) => {
    setReplies([...replies, newReply]);
    setIsReplying(false);
  };

  // Format timestamp to readable date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Truncate content for list view
  const truncateContent = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="forum-post-item">
      {error && <div className="post-error">{error}</div>}
      
      <div className="post-header">
        <h2 className="post-title">
          {showFullContent ? (
            post.title
          ) : (
            <Link to={`/forums/${post.id}`}>{post.title}</Link>
          )}
        </h2>
        <div className="post-meta">
          <span className="post-author">
            Posted by {post.username || 'Anonymous'} 
          </span>
          <span className="post-date">
            on {formatDate(post.timestamp)}
            {post.edited && <span className="edited-tag"> (edited)</span>}
          </span>
        </div>
      </div>
      
      <div className="post-content">
        {showFullContent ? (
          <p>{post.content}</p>
        ) : (
          <p>{truncateContent(post.content)}</p>
        )}
      </div>
      
      <div className="post-actions">
        <button 
          className={`like-button ${isLiked ? 'liked' : ''}`}
          onClick={toggleLike}
        >
          {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
        </button>
        
        <button 
          className="replies-toggle-button"
          onClick={toggleReplies}
        >
          {showReplies ? 'Hide Replies' : 'Show Replies'}
        </button>
        
        {!isReplying && (
          <button 
            className="reply-button"
            onClick={() => setIsReplying(true)}
          >
            Reply
          </button>
        )}
        
        {!showFullContent && (
          <Link to={`/forums/${post.id}`} className="view-full-post">
            View Full Post
          </Link>
        )}
      </div>
      
      {showReplies && (
        <div className="replies-section">
          {isLoadingReplies ? (
            <p>Loading replies...</p>
          ) : (
            <ReplyList replies={replies} />
          )}
        </div>
      )}
      
      {isReplying && (
        <div className="reply-form-container">
          <ReplyForm 
            postId={post.id}
            onReplyCreated={handleReplyCreated}
            onCancel={() => setIsReplying(false)}
          />
        </div>
      )}
    </div>
  );
}

export default ForumPostItem;
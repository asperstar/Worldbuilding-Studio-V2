// src/components/forums/ReplyItem.js
import React, { useState } from 'react';
import { useStorage } from '../../contexts/StorageContext';

function ReplyItem({ reply }) {
  const { currentUser, likeReply, unlikeReply } = useStorage();
  const [isLiked, setIsLiked] = useState(reply.likedBy?.includes(currentUser?.uid));
  const [likeCount, setLikeCount] = useState(reply.likes || 0);
  const [error, setError] = useState(null);

  const toggleLike = async () => {
    if (!currentUser) return;
    
    try {
      if (isLiked) {
        await unlikeReply('general', reply.postId, reply.id);
        setLikeCount(prev => prev - 1);
      } else {
        await likeReply('general', reply.postId, reply.id);
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Error toggling like on reply:', err);
      setError('Failed to update like status.');
    }
  };

  // Format timestamp to readable date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="reply-item">
      {error && <div className="reply-error">{error}</div>}
      
      <div className="reply-header">
        <span className="reply-author">
          {reply.username || 'Anonymous'} 
        </span>
        <span className="reply-date">
          {formatDate(reply.timestamp)}
          {reply.edited && <span className="edited-tag"> (edited)</span>}
        </span>
      </div>
      
      <div className="reply-content">
        <p>{reply.content}</p>
      </div>
      
      <div className="reply-actions">
        <button 
          className={`like-button ${isLiked ? 'liked' : ''}`}
          onClick={toggleLike}
        >
          {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
        </button>
      </div>
    </div>
  );
}

export default ReplyItem;
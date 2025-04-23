// src/components/forums/ForumPostForm.js
import React, { useState } from 'react';
import { useStorage } from '../../contexts/StorageContext';

function ForumPostForm({ onPostCreated, onCancel, initialData = null }) {
  const { addForumPost, updateForumPost } = useStorage();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const isEditing = !!initialData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Please provide both a title and content for your post.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let result;
      
      if (isEditing) {
        // Update existing post
        result = await updateForumPost('general', initialData.id, {
          title,
          content
        });
      } else {
        // Create new post
        result = await addForumPost('general', {
          title,
          content
        });
      }
      
      if (onPostCreated) {
        onPostCreated(result);
      }
      
      // Reset form
      setTitle('');
      setContent('');
    } catch (err) {
      console.error('Error saving post:', err);
      setError(`Failed to ${isEditing ? 'update' : 'create'} post: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="forum-post-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="post-title">Title:</label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title"
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="post-content">Content:</label>
        <textarea
          id="post-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          required
          disabled={isSubmitting}
        />
      </div>
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
        </button>
        
        {onCancel && (
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default ForumPostForm;
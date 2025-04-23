// src/components/forums/ReplyForm.js
import React, { useState } from 'react';
import { useStorage } from '../../contexts/StorageContext';

function ReplyForm({ postId, onReplyCreated, onCancel, initialData = null }) {
  const { addReplyToPost, updateReply } = useStorage();
  const [content, setContent] = useState(initialData?.content || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const isEditing = !!initialData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Please provide content for your reply.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let result;
      
      if (isEditing) {
        // Update existing reply
        result = await updateReply('general', postId, initialData.id, {
          content
        });
      } else {
        // Create new reply
        result = await addReplyToPost('general', postId, {
          content
        });
      }
      
      if (onReplyCreated) {
        onReplyCreated(result);
      }
      
      // Reset form
      setContent('');
    } catch (err) {
      console.error('Error saving reply:', err);
      setError(`Failed to ${isEditing ? 'update' : 'create'} reply: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="reply-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      
      <div className="form-group">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your reply..."
          rows={3}
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
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Reply' : 'Post Reply'}
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

export default ReplyForm;
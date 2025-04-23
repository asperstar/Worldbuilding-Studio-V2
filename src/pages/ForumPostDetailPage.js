// src/pages/ForumPostDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import ForumPostItem from '../components/forums/ForumPostItem';
import ForumPostForm from '../components/forums/ForumPostForm';
import '../styles/ForumPostDetailPage.css';

function ForumPostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getForumPost, deleteForumPost } = useStorage();
  const [post, setPost] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!currentUser || !postId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const forumPost = await getForumPost('general', postId);
        if (!forumPost) {
          setError('Post not found');
          return;
        }
        setPost(forumPost);
      } catch (err) {
        console.error('Error loading forum post:', err);
        setError('Failed to load post. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPost();
  }, [currentUser, postId, getForumPost]);

  const handlePostUpdate = (updatedPost) => {
    setPost(updatedPost);
    setIsEditing(false);
  };

  const handleDeletePost = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    try {
      await deleteForumPost('general', postId);
      navigate('/forums');
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post: ' + err.message);
      setConfirmDelete(false);
    }
  };

  // Check if current user is the post author
  const isAuthor = post && currentUser && post.userId === currentUser.uid;

  return (
    <div className="forum-post-detail-page">
      <div className="page-header">
        <Link to="/forums" className="back-link">
          &larr; Back to Forums
        </Link>
        <h1>Forum Post</h1>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {isLoading ? (
        <div className="loading-indicator">Loading post...</div>
      ) : !post ? (
        <div className="not-found">
          <p>Post not found or has been deleted.</p>
          <Link to="/forums" className="return-link">
            Return to Forums
          </Link>
        </div>
      ) : isEditing ? (
        <div className="edit-post-section">
          <h2>Edit Post</h2>
          <ForumPostForm 
            initialData={post}
            onPostCreated={handlePostUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      ) : (
        <>
          <ForumPostItem post={post} showFullContent={true} />
          
          {isAuthor && (
            <div className="author-actions">
              <button 
                className="edit-button"
                onClick={() => setIsEditing(true)}
              >
                Edit Post
              </button>
              
              <button 
                className={`delete-button ${confirmDelete ? 'confirm' : ''}`}
                onClick={handleDeletePost}
              >
                {confirmDelete ? 'Confirm Delete' : 'Delete Post'}
              </button>
              
              {confirmDelete && (
                <button 
                  className="cancel-delete-button"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ForumPostDetailPage;
// src/pages/ForumsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStorage } from '../contexts/StorageContext';
import ForumPostForm from '../components/forums/ForumPostForm';
import ForumPostList from '../components/forums/ForumPostList';
import '../styles/ForumsPage.css';

function ForumsPage() {
  const { currentUser, getForumPosts } = useStorage();
  const [posts, setPosts] = useState([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' or 'popular'

  useEffect(() => {
    const loadPosts = async () => {
      if (!currentUser) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const forumPosts = await getForumPosts('general');
        setPosts(forumPosts);
      } catch (err) {
        console.error('Error loading forum posts:', err);
        setError('Failed to load forum posts. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPosts();
  }, [currentUser, getForumPosts]);

  const handlePostCreated = (newPost) => {
    setPosts([newPost, ...posts]);
    setIsCreatingPost(false);
  };

  const sortPosts = (postsToSort) => {
    if (sortBy === 'newest') {
      return [...postsToSort].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
    } else if (sortBy === 'popular') {
      return [...postsToSort].sort((a, b) => b.likes - a.likes);
    }
    return postsToSort;
  };

  return (
    <div className="forums-page">
      <div className="forums-header">
        <h1>Community Forums</h1>
        <div className="forum-controls">
          <div className="sort-control">
            <label>Sort by: </label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
          {!isCreatingPost && (
            <button 
              className="create-post-button"
              onClick={() => setIsCreatingPost(true)}
            >
              Create New Post
            </button>
          )}
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {isCreatingPost && (
        <div className="create-post-section">
          <h2>Create New Post</h2>
          <ForumPostForm 
            onPostCreated={handlePostCreated}
            onCancel={() => setIsCreatingPost(false)}
          />
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-indicator">Loading posts...</div>
      ) : (
        <ForumPostList posts={sortPosts(posts)} />
      )}
      
      {!isLoading && posts.length === 0 && (
        <div className="empty-forum">
          <p>No posts yet! Be the first to share your thoughts.</p>
          {!isCreatingPost && (
            <button 
              className="create-first-post-button"
              onClick={() => setIsCreatingPost(true)}
            >
              Create First Post
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ForumsPage;
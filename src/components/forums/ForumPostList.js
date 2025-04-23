// src/components/forums/ForumPostList.js
import React from 'react';
import { Link } from 'react-router-dom';
import ForumPostItem from './ForumPostItem';

function ForumPostList({ posts }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="empty-posts-message">
        <p>No posts to display.</p>
      </div>
    );
  }

  return (
    <div className="forum-post-list">
      {posts.map(post => (
        <ForumPostItem key={post.id} post={post} />
      ))}
    </div>
  );
}

export default ForumPostList;
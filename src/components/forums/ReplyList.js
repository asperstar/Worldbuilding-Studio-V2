import React from 'react';
import ReplyItem from './ReplyItem';

function ReplyList({ replies }) {
  if (!replies || replies.length === 0) {
    return (
      <div className="empty-replies-message">
        <p>No replies yet. Be the first to reply!</p>
      </div>
    );
  }

  return (
    <div className="reply-list">
      {replies.map(reply => (
        <ReplyItem key={reply.id} reply={reply} />
      ))}
    </div>
  );
}

export default ReplyList;
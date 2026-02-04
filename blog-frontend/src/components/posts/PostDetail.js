import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Eye, Heart, Lock, MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createComment, deleteComment } from '../../services/api';

function PostDetail({ post, onBack, onLike, onCommentAdded }) {
  const { user, token } = useAuth();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Vui lòng đăng nhập để bình luận');
      return;
    }

    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      await createComment(post.slug, comment, token);
      setComment('');
      onCommentAdded();
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;

    try {
      await deleteComment(post.slug, commentId, token);
      onCommentAdded();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="post-detail">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft size={20} />
        <span>Quay lại</span>
      </button>

      <article className="detail-content">
        <div className="detail-header">
          <div className="header-meta">
            <span className="category-tag">{post.category}</span>
            <span className="date">
              <Calendar size={16} />
              {new Date(post.date).toLocaleDateString('vi-VN')}
            </span>
          </div>
          
          <h1 className="detail-title">{post.title}</h1>
          
          <div className="detail-info">
            <span className="author">Bởi {post.author}</span>
            <div className="stats">
              <span className="stat">
                <Eye size={18} />
                {post.views} lượt xem
              </span>
              <button 
                className={`like-btn ${post.likedByCurrentUser ? 'liked' : ''}`}
                onClick={() => onLike(post.slug)}
                disabled={!user}
                title={!user ? 'Đăng nhập để thích' : ''}
              >
                {!user && <Lock size={16} />}
                <Heart size={18} fill={post.likedByCurrentUser ? 'currentColor' : 'none'} />
                {post.likes}
              </button>
            </div>
          </div>
        </div>

        <div className="detail-image">
          <img src={post.imageUrl} alt={post.title} />
        </div>

        <div className="detail-body">
          {post.content.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        <div className="comments-section">
          <h3 className="comments-title">
            <MessageCircle size={24} />
            Bình luận ({post.comments?.length || 0})
          </h3>

          {user ? (
            <form onSubmit={handleSubmitComment} className="comment-form">
              <img src={user.avatar} alt={user.name} className="comment-avatar" />
              <div className="comment-input-wrapper">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Viết bình luận..."
                  rows="3"
                  disabled={submitting}
                />
                <button type="submit" disabled={submitting || !comment.trim()}>
                  {submitting ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </form>
          ) : (
            <div className="login-prompt">
              <p>Đăng nhập để bình luận</p>
            </div>
          )}

          <div className="comments-list">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <img src={comment.avatar} alt={comment.author} className="comment-avatar" />
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-date">
                        {new Date(comment.createdAt).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {user && user.id === comment.authorId && (
                        <button 
                          className="delete-comment-btn"
                          onClick={() => handleDeleteComment(comment.id)}
                          title="Xóa bình luận"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-comments">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

export default PostDetail;

import React from 'react';
import { Heart, Calendar, Eye, MessageCircle, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function PostGrid({ posts, onPostClick, onLike }) {
  const { user } = useAuth();

  if (posts.length === 0) {
    return (
      <div className="no-posts">
        <p>Không tìm thấy bài viết nào.</p>
      </div>
    );
  }

  return (
    <div className="post-grid">
      <div className="grid-container">
        {posts.map((post, index) => (
          <article 
            key={post.id} 
            className="post-card"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="post-image" onClick={() => onPostClick(post.slug)}>
              <img src={post.imageUrl} alt={post.title} />
              <div className="image-overlay">
                <span className="read-more">Đọc tiếp</span>
              </div>
            </div>
            
            <div className="post-content">
              <div className="post-meta">
                <span className="category-tag">{post.category}</span>
                <span className="date">
                  <Calendar size={14} />
                  {new Date(post.date).toLocaleDateString('vi-VN')}
                </span>
              </div>
              
              <h2 className="post-title" onClick={() => onPostClick(post.slug)}>
                {post.title}
              </h2>
              
              <p className="post-excerpt">{post.excerpt}</p>
              
              <div className="post-footer">
                <div className="post-stats">
                  <span className="stat">
                    <Eye size={16} />
                    {post.views}
                  </span>
                  <button 
                    className={`stat like-btn ${post.likedByCurrentUser ? 'liked' : ''}`}
                    onClick={() => onLike(post.slug)}
                    disabled={!user}
                    title={!user ? 'Đăng nhập để thích' : ''}
                  >
                    {!user && <Lock size={14} />}
                    <Heart size={16} fill={post.likedByCurrentUser ? 'currentColor' : 'none'} />
                    {post.likes}
                  </button>
                  <span className="stat comment-stat">
                    {!user && <Lock size={14} />}
                    <MessageCircle size={16} />
                    {post.commentCount || 0}
                  </span>
                </div>
                <span className="author">{post.author}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default PostGrid;

import React, { useState, useEffect } from 'react';
import { Heart, Search, Calendar, Eye, Plus, X, ArrowLeft, LogIn, LogOut, User, MessageCircle, Trash2 } from 'lucide-react';
import './App.css';

const API_URL = '';

// Authentication Context
const AuthContext = React.createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for auth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      handleAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const handleAuthCallback = async (code) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('token', data.token);
      } else {
        console.error('Authentication failed');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token invalid
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login-url`);
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <BlogApp />
    </AuthContext.Provider>
  );
}

function BlogApp() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token, user } = React.useContext(AuthContext);

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [selectedCategory, searchQuery]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'Tất cả') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`${API_URL}/api/posts?${params}`, { headers });
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPostBySlug = async (slug) => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const response = await fetch(`${API_URL}/api/posts/${slug}`, { headers });
      const data = await response.json();
      setSelectedPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
    }
  };

  const handleLike = async (slug) => {
    if (!user) {
      alert('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/posts/${slug}/like`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const updatedPost = await response.json();
        if (selectedPost && selectedPost.slug === slug) {
          setSelectedPost(updatedPost);
        }
        fetchPosts();
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      const response = await fetch(`${API_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData),
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  if (selectedPost) {
    return (
      <PostDetail 
        post={selectedPost} 
        onBack={() => setSelectedPost(null)} 
        onLike={handleLike}
        onCommentAdded={() => fetchPostBySlug(selectedPost.slug)}
      />
    );
  }

  return (
    <div className="app">
      <Header 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery}
        onCreateClick={() => setShowCreateModal(true)}
      />
      
      <CategoryFilter 
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Đang tải bài viết...</p>
        </div>
      ) : (
        <PostGrid posts={posts} onPostClick={fetchPostBySlug} onLike={handleLike} />
      )}

      {showCreateModal && (
        <CreatePostModal 
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePost}
          categories={categories.filter(c => c !== 'Tất cả')}
        />
      )}
    </div>
  );
}

function Header({ searchQuery, setSearchQuery, onCreateClick }) {
  const { user, login, logout } = React.useContext(AuthContext);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-top">
          <h1 className="logo">
            <span className="logo-main">Nhật Ký</span>
            <span className="logo-sub">của tôi</span>
          </h1>
          
          <div className="header-actions">
            {user ? (
              <>
                <button className="create-btn" onClick={onCreateClick}>
                  <Plus size={20} />
                  <span>Viết bài</span>
                </button>
                <div className="user-menu">
                  <img src={user.avatar} alt={user.name} className="user-avatar" />
                  <span className="user-name">{user.name}</span>
                  <button className="logout-btn" onClick={logout}>
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <button className="login-btn" onClick={login}>
                <LogIn size={20} />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="search-container">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm bài viết..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>
    </header>
  );
}

function CategoryFilter({ categories, selectedCategory, setSelectedCategory }) {
  return (
    <div className="category-filter">
      <div className="category-container">
        {categories.map((category, index) => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function PostGrid({ posts, onPostClick, onLike }) {
  const { user } = React.useContext(AuthContext);

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
                    <Heart size={16} fill={post.likedByCurrentUser ? 'currentColor' : 'none'} />
                    {post.likes}
                  </button>
                  <span className="stat">
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

function PostDetail({ post, onBack, onLike, onCommentAdded }) {
  const { user, token } = React.useContext(AuthContext);
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
      const response = await fetch(`${API_URL}/api/posts/${post.slug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: comment })
      });

      if (response.ok) {
        setComment('');
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bình luận này?')) return;

    try {
      const response = await fetch(`${API_URL}/api/posts/${post.slug}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onCommentAdded();
      }
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

        {/* Comments Section */}
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

function CreatePostModal({ onClose, onSubmit, categories }) {
  const { user } = React.useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: categories[0] || 'Đời sống',
    imageUrl: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Viết bài mới</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Tiêu đề</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Nhập tiêu đề bài viết..."
            />
          </div>

          <div className="form-group">
            <label>Tóm tắt</label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              required
              rows="2"
              placeholder="Viết tóm tắt ngắn gọn..."
            />
          </div>

          <div className="form-group">
            <label>Nội dung</label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows="8"
              placeholder="Viết nội dung bài viết..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Danh mục</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>URL hình ảnh (tùy chọn)</label>
            <input
              type="url"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <button type="submit" className="submit-btn">
            Đăng bài
          </button>
        </form>
      </div>
    </div>
  );
}
export default App;

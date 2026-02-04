import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import Header from './components/layout/Header';
import CategoryFilter from './components/posts/CategoryFilter';
import PostGrid from './components/posts/PostGrid';
import PostDetail from './components/posts/PostDetail';
import CreatePostModal from './components/posts/CreatePostModal';
import { fetchPosts, fetchCategories, fetchPostBySlug, createPost, likePost } from './services/api';
import './App.css';

function BlogApp() {
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();

  useEffect(() => {
    loadCategories();
    loadPosts();
  }, [selectedCategory, searchQuery, token]);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await fetchPosts(selectedCategory, searchQuery, token);
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = async (slug) => {
    try {
      const data = await fetchPostBySlug(slug, token);
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
      const updatedPost = await likePost(slug, token);
      if (selectedPost && selectedPost.slug === slug) {
        setSelectedPost(updatedPost);
      }
      loadPosts();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCreatePost = async (postData) => {
    try {
      await createPost(postData, token);
      setShowCreateModal(false);
      loadPosts();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCommentAdded = () => {
    if (selectedPost) {
      handlePostClick(selectedPost.slug);
    }
  };

  if (selectedPost) {
    return (
      <PostDetail 
        post={selectedPost} 
        onBack={() => setSelectedPost(null)} 
        onLike={handleLike}
        onCommentAdded={handleCommentAdded}
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
        <PostGrid posts={posts} onPostClick={handlePostClick} onLike={handleLike} />
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

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  return user ? <BlogApp /> : <LoginPage />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import Header from './components/layout/Header';
import CategoryFilter from './components/posts/CategoryFilter';
import PostGrid from './components/posts/PostGrid';
import PostDetail from './components/posts/PostDetail';
import CreatePostModal from './components/posts/CreatePostModal';
import { fetchPosts, fetchCategories, fetchPostBySlug, createPost, likePost } from './services/api';
import { initGA, trackPageView, trackEvent, trackTiming, setUserProperties } from './services/analytics';
import './App.css';

console.log('🚀 App.js loaded');

function BlogApp() {
  console.log('🎯 BlogApp component rendering');
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { token, user } = useAuth();


  // Track user login
  useEffect(() => {
    if (user) {
      setUserProperties(user.id, {
        username: user.name
      });
      trackEvent('User', 'Login Success', user.name);
    }
  }, [user]);

  // Track page navigation
  useEffect(() => {
    if (selectedPost) {
      trackPageView(`/post/${selectedPost.slug}`, selectedPost.title);
      trackEvent('Content', 'View Post', selectedPost.title);
    } else {
      trackPageView('/', 'Blog Home');
    }
  }, [selectedPost]);

  // Track search
  useEffect(() => {
    if (searchQuery) {
      trackEvent('Search', 'Search Query', searchQuery);
    }
  }, [searchQuery]);

  // Track category filter
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'Tất cả') {
      trackEvent('Navigation', 'Filter Category', selectedCategory);
    }
  }, [selectedCategory]);

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
    const startTime = performance.now();
    
    try {
      const data = await fetchPostBySlug(slug, token);
      setSelectedPost(data);
      
      const loadTime = performance.now() - startTime;
      trackTiming('Performance', 'Post Load', loadTime, slug);
    } catch (error) {
      console.error('Error fetching post:', error);
      trackEvent('Error', 'Post Load Failed', slug);
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
      
      trackEvent('Engagement', 'Like Post', slug);
    } catch (error) {
      console.error('Error liking post:', error);
      trackEvent('Error', 'Like Failed', slug);
    }
  };

  const handleCreatePost = async (postData) => {
    const startTime = performance.now();
    
    try {
      await createPost(postData, token);
      setShowCreateModal(false);
      loadPosts();
      
      const createTime = performance.now() - startTime;
      trackEvent('Content', 'Create Post', postData.category);
      trackTiming('Performance', 'Post Creation', createTime, 'Create Post');
    } catch (error) {
      console.error('Error creating post:', error);
      trackEvent('Error', 'Create Post Failed', error.message);
    }
  };

  const handleCommentAdded = () => {
    if (selectedPost) {
      handlePostClick(selectedPost.slug);
      trackEvent('Engagement', 'Add Comment', selectedPost.title);
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
  
  console.log('📱 App function - user:', user, 'loading:', loading);

  if (loading) {
    console.log('⏳ Showing loading screen');
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Đang tải...</p>
      </div>
    );
  }

  console.log('✅ Rendering:', user ? 'BlogApp' : 'LoginPage');
  return user ? <BlogApp /> : <LoginPage />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

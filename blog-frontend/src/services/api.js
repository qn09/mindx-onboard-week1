const API_URL = 'https://quannv.id.vn';

// Posts API
export const fetchPosts = async (category, searchQuery, token) => {
  const params = new URLSearchParams();
  if (category !== 'Tất cả') params.append('category', category);
  if (searchQuery) params.append('search', searchQuery);
  
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_URL}/api/posts?${params}`, { headers });
  return response.json();
};

export const fetchPostBySlug = async (slug, token) => {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_URL}/api/posts/${slug}`, { headers });
  return response.json();
};

export const createPost = async (postData, token) => {
  const response = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(postData),
  });
  return response.json();
};

export const likePost = async (slug, token) => {
  const response = await fetch(`${API_URL}/api/posts/${slug}/like`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

export const deletePost = async (slug, token) => {
  const response = await fetch(`${API_URL}/api/posts/${slug}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Categories API
export const fetchCategories = async () => {
  const response = await fetch(`${API_URL}/api/categories`);
  return response.json();
};

// Comments API
export const createComment = async (slug, content, token) => {
  const response = await fetch(`${API_URL}/api/posts/${slug}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content })
  });
  return response.json();
};

export const deleteComment = async (slug, commentId, token) => {
  const response = await fetch(`${API_URL}/api/posts/${slug}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

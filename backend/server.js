const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3001;

// JWT Secret (nên đặt trong environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Headers:`, req.headers);
  next();
});
// OpenID Configuration
const OPENID_CONFIG = {
  issuer: 'https://id-dev.mindx.edu.vn',
  authorizationEndpoint: 'https://id-dev.mindx.edu.vn/auth',     
  tokenEndpoint: 'https://id-dev.mindx.edu.vn/token',              
  userInfoEndpoint: 'https://id-dev.mindx.edu.vn/me',              
  clientId: process.env.OPENID_CLIENT_ID ,
  clientSecret: process.env.OPENID_CLIENT_SECRET ,
  redirectUri: process.env.OPENID_REDIRECT_URI || 'https://quannv.id.vn/api/auth/callback', //update RedirectUri
  scope: 'openid profile email'
};

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database
let userCache = {}; // Cache user info by access token to avoid repeated API calls
let comments = {}; 
let userLikes = {}; 

// Cache cleanup - remove entries older than 1 hour
setInterval(() => {
  const now = Date.now();
  Object.keys(userCache).forEach(token => {
    if (now - userCache[token].cachedAt > 3600000) { // 1 hour
      delete userCache[token];
    }
  });
  console.log(`[Cache Debug] Active cached users: ${Object.keys(userCache).length}`);
}, 300000); // Run every 5 minutes 

let posts = [
  {
    id: 1,
    title: "Khám Phá Vẻ Đẹp Hạ Long",
    slug: "kham-pha-ve-dep-ha-long",
    excerpt: "Vịnh Hạ Long - Di sản thiên nhiên thế giới với hàng nghìn hòn đảo đá vôi tuyệt đẹp...",
    content: "Vịnh Hạ Long là một trong những kỳ quan thiên nhiên tuyệt đẹp nhất Việt Nam. Với hàng nghìn hòn đảo đá vôi nhô lên từ mặt nước biển xanh ngọc bích, tạo nên một bức tranh thiên nhiên hùng vĩ và thơ mộng.\n\nKhi đến Hạ Long, bạn sẽ được chiêm ngưỡng vẻ đẹp của những hang động kỳ thú như Động Thiên Cung, Động Đầu Gỗ, và trải nghiệm cảm giác du thuyền giữa những dãy núi đá hùng vĩ.\n\nĐây thực sự là một điểm đến không thể bỏ qua khi đến Việt Nam.",
    author: "Nguyễn Văn A",
    date: "2025-01-20",
    category: "Du lịch",
    imageUrl: "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=500&fit=crop",
    views: 1250,
    likes: 89
  },
  {
    id: 2,
    title: "Lập Trình React Hiện Đại",
    slug: "lap-trinh-react-hien-dai",
    excerpt: "Tìm hiểu về các pattern và best practices mới nhất trong React 2025...",
    content: "React đã trở thành một trong những thư viện JavaScript phổ biến nhất để xây dựng giao diện người dùng. Năm 2025, React tiếp tục phát triển với nhiều tính năng mới và cải tiến đáng kể.\n\nServer Components, Suspense, và concurrent rendering đã thay đổi cách chúng ta xây dựng ứng dụng React. Các hooks mới như use() và useOptimistic mang đến khả năng quản lý state và side effects tốt hơn.\n\nTrong bài viết này, tôi sẽ chia sẻ những kinh nghiệm và best practices khi làm việc với React hiện đại.",
    author: "Trần Thị B",
    date: "2025-01-18",
    category: "Công nghệ",
    imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=500&fit=crop",
    views: 2100,
    likes: 156
  },
  {
    id: 3,
    title: "Nghệ Thuật Pha Cà Phê",
    slug: "nghe-thuat-pha-ca-phe",
    excerpt: "Khám phá bí quyết pha chế những tách cà phê hoàn hảo tại nhà...",
    content: "Cà phê không chỉ là một thức uống, mà còn là một nghệ thuật. Từ việc chọn hạt cà phê, mức độ rang, đến kỹ thuật pha chế, mọi yếu tố đều ảnh hưởng đến hương vị của tách cà phê cuối cùng.\n\nĐể pha một tách cà phê ngon, bạn cần chú ý đến nhiệt độ nước (khoảng 92-96°C), tỷ lệ cà phê và nước (1:15 đến 1:17), và thời gian chiết xuất.\n\nHãy cùng tôi khám phá những bí quyết để biến mỗi buổi sáng của bạn trở nên đặc biệt hơn với những tách cà phê tuyệt vời.",
    author: "Lê Văn C",
    date: "2025-01-15",
    category: "Ẩm thực",
    imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800&h=500&fit=crop",
    views: 980,
    likes: 72
  }
];

let categories = ["Tất cả", "Du lịch", "Công nghệ", "Ẩm thực", "Đời sống", "Kinh nghiệm"];
let nextId = 4;

// Authentication Middleware - validates OpenID access token
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
  }
  
  try {
    // Check cache first
    if (userCache[token] && (Date.now() - userCache[token].cachedAt < 600000)) { // 10 min cache
      req.user = userCache[token].user;
      req.accessToken = token;
      return next();
    }
    
    // Validate token with OpenID provider
    const userInfoResponse = await fetch(OPENID_CONFIG.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    }
    
    const userInfo = await userInfoResponse.json();
    
    // Cache user info
    const user = {
      id: userInfo.sub || userInfo.id,
      username: userInfo.preferred_username || userInfo.username || userInfo.email,
      name: userInfo.name || userInfo.preferred_username || 'User',
      email: userInfo.email,
      avatar: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.sub || userInfo.id}`
    };
    
    userCache[token] = {
      user,
      cachedAt: Date.now()
    };
    
    req.user = user;
    req.accessToken = token;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(401).json({ error: 'Unauthorized', message: 'Token validation failed' });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next();
  }
  
  try {
    // Check cache
    if (userCache[token] && (Date.now() - userCache[token].cachedAt < 600000)) {
      req.user = userCache[token].user;
      req.accessToken = token;
      return next();
    }
    
    // Validate with OpenID provider
    const userInfoResponse = await fetch(OPENID_CONFIG.userInfoEndpoint, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      const user = {
        id: userInfo.sub || userInfo.id,
        username: userInfo.preferred_username || userInfo.username || userInfo.email,
        name: userInfo.name || userInfo.preferred_username || 'User',
        email: userInfo.email,
        avatar: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.sub || userInfo.id}`
      };
      
      userCache[token] = { user, cachedAt: Date.now() };
      req.user = user;
      req.accessToken = token;
    }
  } catch (error) {
    console.error('Optional auth error:', error);
  }
  
  next();
};

// Health check endpoint (không cần auth)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generate session token
const generateToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// OpenID Connect Routes
app.get('/api/auth/login-url', (req, res) => {
  const state = generateToken();
  const authUrl = `${OPENID_CONFIG.authorizationEndpoint}?` + 
    `client_id=${OPENID_CONFIG.clientId}&` +
    `redirect_uri=${encodeURIComponent(OPENID_CONFIG.redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(OPENID_CONFIG.scope)}&` +
    `state=${state}`;
  
  res.json({ authUrl, state });
});
app.get('/api/auth/callback', (req, res) => {
  const { code, state } = req.query;
  
  console.log('Received OAuth callback:', { code, state });
  
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  
  
  res.redirect(`/?code=${code}${state ? '&state=' + state : ''}`);
});
app.post('/api/auth/callback', async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }
  
  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch(OPENID_CONFIG.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: OPENID_CONFIG.redirectUri,
        client_id: OPENID_CONFIG.clientId,
        client_secret: OPENID_CONFIG.clientSecret,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.status(400).json({ error: 'Failed to exchange authorization code' });
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Get user info
    const userInfoResponse = await fetch(OPENID_CONFIG.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      return res.status(400).json({ error: 'Failed to fetch user info' });
    }
    
    const userInfo = await userInfoResponse.json();
    
    // Return OpenID access token directly (not creating separate session)
    const user = {
      id: userInfo.sub || userInfo.id,
      username: userInfo.preferred_username || userInfo.username || userInfo.email,
      name: userInfo.name || userInfo.preferred_username || 'User',
      email: userInfo.email,
      avatar: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.sub || userInfo.id}`
    };
    
    // Cache user info with the access token
    userCache[accessToken] = {
      user,
      cachedAt: Date.now()
    };
    
    console.log(`[Auth] User logged in: ${user.name} (${user.email})`);
    
    res.json({
      token: accessToken, // Return OpenID access token
      user: user
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && userCache[token]) {
    delete userCache[token];
    console.log(`[Auth] User logged out, token removed from cache`);
  }
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
  }
  
  try {
    // Check cache first
    if (userCache[token] && (Date.now() - userCache[token].cachedAt < 600000)) {
      return res.json({ user: userCache[token].user });
    }
    
    // Validate with OpenID provider
    const userInfoResponse = await fetch(OPENID_CONFIG.userInfoEndpoint, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
    }
    
    const userInfo = await userInfoResponse.json();
    const user = {
      id: userInfo.sub || userInfo.id,
      username: userInfo.preferred_username || userInfo.username || userInfo.email,
      name: userInfo.name || userInfo.preferred_username || 'User',
      email: userInfo.email,
      avatar: userInfo.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userInfo.sub || userInfo.id}`
    };
    
    // Update cache
    userCache[token] = { user, cachedAt: Date.now() };
    
    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Unauthorized', code: 'VALIDATION_FAILED' });
  }
});

// Health Check

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'blog-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/posts', optionalAuth, (req, res) => {
  const { category, search } = req.query;
  let filteredPosts = [...posts];

  if (category && category !== 'Tất cả') {
    filteredPosts = filteredPosts.filter(post => post.category === category);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredPosts = filteredPosts.filter(post => 
      post.title.toLowerCase().includes(searchLower) ||
      post.excerpt.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower)
    );
  }

  // Add user like status if logged in
  const postsWithLikeStatus = filteredPosts.map(post => ({
    ...post,
    likedByCurrentUser: req.user ? (userLikes[req.user.id] || []).includes(post.slug) : false,
    commentCount: (comments[post.slug] || []).length
  }));

  res.json(postsWithLikeStatus.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

app.get('/api/posts/:slug', optionalAuth, (req, res) => {
  const post = posts.find(p => p.slug === req.params.slug);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  // Increment views
  post.views++;
  
  const postWithExtras = {
    ...post,
    likedByCurrentUser: req.user ? (userLikes[req.user.id] || []).includes(post.slug) : false,
    comments: comments[post.slug] || [],
    commentCount: (comments[post.slug] || []).length
  };
  
  res.json(postWithExtras);
});

app.post('/api/posts', authenticateUser, (req, res) => {
  const { title, excerpt, content, author, category, imageUrl } = req.body;
  
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const newPost = {
    id: nextId++,
    title,
    slug,
    excerpt,
    content,
    author: req.user.name,
    authorId: req.user.id,
    category,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=500&fit=crop',
    date: new Date().toISOString().split('T')[0],
    views: 0,
    likes: 0
  };

  posts.push(newPost);
  res.status(201).json(newPost);
});

app.put('/api/posts/:slug/like', authenticateUser, (req, res) => {
  const post = posts.find(p => p.slug === req.params.slug);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const userId = req.user.id;
  if (!userLikes[userId]) {
    userLikes[userId] = [];
  }
  
  const likeIndex = userLikes[userId].indexOf(post.slug);
  
  if (likeIndex === -1) {
   
    userLikes[userId].push(post.slug);
    post.likes++;
  } else {

    userLikes[userId].splice(likeIndex, 1);
    post.likes--;
  }
  
  res.json({ 
    ...post, 
    likedByCurrentUser: likeIndex === -1 
  });
});


// Comments Routes
app.get('/api/posts/:slug/comments', (req, res) => {
  const postComments = comments[req.params.slug] || [];
  res.json(postComments);
});

app.post('/api/posts/:slug/comments', authenticateUser, (req, res) => {
  const { content } = req.body;
  const slug = req.params.slug;
  
  const post = posts.find(p => p.slug === slug);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  if (!comments[slug]) {
    comments[slug] = [];
  }
  
  const newComment = {
    id: Date.now(),
    content,
    author: req.user.name,
    authorId: req.user.id,
    avatar: req.user.avatar,
    createdAt: new Date().toISOString()
  };
  
  comments[slug].push(newComment);
  res.status(201).json(newComment);
});

app.delete('/api/posts/:slug/comments/:commentId', authenticateUser, (req, res) => {
  const { slug, commentId } = req.params;
  const postComments = comments[slug];
  
  if (!postComments) {
    return res.status(404).json({ error: 'Comments not found' });
  }
  
  const commentIndex = postComments.findIndex(c => c.id === parseInt(commentId));
  
  if (commentIndex === -1) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  // Check if user is the comment author
  if (postComments[commentIndex].authorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  postComments.splice(commentIndex, 1);
  res.json({ message: 'Comment deleted successfully' });
});

app.delete('/api/posts/:slug', authenticateUser, (req, res) => {
  const index = posts.findIndex(p => p.slug === req.params.slug);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  posts.splice(index, 1);
  res.json({ message: 'Post deleted successfully' });
});

app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
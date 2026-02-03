const express = require('express');
const cors = require('cors');
const { verifyMindXIdToken, createDisplayName } = require('./auth');
const app = express();
const PORT = 3001;

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database
let userCache = new Map(); // Cache user info by token
let comments = {}; 
let userLikes = {}; 

// Cache cleanup - remove entries older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of userCache.entries()) {
    if (now - data.cachedAt > 3600000) { // 1 hour
      userCache.delete(token);
    }
  }
  console.log(`[Cache] Active cached users: ${userCache.size}`);
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

// Authentication Middleware - validates JWT token with JWKS
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Check cache first
    const cached = userCache.get(token);
    if (cached && (Date.now() - cached.cachedAt < 600000)) { // 10 min cache
      req.user = cached.user;
      req.tokenPayload = cached.tokenPayload;
      return next();
    }
    
    // Verify JWT token with JWKS
    console.log('🔐 Verifying JWT token...');
    const payload = await verifyMindXIdToken(token);
    
    // Create user object from token payload
    const user = {
      id: payload.sub,
      username: payload.preferred_username || payload.email || payload.sub,
      name: createDisplayName(payload),
      email: payload.email || '',
      avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.sub}`
    };
    
    // Cache user info
    userCache.set(token, {
      user,
      tokenPayload: payload,
      cachedAt: Date.now()
    });
    
    req.user = user;
    req.tokenPayload = payload;
    
    console.log(`✅ User authenticated: ${user.name} (${user.email})`);
    next();
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: error.message || 'Token validation failed' 
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Check cache
    const cached = userCache.get(token);
    if (cached && (Date.now() - cached.cachedAt < 600000)) {
      req.user = cached.user;
      req.tokenPayload = cached.tokenPayload;
      return next();
    }
    
    // Verify JWT token
    const payload = await verifyMindXIdToken(token);
    
    const user = {
      id: payload.sub,
      username: payload.preferred_username || payload.email || payload.sub,
      name: createDisplayName(payload),
      email: payload.email || '',
      avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.sub}`
    };
    
    userCache.set(token, {
      user,
      tokenPayload: payload,
      cachedAt: Date.now()
    });
    
    req.user = user;
    req.tokenPayload = payload;
  } catch (error) {
    console.error('⚠️ Optional auth error:', error.message);
  }
  
  next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'blog-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString() 
  });
});

// Authentication routes
app.get('/api/auth/me', authenticateUser, (req, res) => {
  res.json({ 
    user: req.user,
    tokenInfo: {
      iss: req.tokenPayload?.iss,
      aud: req.tokenPayload?.aud,
      exp: req.tokenPayload?.exp,
      iat: req.tokenPayload?.iat,
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    userCache.delete(token);
    console.log('[Auth] User logged out, token removed from cache');
  }
  res.json({ message: 'Logged out successfully' });
});

// Health Check (duplicate removed)

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
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});
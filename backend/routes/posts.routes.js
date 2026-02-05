const express = require('express');
const router = express.Router();
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { trackEvent, trackMetric } = require('../middleware/metrics');

// In-memory data storage
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

let userLikes = {};
let nextId = 4;

// Get all posts with filtering
router.get('/', optionalAuth, (req, res) => {
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
  const { getCommentCount } = require('./comments.routes');
  const postsWithLikeStatus = filteredPosts.map(post => ({
    ...post,
    likedByCurrentUser: req.user ? (userLikes[req.user.id] || []).includes(post.slug) : false,
    commentCount: getCommentCount(post.slug)
  }));

  res.json(postsWithLikeStatus.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

// Get single post by slug
router.get('/:slug', optionalAuth, (req, res) => {
  const post = posts.find(p => p.slug === req.params.slug);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  // Increment views
  post.views++;
  
  const { getComments, getCommentCount } = require('./comments.routes');
  const postWithExtras = {
    ...post,
    likedByCurrentUser: req.user ? (userLikes[req.user.id] || []).includes(post.slug) : false,
    comments: getComments(post.slug),
    commentCount: getCommentCount(post.slug)
  };
  
  res.json(postWithExtras);
});

// Create new post
router.post('/', authenticateUser, (req, res) => {
  const { title, excerpt, content, category, imageUrl } = req.body;
  
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
  
  // Track post creation
  trackEvent('Post Created', {
    postId: newPost.id,
    category: newPost.category,
    userId: req.user.id,
    username: req.user.name
  });
  
  trackMetric('Total Posts', posts.length);
  
  res.status(201).json(newPost);
});

// Like/unlike post
router.put('/:slug/like', authenticateUser, (req, res) => {
  const post = posts.find(p => p.slug === req.params.slug);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const userId = req.user.id;
  if (!userLikes[userId]) {
    userLikes[userId] = [];
  }
  
  const likeIndex = userLikes[userId].indexOf(post.slug);
  let isLiked = false;
  
  if (likeIndex === -1) {
    // Like the post
    userLikes[userId].push(post.slug);
    post.likes++;
    isLiked = true;
    
    trackEvent('Post Liked', {
      postId: post.id,
      postSlug: post.slug,
      userId: req.user.id,
      totalLikes: post.likes
    });
  } else {
    // Unlike the post
    userLikes[userId].splice(likeIndex, 1);
    post.likes--;
    isLiked = false;
    
    trackEvent('Post Unliked', {
      postId: post.id,
      postSlug: post.slug,
      userId: req.user.id,
      totalLikes: post.likes
    });
  }
  
  res.json({ 
    ...post, 
    likedByCurrentUser: isLiked 
  });
});

// Delete post
router.delete('/:slug', authenticateUser, (req, res) => {
  const index = posts.findIndex(p => p.slug === req.params.slug);
  if (index === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  // Check if user is the author
  if (posts[index].authorId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  posts.splice(index, 1);
  res.json({ message: 'Post deleted successfully' });
});

module.exports = router;

const express = require('express');
const router = express.Router({ mergeParams: true });
const { authenticateUser } = require('../middleware/auth');

// In-memory comments storage
let comments = {};

// Get comments for a post
router.get('/', (req, res) => {
  const postComments = comments[req.params.slug] || [];
  res.json(postComments);
});

// Create a comment
router.post('/', authenticateUser, (req, res) => {
  const { content } = req.body;
  const slug = req.params.slug;
  
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

// Delete a comment
router.delete('/:commentId', authenticateUser, (req, res) => {
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

// Helper functions for other modules
const getComments = (slug) => comments[slug] || [];
const getCommentCount = (slug) => (comments[slug] || []).length;

module.exports = router;
module.exports.getComments = getComments;
module.exports.getCommentCount = getCommentCount;

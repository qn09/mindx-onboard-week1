const express = require('express');
const router = express.Router();

// Categories list
const categories = ["Tất cả", "Du lịch", "Công nghệ", "Ẩm thực", "Đời sống", "Kinh nghiệm"];

// Get all categories
router.get('/', (req, res) => {
  res.json(categories);
});

module.exports = router;

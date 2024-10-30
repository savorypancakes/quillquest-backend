// backend/routes/config.js
const express = require('express');
const router = express.Router();

// @route   GET /api/config
// @desc    Get public configuration
// @access  Public
router.get('/', (req, res) => {
  // Only expose non-sensitive configuration
  const publicConfig = {
    GROQ_API_KEY: process.env.REACT_APP_GROQ_API_KEY,
    // Add other public config values here
    API_VERSION: '1.0',
    ENVIRONMENT: process.env.NODE_ENV
  };

  res.json(publicConfig);
});

module.exports = router;
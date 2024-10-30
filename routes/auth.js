// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', register);

// @desc    Login user and return JWT
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

module.exports = router;
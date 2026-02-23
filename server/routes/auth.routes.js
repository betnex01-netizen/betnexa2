/**
 * Authentication Routes
 * Handles user login and signup
 */

const express = require('express');
const router = express.Router();
const { supabaseService } = require('../services/supabaseService.js');

/**
 * POST /api/auth/login
 * Login user with phone and password
 */
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }

    // Query Supabase for user by phone
    const user = await supabaseService.getUserByPhone(phone);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check password
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Return user data
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.username,
        email: user.email || '',
        phone: user.phone_number,
        password: user.password,
        username: user.username,
        verified: user.is_verified,
        level: user.role === 'admin' ? 'Admin' : 'Member',
        joinDate: new Date(user.created_at).toLocaleDateString(),
        totalBets: user.total_bets || 0,
        totalWinnings: user.total_winnings || 0,
        accountBalance: parseFloat(user.account_balance) || 0,
        withdrawalActivated: user.withdrawal_activated || false,
        withdrawalActivationDate: user.withdrawal_activation_date,
        isAdmin: user.is_admin || false,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/signup
 * Register new user
 */
router.post('/signup', async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    if (!username || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, phone, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await supabaseService.getUserByPhone(phone);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Create new user
    const newUser = await supabaseService.createUser({
      username,
      email,
      phoneNumber: phone,
      password,
      isAdmin: false,
      isVerified: false,
    });

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.username,
        email: newUser.email || '',
        phone: newUser.phone_number,
        password: newUser.password,
        username: newUser.username,
        verified: false,
        level: 'Member',
        joinDate: new Date().toLocaleDateString(),
        totalBets: 0,
        totalWinnings: 0,
        accountBalance: 0,
        withdrawalActivated: false,
        withdrawalActivationDate: null,
        isAdmin: false,
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Signup failed',
      error: error.message
    });
  }
});

module.exports = router;

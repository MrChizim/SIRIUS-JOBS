/**
 * Authentication Routes
 * Handles user registration, login, and authentication
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/register-worker
 * @desc    Register a new worker (artisan)
 * @access  Public
 */
router.post('/register-worker', authController.register);

/**
 * @route   POST /api/auth/register-employer
 * @desc    Register a new employer
 * @access  Public
 */
router.post('/register-employer', authController.register);

/**
 * @route   POST /api/auth/register-professional
 * @desc    Register a new professional
 * @access  Public
 */
router.post('/register-professional', authController.register);

/**
 * @route   POST /api/auth/register-merchant
 * @desc    Register a new merchant
 * @access  Public
 */
router.post('/register-merchant', authController.register);

/**
 * @route   POST /api/auth/register-client
 * @desc    Register a new client (consultation seeker)
 * @access  Public
 */
router.post('/register-client', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/google
 * @desc    Google Sign-In
 * @access  Public
 */
router.post('/google', authController.googleSignIn);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify user email
 * @access  Public
 */
router.post('/verify-email', authController.verifyEmail);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/extend-role
 * @desc    Extend user account with additional role
 * @access  Private
 */
router.post('/extend-role', authenticate, authController.extendRole);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

export default router;

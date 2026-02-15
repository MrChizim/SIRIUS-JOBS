import { Request, Response } from 'express';
import { ConsultationClient } from '../models/ConsultationClient.model';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';

/**
 * Register a new consultation client (anonymous account)
 * POST /api/consultation/auth/register
 */
export const registerConsultationClient = async (req: any, res: any) => {
  try {
    const { username, password, email, displayName } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Username validation
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 20 characters',
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if username already exists
    const existingClient = await ConsultationClient.findOne({ 
      username: username.toLowerCase() 
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: 'Username already taken. Please choose another.',
      });
    }

    // Check if email exists (if provided)
    if (email) {
      const existingEmail = await ConsultationClient.findOne({ email });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
        });
      }
    }

    // Create new client
    const client = new ConsultationClient({
      username: username.toLowerCase(),
      password,
      email: email || undefined,
      displayName: displayName || username,
      isActive: true,
      isVerified: false,
    });

    await client.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        clientId: client._id,
        username: client.username,
        type: 'consultation_client',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        clientId: client._id,
        username: client.username,
        displayName: client.displayName,
        token,
      },
    });
  } catch (error: any) {
    console.error('Error registering consultation client:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Login consultation client
 * POST /api/consultation/auth/login
 */
export const loginConsultationClient = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Find client
    const client = await ConsultationClient.findOne({ 
      username: username.toLowerCase() 
    });

    if (!client) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Check if account is active
    if (!client.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await client.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
    }

    // Update last login
    client.lastLoginAt = new Date();
    await client.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        clientId: client._id,
        username: client.username,
        type: 'consultation_client',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        clientId: client._id,
        username: client.username,
        displayName: client.displayName,
        avatar: client.avatar,
        totalSessions: client.totalSessions,
        activeSessions: client.activeSessions,
        token,
      },
    });
  } catch (error: any) {
    console.error('Error logging in consultation client:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get client profile
 * GET /api/consultation/auth/profile
 */
export const getConsultationClientProfile = async (req: any, res: any) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Verify token
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.type !== 'consultation_client') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token type',
      });
    }

    // Get client
    const client = await ConsultationClient.findById(decoded.clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        clientId: client._id,
        username: client.username,
        displayName: client.displayName,
        email: client.email,
        avatar: client.avatar,
        totalSessions: client.totalSessions,
        activeSessions: client.activeSessions,
        isVerified: client.isVerified,
        createdAt: client.createdAt,
        lastLoginAt: client.lastLoginAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting client profile:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Update client profile
 * PUT /api/consultation/auth/profile
 */
export const updateConsultationClientProfile = async (req: any, res: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { displayName, email, avatar } = req.body;

    const client = await ConsultationClient.findById(decoded.clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Update fields
    if (displayName !== undefined) client.displayName = displayName;
    if (email !== undefined) client.email = email;
    if (avatar !== undefined) client.avatar = avatar;

    await client.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        clientId: client._id,
        username: client.username,
        displayName: client.displayName,
        email: client.email,
        avatar: client.avatar,
      },
    });
  } catch (error: any) {
    console.error('Error updating client profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Check username availability
 * GET /api/consultation/auth/check-username/:username
 */
export const checkUsernameAvailability = async (req: any, res: any) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid username',
      });
    }

    const existingClient = await ConsultationClient.findOne({ 
      username: username.toLowerCase() 
    });

    return res.status(200).json({
      success: true,
      available: !existingClient,
      message: existingClient 
        ? 'Username is already taken' 
        : 'Username is available',
    });
  } catch (error: any) {
    console.error('Error checking username:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};
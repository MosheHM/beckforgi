import express, { Request, Response } from 'express';
import Joi from 'joi';
import { User } from '@/models/User';
import { generateTokens, verifyRefreshToken, AuthenticatedRequest, authMiddleware } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Register endpoint
router.post('/register', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      error: error.details[0].message,
      field: error.details[0].path[0]
    });
    return;
  }
  
  const { email, password } = value;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409).json({ 
      error: 'User already exists with this email',
      field: 'email'
    });
    return;
  }
  
  try {
    // Create new user
    const user = new User({
      email,
      passwordHash: password // Will be hashed by pre-save middleware
    });
    
    await user.save();
    
    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.email);
    
    res.status(201).json({
      message: 'User registered successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    // Handle database validation errors
    if (error.name === 'ValidationError') {
      const field = Object.keys(error.errors)[0];
      res.status(400).json({
        error: error.errors[field].message,
        field
      });
      return;
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      res.status(409).json({
        error: 'User already exists with this email',
        field: 'email'
      });
      return;
    }
    
    throw error; // Re-throw for global error handler
  }
}));

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      error: error.details[0].message,
      field: error.details[0].path[0]
    });
    return;
  }
  
  const { email, password } = value;
  
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ 
      error: 'Invalid email or password',
      field: 'credentials'
    });
    return;
  }
  
  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    res.status(401).json({ 
      error: 'Invalid email or password',
      field: 'credentials'
    });
    return;
  }
  
  try {
    // Update last login and session info
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate tokens
    const tokens = generateTokens(user._id.toString(), user.email);
    
    res.json({
      message: 'Login successful',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
        settings: user.settings,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    throw error; // Re-throw for global error handler
  }
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const { error, value } = refreshSchema.validate(req.body);
  if (error) {
    res.status(400).json({ 
      error: error.details[0].message,
      field: error.details[0].path[0]
    });
    return;
  }
  
  const { refreshToken } = value;
  
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Verify user still exists and is active
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      res.status(401).json({ 
        error: 'Invalid refresh token. User not found.',
        code: 'USER_NOT_FOUND'
      });
      return;
    }
    
    // Generate new tokens
    const tokens = generateTokens(user._id.toString(), user.email);
    
    res.json({
      message: 'Tokens refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ 
        error: 'Refresh token has expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
      return;
    }
    
    res.status(401).json({ 
      error: 'Invalid or expired refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
}));

// Logout endpoint (protected route)
router.post('/logout', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  // In a production system, you might want to blacklist the token
  // For now, we'll just return a success message
  res.json({
    message: 'Logged out successfully'
  });
}));

// Get current user endpoint (protected route)
router.get('/me', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id).select('-passwordHash');
  
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  
  res.json({
    user: {
      id: user._id,
      email: user.email,
      preferences: user.preferences,
      settings: user.settings,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }
  });
}));

export default router;
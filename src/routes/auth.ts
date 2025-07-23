import express, { Request, Response } from 'express';
import Joi from 'joi';
import { User } from '@/models/User';
import { generateToken } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register endpoint
router.post('/register', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  
  const { email, password } = value;
  
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409).json({ error: 'User already exists with this email' });
    return;
  }
  
  // Create new user
  const user = new User({
    email,
    passwordHash: password // Will be hashed by pre-save middleware
  });
  
  await user.save();
  
  // Generate token
  const token = generateToken(user._id.toString(), user.email);
  
  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user._id,
      email: user.email,
      preferences: user.preferences,
      createdAt: user.createdAt
    }
  });
}));

// Login endpoint
router.post('/login', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  // Validate input
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  
  const { email, password } = value;
  
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  
  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  
  // Update last login
  user.lastLoginAt = new Date();
  await user.save();
  
  // Generate token
  const token = generateToken(user._id.toString(), user.email);
  
  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      email: user.email,
      preferences: user.preferences,
      lastLoginAt: user.lastLoginAt
    }
  });
}));

export default router;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const User_1 = require("@/models/User");
const auth_1 = require("@/middleware/auth");
const errorHandler_1 = require("@/middleware/errorHandler");
const router = express_1.default.Router();
const registerSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
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
const loginSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Password is required'
    })
});
const refreshSchema = joi_1.default.object({
    refreshToken: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Refresh token is required'
    })
});
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        res.status(400).json({
            error: error.details[0].message,
            field: error.details[0].path[0]
        });
        return;
    }
    const { email, password } = value;
    const existingUser = await User_1.User.findOne({ email });
    if (existingUser) {
        res.status(409).json({
            error: 'User already exists with this email',
            field: 'email'
        });
        return;
    }
    try {
        const user = new User_1.User({
            email,
            passwordHash: password
        });
        await user.save();
        const tokens = (0, auth_1.generateTokens)(user._id.toString(), user.email);
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
    }
    catch (error) {
        if (error.name === 'ValidationError') {
            const field = Object.keys(error.errors)[0];
            res.status(400).json({
                error: error.errors[field].message,
                field
            });
            return;
        }
        if (error.code === 11000) {
            res.status(409).json({
                error: 'User already exists with this email',
                field: 'email'
            });
            return;
        }
        throw error;
    }
}));
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        res.status(400).json({
            error: error.details[0].message,
            field: error.details[0].path[0]
        });
        return;
    }
    const { email, password } = value;
    const user = await User_1.User.findOne({ email });
    if (!user) {
        res.status(401).json({
            error: 'Invalid email or password',
            field: 'credentials'
        });
        return;
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        res.status(401).json({
            error: 'Invalid email or password',
            field: 'credentials'
        });
        return;
    }
    try {
        user.lastLoginAt = new Date();
        await user.save();
        const tokens = (0, auth_1.generateTokens)(user._id.toString(), user.email);
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
    }
    catch (error) {
        throw error;
    }
}));
router.post('/refresh', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
        const decoded = (0, auth_1.verifyRefreshToken)(refreshToken);
        const user = await User_1.User.findById(decoded.id).select('-passwordHash');
        if (!user) {
            res.status(401).json({
                error: 'Invalid refresh token. User not found.',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        const tokens = (0, auth_1.generateTokens)(user._id.toString(), user.email);
        res.json({
            message: 'Tokens refreshed successfully',
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    }
    catch (error) {
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
router.post('/logout', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    res.json({
        message: 'Logged out successfully'
    });
}));
router.get('/me', auth_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const user = await User_1.User.findById(req.user?.id).select('-passwordHash');
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
exports.default = router;
//# sourceMappingURL=auth.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = exports.verifyRefreshToken = exports.generateTokens = exports.generateRefreshToken = exports.generateAccessToken = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("@/models/User");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Access denied. No token provided.' });
            return;
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not configured');
            res.status(500).json({ error: 'Server configuration error' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (decoded.type !== 'access') {
            res.status(401).json({ error: 'Invalid token type' });
            return;
        }
        const user = await User_1.User.findById(decoded.id).select('-passwordHash');
        if (!user) {
            res.status(401).json({ error: 'Invalid token. User not found.' });
            return;
        }
        req.user = {
            id: decoded.id,
            email: decoded.email
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Server error during authentication' });
    }
};
exports.authMiddleware = authMiddleware;
const generateAccessToken = (userId, email) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign({ id: userId, email, type: 'access' }, jwtSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (userId, email) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign({ id: userId, email, type: 'refresh' }, jwtSecret, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
};
exports.generateRefreshToken = generateRefreshToken;
const generateTokens = (userId, email) => {
    return {
        accessToken: (0, exports.generateAccessToken)(userId, email),
        refreshToken: (0, exports.generateRefreshToken)(userId, email)
    };
};
exports.generateTokens = generateTokens;
const verifyRefreshToken = (token) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
    if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
    }
    return decoded;
};
exports.verifyRefreshToken = verifyRefreshToken;
const generateToken = (userId, email) => {
    return (0, exports.generateAccessToken)(userId, email);
};
exports.generateToken = generateToken;
//# sourceMappingURL=auth.js.map
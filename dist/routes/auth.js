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
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required()
});
const loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().required()
});
router.post('/register', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
    }
    const { email, password } = value;
    const existingUser = await User_1.User.findOne({ email });
    if (existingUser) {
        res.status(409).json({ error: 'User already exists with this email' });
        return;
    }
    const user = new User_1.User({
        email,
        passwordHash: password
    });
    await user.save();
    const token = (0, auth_1.generateToken)(user._id.toString(), user.email);
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
router.post('/login', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
    }
    const { email, password } = value;
    const user = await User_1.User.findOne({ email });
    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }
    user.lastLoginAt = new Date();
    await user.save();
    const token = (0, auth_1.generateToken)(user._id.toString(), user.email);
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
exports.default = router;
//# sourceMappingURL=auth.js.map
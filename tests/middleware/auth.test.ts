import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { 
  authMiddleware, 
  generateAccessToken, 
  generateRefreshToken, 
  generateTokens, 
  verifyRefreshToken,
  AuthenticatedRequest,
  TokenPayload
} from '../../src/middleware/auth';
import { User } from '../../src/models/User';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('jsonwebtoken');

const mockUser = jest.mocked(User);
const mockJwt = jest.mocked(jwt);

describe('JWT Authentication Service', () => {
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockEmail = 'test@example.com';
  const mockJwtSecret = 'test-secret';
  
  beforeEach(() => {
    process.env.JWT_SECRET = mockJwtSecret;
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ACCESS_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  describe('generateAccessToken', () => {
    it('should generate access token with correct payload', () => {
      const mockToken = 'mock-access-token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const token = generateAccessToken(mockUserId, mockEmail);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: mockUserId, email: mockEmail, type: 'access' },
        mockJwtSecret,
        { expiresIn: '15m' }
      );
      expect(token).toBe(mockToken);
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateAccessToken(mockUserId, mockEmail))
        .toThrow('JWT_SECRET not configured');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct payload', () => {
      const mockToken = 'mock-refresh-token';
      mockJwt.sign.mockReturnValue(mockToken as any);

      const token = generateRefreshToken(mockUserId, mockEmail);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: mockUserId, email: mockEmail, type: 'refresh' },
        mockJwtSecret,
        { expiresIn: '7d' }
      );
      expect(token).toBe(mockToken);
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateRefreshToken(mockUserId, mockEmail))
        .toThrow('JWT_SECRET not configured');
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      
      mockJwt.sign
        .mockReturnValueOnce(mockAccessToken as any)
        .mockReturnValueOnce(mockRefreshToken as any);

      const tokens = generateTokens(mockUserId, mockEmail);

      expect(tokens).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken
      });
      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const mockToken = 'valid-refresh-token';
      const mockPayload: TokenPayload = {
        id: mockUserId,
        email: mockEmail,
        type: 'refresh',
        iat: 1234567890,
        exp: 1234567890 + 7 * 24 * 60 * 60
      };

      mockJwt.verify.mockReturnValue(mockPayload as any);

      const result = verifyRefreshToken(mockToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, mockJwtSecret);
      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token type', () => {
      const mockToken = 'invalid-token';
      const mockPayload: TokenPayload = {
        id: mockUserId,
        email: mockEmail,
        type: 'access', // Wrong type
        iat: 1234567890,
        exp: 1234567890 + 7 * 24 * 60 * 60
      };

      mockJwt.verify.mockReturnValue(mockPayload as any);

      expect(() => verifyRefreshToken(mockToken))
        .toThrow('Invalid token type');
    });

    it('should throw error when JWT_SECRET is not configured', () => {
      delete process.env.JWT_SECRET;

      expect(() => verifyRefreshToken('token'))
        .toThrow('JWT_SECRET not configured');
    });
  });

  describe('authMiddleware', () => {
    let mockReq: Partial<AuthenticatedRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
      mockReq = {
        header: jest.fn()
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    it('should authenticate valid access token', async () => {
      const mockToken = 'valid-access-token';
      const mockPayload: TokenPayload = {
        id: mockUserId,
        email: mockEmail,
        type: 'access'
      };
      const mockUserDoc = {
        _id: mockUserId,
        email: mockEmail,
        preferences: {}
      };

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserDoc)
      } as any);

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith(mockToken, mockJwtSecret);
      expect(mockUser.findById).toHaveBeenCalledWith(mockUserId);
      expect(mockReq.user).toEqual({
        id: mockUserId,
        email: mockEmail
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      (mockReq.header as jest.Mock).mockReturnValue(undefined);

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject refresh token', async () => {
      const mockToken = 'refresh-token';
      const mockPayload: TokenPayload = {
        id: mockUserId,
        email: mockEmail,
        type: 'refresh' // Wrong type for auth middleware
      };

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);
      mockJwt.verify.mockReturnValue(mockPayload as any);

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token type'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      const mockToken = 'expired-token';
      const expiredError = new jwt.TokenExpiredError('Token expired', new Date());

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle invalid token', async () => {
      const mockToken = 'invalid-token';
      const invalidError = new jwt.JsonWebTokenError('Invalid token');

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);
      mockJwt.verify.mockImplementation(() => {
        throw invalidError;
      });

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const mockToken = 'valid-token';
      const mockPayload: TokenPayload = {
        id: mockUserId,
        email: mockEmail,
        type: 'access'
      };

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);
      mockJwt.verify.mockReturnValue(mockPayload as any);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      } as any);

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token. User not found.'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle server configuration error', async () => {
      delete process.env.JWT_SECRET;
      const mockToken = 'valid-token';

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server configuration error'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      const mockToken = 'valid-token';
      const unexpectedError = new Error('Unexpected error');

      (mockReq.header as jest.Mock).mockReturnValue(`Bearer ${mockToken}`);
      mockJwt.verify.mockImplementation(() => {
        throw unexpectedError;
      });

      await authMiddleware(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server error during authentication'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
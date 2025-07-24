import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}
export interface TokenPayload {
    id: string;
    email: string;
    type: 'access' | 'refresh';
    iat?: number;
    exp?: number;
}
export declare const authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const generateAccessToken: (userId: string, email: string) => string;
export declare const generateRefreshToken: (userId: string, email: string) => string;
export declare const generateTokens: (userId: string, email: string) => {
    accessToken: string;
    refreshToken: string;
};
export declare const verifyRefreshToken: (token: string) => TokenPayload;
export declare const generateToken: (userId: string, email: string) => string;
//# sourceMappingURL=auth.d.ts.map
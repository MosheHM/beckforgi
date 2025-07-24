import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import { getAIService } from '@/services/ai';
import authRoutes from '@/routes/auth';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'OK', // This could be enhanced to actually check DB connection
      ai: 'UNKNOWN'
    }
  };

  // Check AI service health
  try {
    const aiService = getAIService();
    const isAIHealthy = await aiService.healthCheck();
    healthStatus.services.ai = isAIHealthy ? 'OK' : 'DEGRADED';
  } catch (error) {
    healthStatus.services.ai = 'UNAVAILABLE';
  }

  // Determine overall status
  const allServicesOK = Object.values(healthStatus.services).every(status => status === 'OK');
  if (!allServicesOK) {
    healthStatus.status = 'DEGRADED';
  }

  res.status(200).json(healthStatus);
});

// AI service status endpoint
app.get('/health/ai', async (req, res) => {
  try {
    const aiService = getAIService();
    const isHealthy = await aiService.healthCheck();
    const rateLimitInfo = aiService.getRateLimitInfo();
    const costTracking = aiService.getCostTracking();

    res.status(200).json({
      status: isHealthy ? 'OK' : 'DEGRADED',
      healthy: isHealthy,
      rateLimit: {
        requestsPerMinute: rateLimitInfo.requestsPerMinute,
        tokensPerMinute: rateLimitInfo.tokensPerMinute,
        currentRequests: rateLimitInfo.currentRequests,
        currentTokens: rateLimitInfo.currentTokens,
        resetTime: rateLimitInfo.resetTime
      },
      usage: {
        totalCost: costTracking.totalCost,
        requestCount: costTracking.requestCount,
        tokenCount: costTracking.tokenCount,
        lastUpdated: costTracking.lastUpdated
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'UNAVAILABLE',
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);

// Protected routes (require authentication)
app.use('/api', authMiddleware);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
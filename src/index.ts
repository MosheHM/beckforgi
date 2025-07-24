import dotenv from 'dotenv';
import { connectDatabase } from '@/config/database';
import { AIService } from '@/services/ai';
import app from '@/app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize AI service
    try {
      AIService.initialize();
      console.log('🤖 AI service initialized successfully');
    } catch (error) {
      console.warn('⚠️  AI service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
      console.warn('   AI features will be unavailable');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("@/config/database");
const ai_1 = require("@/services/ai");
const app_1 = __importDefault(require("@/app"));
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    try {
        await (0, database_1.connectDatabase)();
        try {
            ai_1.AIService.initialize();
            console.log('🤖 AI service initialized successfully');
        }
        catch (error) {
            console.warn('⚠️  AI service initialization failed:', error instanceof Error ? error.message : 'Unknown error');
            console.warn('   AI features will be unavailable');
        }
        app_1.default.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Health check available at http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map
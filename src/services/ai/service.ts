import { AIServiceClient } from './client';
import { AIServiceConfig } from './types';

export class AIService {
  private static instance: AIServiceClient | null = null;
  private static config: AIServiceConfig | null = null;

  static initialize(config: Partial<AIServiceConfig> = {}): void {
    const defaultConfig: AIServiceConfig = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
      timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
      maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.OPENAI_RETRY_DELAY || '1000')
    };

    this.config = { ...defaultConfig, ...config };
    
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    this.instance = new AIServiceClient(this.config);
  }

  static getInstance(): AIServiceClient {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance!;
  }

  static getConfig(): AIServiceConfig | null {
    return this.config;
  }

  static reset(): void {
    this.instance = null;
    this.config = null;
  }
}

// Export singleton instance getter
export const getAIService = (): AIServiceClient => AIService.getInstance();
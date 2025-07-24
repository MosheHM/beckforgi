import { AIService, getAIService } from '../../../src/services/ai/service';
import { AIServiceClient } from '../../../src/services/ai/client';

// Mock the AIServiceClient
jest.mock('../../../src/services/ai/client');
const MockedAIServiceClient = AIServiceClient as jest.MockedClass<typeof AIServiceClient>;

describe('AIService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    AIService.reset();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initialize', () => {
    it('should initialize with default configuration from environment variables', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_MODEL = 'gpt-4';
      process.env.OPENAI_MAX_TOKENS = '1500';
      process.env.OPENAI_TEMPERATURE = '0.5';
      process.env.OPENAI_TIMEOUT = '30000';
      process.env.OPENAI_MAX_RETRIES = '5';
      process.env.OPENAI_RETRY_DELAY = '2000';

      AIService.initialize();

      expect(MockedAIServiceClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'gpt-4',
        maxTokens: 1500,
        temperature: 0.5,
        timeout: 30000,
        maxRetries: 5,
        retryDelay: 2000
      });
    });

    it('should use default values when environment variables are not set', () => {
      process.env.OPENAI_API_KEY = 'test-key';

      AIService.initialize();

      expect(MockedAIServiceClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 60000,
        maxRetries: 3,
        retryDelay: 1000
      });
    });

    it('should override defaults with provided configuration', () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const customConfig = {
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7
      };

      AIService.initialize(customConfig);

      expect(MockedAIServiceClient).toHaveBeenCalledWith({
        apiKey: 'test-key',
        model: 'gpt-3.5-turbo',
        maxTokens: 1000,
        temperature: 0.7,
        timeout: 60000,
        maxRetries: 3,
        retryDelay: 1000
      });
    });

    it('should throw error when API key is not provided', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => {
        AIService.initialize();
      }).toThrow('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    });
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const instance1 = AIService.getInstance();
      const instance2 = AIService.getInstance();

      expect(instance1).toBe(instance2);
      expect(MockedAIServiceClient).toHaveBeenCalledTimes(1);
    });

    it('should initialize automatically if not already initialized', () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const instance = AIService.getInstance();

      expect(instance).toBeInstanceOf(AIServiceClient);
      expect(MockedAIServiceClient).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('should return null when not initialized', () => {
      const config = AIService.getConfig();
      expect(config).toBeNull();
    });

    it('should return configuration after initialization', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      AIService.initialize();
      const config = AIService.getConfig();

      expect(config).toEqual({
        apiKey: 'test-key',
        model: 'gpt-4-turbo',
        maxTokens: 2000,
        temperature: 0.3,
        timeout: 60000,
        maxRetries: 3,
        retryDelay: 1000
      });
    });
  });

  describe('reset', () => {
    it('should reset instance and configuration', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      AIService.initialize();
      expect(AIService.getConfig()).not.toBeNull();

      AIService.reset();
      expect(AIService.getConfig()).toBeNull();

      // Should create new instance after reset
      const newInstance = AIService.getInstance();
      expect(MockedAIServiceClient).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAIService', () => {
    it('should return the singleton instance', () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const instance1 = getAIService();
      const instance2 = getAIService();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(AIServiceClient);
    });
  });
});
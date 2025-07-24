import { AIServiceClient } from '../../../src/services/ai/client';
import { AIServiceConfig, GenerationTask } from '../../../src/services/ai/types';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('AIServiceClient', () => {
  let client: AIServiceClient;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockChatCompletions: jest.Mocked<OpenAI.Chat.Completions>;

  const defaultConfig: AIServiceConfig = {
    apiKey: 'test-api-key',
    model: 'gpt-4-turbo',
    maxTokens: 2000,
    temperature: 0.3,
    timeout: 60000,
    maxRetries: 3,
    retryDelay: 1000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockChatCompletions = {
      create: jest.fn()
    } as any;

    mockOpenAI = {
      chat: {
        completions: mockChatCompletions
      }
    } as any;

    MockedOpenAI.mockImplementation(() => mockOpenAI);
    
    client = new AIServiceClient(defaultConfig);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(MockedOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        timeout: 60000
      });
    });

    it('should initialize rate limiting and cost tracking', () => {
      const rateLimitInfo = client.getRateLimitInfo();
      const costTracking = client.getCostTracking();

      expect(rateLimitInfo.requestsPerMinute).toBe(60);
      expect(rateLimitInfo.tokensPerMinute).toBe(150000);
      expect(rateLimitInfo.currentRequests).toBe(0);
      expect(rateLimitInfo.currentTokens).toBe(0);

      expect(costTracking.totalCost).toBe(0);
      expect(costTracking.requestCount).toBe(0);
      expect(costTracking.tokenCount).toBe(0);
    });
  });

  describe('generate', () => {
    const mockResponse = {
      choices: [{
        message: { content: 'Test response' },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      },
      model: 'gpt-4-turbo'
    };

    beforeEach(() => {
      mockChatCompletions.create.mockResolvedValue(mockResponse as any);
    });

    it('should generate response successfully', async () => {
      const request = {
        prompt: 'Test prompt',
        systemMessage: 'Test system message'
      };

      const response = await client.generate(request);

      expect(response).toEqual({
        content: 'Test response',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        model: 'gpt-4-turbo',
        finishReason: 'stop'
      });

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'Test system message' },
          { role: 'user', content: 'Test prompt' }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }, {
        timeout: 60000
      });
    });

    it('should handle request without system message', async () => {
      const request = {
        prompt: 'Test prompt'
      };

      await client.generate(request);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'user', content: 'Test prompt' }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }, {
        timeout: 60000
      });
    });

    it('should update cost tracking after successful request', async () => {
      const request = { prompt: 'Test prompt' };
      
      await client.generate(request);
      
      const costTracking = client.getCostTracking();
      expect(costTracking.requestCount).toBe(1);
      expect(costTracking.tokenCount).toBe(150);
      expect(costTracking.totalCost).toBeGreaterThan(0);
    });

    it('should retry on retryable errors', async () => {
      const rateLimitError = new Error('rate limit exceeded');
      mockChatCompletions.create
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(mockResponse as any);

      const request = { prompt: 'Test prompt' };
      
      const response = await client.generate(request);
      
      expect(response.content).toBe('Test response');
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      const serverError = new Error('server_error');
      mockChatCompletions.create.mockRejectedValue(serverError);

      const request = { prompt: 'short' }; // Short prompt to avoid rate limiting issues
      
      await expect(client.generate(request)).rejects.toMatchObject({
        message: 'server_error',
        code: 'SERVER_ERROR',
        retryable: true
      });
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const apiKeyError = new Error('invalid_api_key');
      mockChatCompletions.create.mockRejectedValue(apiKeyError);

      const request = { prompt: 'short' };
      
      await expect(client.generate(request)).rejects.toMatchObject({
        message: 'invalid_api_key',
        code: 'INVALID_API_KEY',
        retryable: false
      });
      expect(mockChatCompletions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateWithTemplate', () => {
    const mockResponse = {
      choices: [{
        message: { content: 'Analyzed response' },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 100,
        total_tokens: 300
      },
      model: 'gpt-4-turbo'
    };

    beforeEach(() => {
      mockChatCompletions.create.mockResolvedValue(mockResponse as any);
    });

    it('should generate response using template', async () => {
      const variables = {
        description: 'A simple REST API for user management'
      };

      const response = await client.generateWithTemplate(
        GenerationTask.ANALYZE_DESCRIPTION,
        variables
      );

      expect(response.content).toBe('Analyzed response');
      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert backend architect')
            }),
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('A simple REST API for user management')
            })
          ])
        }),
        expect.objectContaining({
          timeout: 60000
        })
      );
    });

    it('should override template options when provided', async () => {
      const variables = { description: 'Test description' };
      const options = {
        maxTokens: 1000,
        temperature: 0.7
      };

      await client.generateWithTemplate(
        GenerationTask.ANALYZE_DESCRIPTION,
        variables,
        options
      );

      expect(mockChatCompletions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
          temperature: 0.7
        }),
        expect.objectContaining({
          timeout: 60000
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('should track request count and tokens', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
        model: 'gpt-4-turbo'
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      await client.generate({ prompt: 'Test prompt' });

      const rateLimitInfo = client.getRateLimitInfo();
      expect(rateLimitInfo.currentRequests).toBe(1);
      expect(rateLimitInfo.currentTokens).toBeGreaterThan(0);
    });
  });

  describe('healthCheck', () => {
    it('should return true when service is healthy', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: 'gpt-4-turbo'
      };

      mockChatCompletions.create.mockResolvedValue(mockResponse as any);

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return false when service is unhealthy', async () => {
      mockChatCompletions.create.mockRejectedValue(new Error('Service unavailable'));

      const isHealthy = await client.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('cost tracking', () => {
    it('should reset cost tracking', () => {
      client.resetCostTracking();
      
      const costTracking = client.getCostTracking();
      expect(costTracking.totalCost).toBe(0);
      expect(costTracking.requestCount).toBe(0);
      expect(costTracking.tokenCount).toBe(0);
    });
  });
});
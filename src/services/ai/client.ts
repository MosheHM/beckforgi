import OpenAI from 'openai';
import { 
  AIServiceConfig, 
  AIRequest, 
  AIResponse, 
  RateLimitInfo, 
  CostTrackingInfo, 
  AIServiceError,
  GenerationTask 
} from './types';
import { getPromptTemplate, renderPrompt } from './prompts';

export class AIServiceClient {
  private openai: OpenAI;
  private config: AIServiceConfig;
  private rateLimitInfo: RateLimitInfo;
  private costTracking: CostTrackingInfo;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  // Token costs per 1K tokens (approximate OpenAI pricing)
  private readonly TOKEN_COSTS = {
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
  };

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout
    });

    this.rateLimitInfo = {
      requestsPerMinute: 60, // Default OpenAI limit
      tokensPerMinute: 150000,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: new Date(Date.now() + 60000)
    };

    this.costTracking = {
      totalCost: 0,
      requestCount: 0,
      tokenCount: 0,
      lastUpdated: new Date()
    };
  }

  async generateWithTemplate(
    task: GenerationTask, 
    variables: Record<string, string>,
    options?: Partial<AIRequest>
  ): Promise<AIResponse> {
    const template = getPromptTemplate(task);
    const prompt = renderPrompt(template, variables);
    
    return this.generate({
      prompt,
      systemMessage: template.systemMessage,
      maxTokens: options?.maxTokens || template.maxTokens,
      temperature: options?.temperature || template.temperature
    });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    await this.enforceRateLimit(request);
    
    let lastError: AIServiceError | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request);
        this.updateCostTracking(response);
        return response;
      } catch (error) {
        lastError = this.handleError(error as Error, attempt);
        
        if (!lastError.retryable || attempt === this.config.maxRetries) {
          throw lastError;
        }
        
        await this.delay(this.config.retryDelay * Math.pow(2, attempt - 1));
      }
    }
    
    throw lastError;
  }

  private async makeRequest(request: AIRequest): Promise<AIResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    
    if (request.systemMessage) {
      messages.push({
        role: 'system',
        content: request.systemMessage
      });
    }
    
    messages.push({
      role: 'user',
      content: request.prompt
    });

    const completion = await this.openai.chat.completions.create({
      model: this.config.model,
      messages,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature || this.config.temperature
    }, {
      timeout: this.config.timeout
    });

    const choice = completion.choices[0];
    if (!choice || !choice.message.content) {
      throw new Error('No response content received from AI service');
    }

    return {
      content: choice.message.content,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      model: completion.model,
      finishReason: choice.finish_reason || 'unknown'
    };
  }

  private async enforceRateLimit(request: AIRequest): Promise<void> {
    const now = new Date();
    
    // Reset counters if minute has passed
    if (now >= this.rateLimitInfo.resetTime) {
      this.rateLimitInfo.currentRequests = 0;
      this.rateLimitInfo.currentTokens = 0;
      this.rateLimitInfo.resetTime = new Date(now.getTime() + 60000);
    }

    const estimatedTokens = this.estimateTokens(request.prompt + (request.systemMessage || ''));
    
    // Check if request would exceed limits
    if (this.rateLimitInfo.currentRequests >= this.rateLimitInfo.requestsPerMinute ||
        this.rateLimitInfo.currentTokens + estimatedTokens > this.rateLimitInfo.tokensPerMinute) {
      
      const waitTime = this.rateLimitInfo.resetTime.getTime() - now.getTime();
      if (waitTime > 0) {
        await this.delay(waitTime);
        return this.enforceRateLimit(request);
      }
    }

    this.rateLimitInfo.currentRequests++;
    this.rateLimitInfo.currentTokens += estimatedTokens;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private updateCostTracking(response: AIResponse): void {
    const modelCosts = this.TOKEN_COSTS[this.config.model as keyof typeof this.TOKEN_COSTS];
    if (!modelCosts) return;

    const inputCost = (response.usage.promptTokens / 1000) * modelCosts.input;
    const outputCost = (response.usage.completionTokens / 1000) * modelCosts.output;
    const totalCost = inputCost + outputCost;

    this.costTracking.totalCost += totalCost;
    this.costTracking.requestCount++;
    this.costTracking.tokenCount += response.usage.totalTokens;
    this.costTracking.lastUpdated = new Date();
  }

  private handleError(error: Error, attempt: number): AIServiceError {
    const aiError: AIServiceError = {
      name: 'AIServiceError',
      message: error.message,
      code: 'UNKNOWN_ERROR',
      retryable: false,
      rateLimited: false,
      costExceeded: false
    };

    if (error.message.includes('rate limit')) {
      aiError.code = 'RATE_LIMITED';
      aiError.retryable = true;
      aiError.rateLimited = true;
    } else if (error.message.includes('timeout')) {
      aiError.code = 'TIMEOUT';
      aiError.retryable = attempt < this.config.maxRetries;
    } else if (error.message.includes('insufficient_quota')) {
      aiError.code = 'QUOTA_EXCEEDED';
      aiError.retryable = false;
      aiError.costExceeded = true;
    } else if (error.message.includes('invalid_api_key')) {
      aiError.code = 'INVALID_API_KEY';
      aiError.retryable = false;
    } else if (error.message.includes('model_not_found')) {
      aiError.code = 'MODEL_NOT_FOUND';
      aiError.retryable = false;
    } else if (error.message.includes('server_error') || error.message.includes('502') || error.message.includes('503')) {
      aiError.code = 'SERVER_ERROR';
      aiError.retryable = true;
    }

    return aiError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods for monitoring
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  getCostTracking(): CostTrackingInfo {
    return { ...this.costTracking };
  }

  resetCostTracking(): void {
    this.costTracking = {
      totalCost: 0,
      requestCount: 0,
      tokenCount: 0,
      lastUpdated: new Date()
    };
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generate({
        prompt: 'Hello, please respond with "OK"',
        maxTokens: 10,
        temperature: 0
      });
      return response.content.trim().toLowerCase().includes('ok');
    } catch (error) {
      return false;
    }
  }
}
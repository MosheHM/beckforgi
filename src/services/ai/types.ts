export interface AIServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface AIRequest {
  prompt: string;
  systemMessage?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface RateLimitInfo {
  requestsPerMinute: number;
  tokensPerMinute: number;
  currentRequests: number;
  currentTokens: number;
  resetTime: Date;
}

export interface CostTrackingInfo {
  totalCost: number;
  requestCount: number;
  tokenCount: number;
  lastUpdated: Date;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemMessage: string;
  userPromptTemplate: string;
  variables: string[];
  maxTokens: number;
  temperature: number;
}

export enum GenerationTask {
  ANALYZE_DESCRIPTION = 'analyze_description',
  RECOMMEND_TECH_STACK = 'recommend_tech_stack',
  GENERATE_CODE = 'generate_code',
  GENERATE_TESTS = 'generate_tests',
  FIX_ISSUES = 'fix_issues',
  GENERATE_DOCUMENTATION = 'generate_documentation'
}

export interface AIServiceError extends Error {
  code: string;
  statusCode?: number;
  retryable: boolean;
  rateLimited?: boolean;
  costExceeded?: boolean;
}
import { DescriptionAnalysisService, AnalysisResult, TechStackRecommendation } from '../../../src/services/ai/analysis';
import { GenerationTask, AIResponse } from '../../../src/services/ai/types';
import { AIServiceClient } from '../../../src/services/ai/client';

describe('DescriptionAnalysisService', () => {
  let analysisService: DescriptionAnalysisService;
  let mockAIService: jest.Mocked<AIServiceClient>;

  const createMockAIResponse = (content: string): AIResponse => ({
    content,
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300
    },
    model: 'gpt-4-turbo',
    finishReason: 'stop'
  });

  beforeAll(() => {
    // Set environment variable to avoid initialization errors
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterAll(() => {
    // Clean up environment variable
    delete process.env.OPENAI_API_KEY;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAIService = {
      generateWithTemplate: jest.fn(),
      generate: jest.fn(),
      getRateLimitInfo: jest.fn(),
      getCostTracking: jest.fn(),
      resetCostTracking: jest.fn(),
      healthCheck: jest.fn()
    } as any;
    
    analysisService = new DescriptionAnalysisService(mockAIService);
  });

  describe('analyzeDescription', () => {
    it('should successfully analyze a simple e-commerce description', async () => {
      const description = 'I need a backend for an e-commerce store with user authentication, product catalog, and shopping cart';
      
      const mockResponse = createMockAIResponse(JSON.stringify({
        functionality: ['user authentication', 'product catalog', 'shopping cart', 'order management'],
        dataModels: [
          { name: 'User', fields: ['email', 'password', 'profile'], relationships: ['Order'] },
          { name: 'Product', fields: ['name', 'price', 'description', 'inventory'], relationships: ['Category'] },
          { name: 'Order', fields: ['userId', 'products', 'total', 'status'], relationships: ['User', 'Product'] }
        ],
        apiEndpoints: [
          { method: 'POST', path: '/api/auth/login', description: 'User login' },
          { method: 'GET', path: '/api/products', description: 'Get product catalog' },
          { method: 'POST', path: '/api/cart/add', description: 'Add item to cart' }
        ],
        authentication: { required: true, type: 'JWT' },
        database: { type: 'PostgreSQL', reasoning: 'ACID compliance for financial transactions' },
        integrations: ['payment gateway', 'email service'],
        performance: ['caching for product catalog', 'database indexing'],
        security: ['input validation', 'SQL injection prevention', 'rate limiting'],
        clarificationQuestions: ['Which payment providers do you want to support?']
      }));

      mockAIService.generateWithTemplate!.mockResolvedValue(mockResponse);

      const result = await analysisService.analyzeDescription(description);

      expect(mockAIService.generateWithTemplate).toHaveBeenCalledWith(
        GenerationTask.ANALYZE_DESCRIPTION,
        { description }
      );

      expect(result).toEqual({
        functionality: ['user authentication', 'product catalog', 'shopping cart', 'order management'],
        dataModels: [
          { name: 'User', fields: ['email', 'password', 'profile'], relationships: ['Order'] },
          { name: 'Product', fields: ['name', 'price', 'description', 'inventory'], relationships: ['Category'] },
          { name: 'Order', fields: ['userId', 'products', 'total', 'status'], relationships: ['User', 'Product'] }
        ],
        apiEndpoints: [
          { method: 'POST', path: '/api/auth/login', description: 'User login' },
          { method: 'GET', path: '/api/products', description: 'Get product catalog' },
          { method: 'POST', path: '/api/cart/add', description: 'Add item to cart' }
        ],
        authentication: { required: true, type: 'JWT' },
        database: { type: 'PostgreSQL', reasoning: 'ACID compliance for financial transactions' },
        integrations: ['payment gateway', 'email service'],
        performance: ['caching for product catalog', 'database indexing'],
        security: ['input validation', 'SQL injection prevention', 'rate limiting'],
        clarificationQuestions: ['Which payment providers do you want to support?']
      });
    });

    it('should handle malformed AI response gracefully', async () => {
      const description = 'Simple blog backend';
      
      const mockResponse = createMockAIResponse('This is not valid JSON response');

      mockAIService.generateWithTemplate!.mockResolvedValue(mockResponse);

      await expect(analysisService.analyzeDescription(description))
        .rejects.toThrow('Failed to analyze description');
    });

    it('should validate and sanitize incomplete analysis results', async () => {
      const description = 'Blog backend';
      
      const mockResponse = createMockAIResponse(JSON.stringify({
        functionality: ['blog posts'],
        // Missing required fields
        authentication: { required: true },
        database: { type: 'MongoDB' }
      }));

      mockAIService.generateWithTemplate!.mockResolvedValue(mockResponse);

      const result = await analysisService.analyzeDescription(description);

      expect(result).toEqual({
        functionality: ['blog posts'],
        dataModels: [],
        apiEndpoints: [],
        authentication: { required: true, type: 'JWT' },
        database: { type: 'MongoDB', reasoning: '' },
        integrations: [],
        performance: [],
        security: [],
        clarificationQuestions: []
      });
    });

    it('should handle AI service errors', async () => {
      const description = 'Test backend';
      
      mockAIService.generateWithTemplate.mockRejectedValue(new Error('AI service unavailable'));

      await expect(analysisService.analyzeDescription(description))
        .rejects.toThrow('Failed to analyze description: AI service unavailable');
    });
  });

  describe('recommendTechStack', () => {
    const mockAnalysisResult: AnalysisResult = {
      functionality: ['user auth', 'data storage', 'API endpoints'],
      dataModels: [{ name: 'User', fields: ['email'], relationships: [] }],
      apiEndpoints: [{ method: 'GET', path: '/api/users', description: 'Get users' }],
      authentication: { required: true, type: 'JWT' },
      database: { type: 'PostgreSQL', reasoning: 'ACID compliance' },
      integrations: [],
      performance: [],
      security: ['input validation'],
      clarificationQuestions: []
    };

    it('should generate tech stack recommendations successfully', async () => {
      const mockResponse = createMockAIResponse(JSON.stringify({
        recommendations: [
          {
            rank: 1,
            score: 95,
            language: 'TypeScript',
            framework: 'Express.js',
            database: 'PostgreSQL',
            additionalTools: ['Redis', 'Docker'],
            pros: ['Type safety', 'Large ecosystem'],
            cons: ['Learning curve'],
            reasoning: 'Best for scalable web APIs',
            complexity: 'medium',
            learningCurve: 'low',
            scalability: 'high',
            communitySupport: 'excellent'
          },
          {
            rank: 2,
            score: 88,
            language: 'Python',
            framework: 'FastAPI',
            database: 'PostgreSQL',
            additionalTools: ['Redis', 'Celery'],
            pros: ['Fast development', 'Great documentation'],
            cons: ['Performance limitations'],
            reasoning: 'Rapid prototyping and development',
            complexity: 'low',
            learningCurve: 'low',
            scalability: 'medium',
            communitySupport: 'excellent'
          }
        ]
      }));

      mockAIService.generateWithTemplate!.mockResolvedValue(mockResponse);

      const result = await analysisService.recommendTechStack({
        requirements: mockAnalysisResult,
        scale: 'medium'
      });

      expect(mockAIService.generateWithTemplate).toHaveBeenCalledWith(
        GenerationTask.RECOMMEND_TECH_STACK,
        {
          requirements: JSON.stringify(mockAnalysisResult),
          preferences: JSON.stringify({}),
          scale: 'medium'
        }
      );

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0]).toEqual({
        rank: 1,
        score: 95,
        language: 'TypeScript',
        framework: 'Express.js',
        database: 'PostgreSQL',
        additionalTools: ['Redis', 'Docker'],
        pros: ['Type safety', 'Large ecosystem'],
        cons: ['Learning curve'],
        reasoning: 'Best for scalable web APIs',
        complexity: 'medium',
        learningCurve: 'low',
        scalability: 'high',
        communitySupport: 'excellent'
      });
    });

    it('should handle preferences in tech stack recommendations', async () => {
      const preferences = {
        language: 'Python',
        database: 'MongoDB'
      };

      const mockResponse = createMockAIResponse(JSON.stringify({
        recommendations: [{
          rank: 1,
          score: 90,
          language: 'Python',
          framework: 'FastAPI',
          database: 'MongoDB',
          additionalTools: [],
          pros: ['Matches preferences'],
          cons: [],
          reasoning: 'User preferred stack',
          complexity: 'low',
          learningCurve: 'low',
          scalability: 'medium',
          communitySupport: 'good'
        }]
      }));

      mockAIService.generateWithTemplate!.mockResolvedValue(mockResponse);

      const result = await analysisService.recommendTechStack({
        requirements: mockAnalysisResult,
        preferences,
        scale: 'small'
      });

      expect(mockAIService.generateWithTemplate).toHaveBeenCalledWith(
        GenerationTask.RECOMMEND_TECH_STACK,
        {
          requirements: JSON.stringify(mockAnalysisResult),
          preferences: JSON.stringify(preferences),
          scale: 'small'
        }
      );

      expect(result.recommendations[0].language).toBe('Python');
      expect(result.recommendations[0].database).toBe('MongoDB');
    });

    it('should handle malformed tech stack response', async () => {
      const mockResponse = createMockAIResponse('Invalid JSON response');
      
      mockAIService.generateWithTemplate!.mockResolvedValue(mockResponse);

      await expect(analysisService.recommendTechStack({
        requirements: mockAnalysisResult
      })).rejects.toThrow('Failed to generate tech stack recommendations');
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate contextual questions for minimal analysis', async () => {
      const minimalAnalysis: AnalysisResult = {
        functionality: [],
        dataModels: [],
        apiEndpoints: [],
        authentication: { required: false, type: 'JWT' },
        database: { type: '', reasoning: '' },
        integrations: [],
        performance: [],
        security: [],
        clarificationQuestions: ['What is your target audience?']
      };

      const questions = analysisService.generateClarificationQuestions(minimalAnalysis);

      expect(questions).toContain('What is your target audience?');
      expect(questions).toContain('What is the main purpose of your backend application?');
      expect(questions).toContain('What kind of data will your application store and manage?');
      expect(questions).toContain('What API endpoints do you need for your frontend or external integrations?');
      expect(questions).toContain('Do you have any preferences for the database type (SQL vs NoSQL)?');
    });

    it('should suggest authentication questions when users are mentioned', async () => {
      const analysisWithUsers: AnalysisResult = {
        functionality: ['user registration', 'user profiles'],
        dataModels: [],
        apiEndpoints: [],
        authentication: { required: false, type: 'JWT' },
        database: { type: 'PostgreSQL', reasoning: 'ACID compliance' },
        integrations: [],
        performance: [],
        security: [],
        clarificationQuestions: []
      };

      const questions = analysisService.generateClarificationQuestions(analysisWithUsers);

      expect(questions).toContain('Do you need user authentication and authorization?');
    });

    it('should suggest performance questions for complex applications', async () => {
      const complexAnalysis: AnalysisResult = {
        functionality: ['auth', 'users', 'products', 'orders', 'payments', 'notifications', 'analytics'],
        dataModels: [],
        apiEndpoints: [],
        authentication: { required: true, type: 'JWT' },
        database: { type: 'PostgreSQL', reasoning: 'ACID compliance' },
        integrations: [],
        performance: [],
        security: [],
        clarificationQuestions: []
      };

      const questions = analysisService.generateClarificationQuestions(complexAnalysis);

      expect(questions).toContain('Are there any specific performance requirements or expected load?');
    });

    it('should suggest integration questions for payment/email functionality', async () => {
      const paymentAnalysis: AnalysisResult = {
        functionality: ['payment processing', 'email notifications'],
        dataModels: [],
        apiEndpoints: [],
        authentication: { required: true, type: 'JWT' },
        database: { type: 'PostgreSQL', reasoning: 'ACID compliance' },
        integrations: [],
        performance: [],
        security: [],
        clarificationQuestions: []
      };

      const questions = analysisService.generateClarificationQuestions(paymentAnalysis);

      expect(questions).toContain('Do you need to integrate with any third-party services?');
    });

    it('should remove duplicate questions', async () => {
      const analysis: AnalysisResult = {
        functionality: [],
        dataModels: [],
        apiEndpoints: [],
        authentication: { required: false, type: 'JWT' },
        database: { type: '', reasoning: '' },
        integrations: [],
        performance: [],
        security: [],
        clarificationQuestions: ['What is the main purpose of your backend application?']
      };

      const questions = analysisService.generateClarificationQuestions(analysis);
      const duplicateCount = questions.filter(q => q === 'What is the main purpose of your backend application?').length;

      expect(duplicateCount).toBe(1);
    });
  });

  describe('scoreTechStackRecommendation', () => {
    const mockRequirements: AnalysisResult = {
      functionality: ['auth', 'api', 'database'],
      dataModels: [],
      apiEndpoints: [],
      authentication: { required: true, type: 'JWT' },
      database: { type: 'PostgreSQL', reasoning: 'ACID compliance' },
      integrations: [],
      performance: ['high throughput'],
      security: ['input validation'],
      clarificationQuestions: []
    };

    it('should score popular tech stacks higher', async () => {
      const typeScriptRec: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'TypeScript',
        framework: 'Express.js',
        database: 'PostgreSQL',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'medium',
        learningCurve: 'low',
        scalability: 'high',
        communitySupport: 'excellent'
      };

      const obscureRec: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'Obscure Language',
        framework: 'Unknown Framework',
        database: 'Rare Database',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'medium',
        learningCurve: 'low',
        scalability: 'high',
        communitySupport: 'excellent'
      };

      const tsScore = analysisService.scoreTechStackRecommendation(typeScriptRec, mockRequirements);
      const obscureScore = analysisService.scoreTechStackRecommendation(obscureRec, mockRequirements);

      expect(tsScore).toBeGreaterThan(obscureScore);
    });

    it('should give bonus points for matching preferences', async () => {
      const recommendation: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'Python',
        framework: 'FastAPI',
        database: 'MongoDB',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'medium',
        learningCurve: 'low',
        scalability: 'high',
        communitySupport: 'excellent'
      };

      const preferences = {
        language: 'Python',
        framework: 'FastAPI',
        database: 'MongoDB'
      };

      const scoreWithPreferences = analysisService.scoreTechStackRecommendation(
        recommendation, 
        mockRequirements, 
        preferences
      );

      const scoreWithoutPreferences = analysisService.scoreTechStackRecommendation(
        recommendation, 
        mockRequirements
      );

      expect(scoreWithPreferences).toBeGreaterThan(scoreWithoutPreferences);
    });

    it('should consider complexity appropriately for project size', async () => {
      const simpleRequirements: AnalysisResult = {
        ...mockRequirements,
        functionality: ['simple api', 'basic auth']
      };

      const complexRequirements: AnalysisResult = {
        ...mockRequirements,
        functionality: Array(15).fill('complex feature')
      };

      const lowComplexityRec: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'JavaScript',
        framework: 'Express.js',
        database: 'MongoDB',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'low',
        learningCurve: 'low',
        scalability: 'medium',
        communitySupport: 'good'
      };

      const highComplexityRec: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'Java',
        framework: 'Spring Boot',
        database: 'PostgreSQL',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'high',
        learningCurve: 'high',
        scalability: 'high',
        communitySupport: 'excellent'
      };

      const simpleProjectLowComplexity = analysisService.scoreTechStackRecommendation(
        lowComplexityRec, 
        simpleRequirements
      );
      const complexProjectHighComplexity = analysisService.scoreTechStackRecommendation(
        highComplexityRec, 
        complexRequirements
      );

      expect(simpleProjectLowComplexity).toBeGreaterThan(0);
      expect(complexProjectHighComplexity).toBeGreaterThan(0);
    });

    it('should boost scalable solutions for performance-critical projects', async () => {
      const performanceRequirements: AnalysisResult = {
        ...mockRequirements,
        functionality: Array(10).fill('feature'),
        performance: ['high throughput', 'low latency', 'scalability']
      };

      const highScalabilityRec: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'Go',
        framework: 'Gin',
        database: 'PostgreSQL',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'medium',
        learningCurve: 'medium',
        scalability: 'high',
        communitySupport: 'good'
      };

      const lowScalabilityRec: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'Python',
        framework: 'Flask',
        database: 'SQLite',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'low',
        learningCurve: 'low',
        scalability: 'low',
        communitySupport: 'good'
      };

      const highScalabilityScore = analysisService.scoreTechStackRecommendation(
        highScalabilityRec, 
        performanceRequirements
      );
      const lowScalabilityScore = analysisService.scoreTechStackRecommendation(
        lowScalabilityRec, 
        performanceRequirements
      );

      expect(highScalabilityScore).toBeGreaterThan(lowScalabilityScore);
    });

    it('should return scores within valid range (0-100)', async () => {
      const recommendation: Omit<TechStackRecommendation, 'score' | 'rank'> = {
        language: 'TypeScript',
        framework: 'Express.js',
        database: 'PostgreSQL',
        additionalTools: [],
        pros: [],
        cons: [],
        reasoning: '',
        complexity: 'medium',
        learningCurve: 'low',
        scalability: 'high',
        communitySupport: 'excellent'
      };

      const score = analysisService.scoreTechStackRecommendation(recommendation, mockRequirements);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});
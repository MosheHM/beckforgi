import { getAIService } from './service';
import { GenerationTask, AIResponse } from './types';
import { AIServiceClient } from './client';

export interface TechStack {
  language: string;
  framework: string;
  database: string;
  additionalTools: string[];
}

export interface TechStackRecommendation {
  rank: number;
  score: number;
  language: string;
  framework: string;
  database: string;
  additionalTools: string[];
  pros: string[];
  cons: string[];
  reasoning: string;
  complexity: 'low' | 'medium' | 'high';
  learningCurve: 'low' | 'medium' | 'high';
  scalability: 'low' | 'medium' | 'high';
  communitySupport: 'poor' | 'fair' | 'good' | 'excellent';
}

export interface DataModel {
  name: string;
  fields: string[];
  relationships: string[];
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
}

export interface AuthenticationRequirement {
  required: boolean;
  type: string;
}

export interface DatabaseRequirement {
  type: string;
  reasoning: string;
}

export interface AnalysisResult {
  functionality: string[];
  dataModels: DataModel[];
  apiEndpoints: APIEndpoint[];
  authentication: AuthenticationRequirement;
  database: DatabaseRequirement;
  integrations: string[];
  performance: string[];
  security: string[];
  clarificationQuestions: string[];
}

export interface TechStackRecommendationRequest {
  requirements: AnalysisResult;
  preferences?: Partial<TechStack>;
  scale?: 'small' | 'medium' | 'large' | 'enterprise';
}

export interface TechStackRecommendationResult {
  recommendations: TechStackRecommendation[];
}

export class DescriptionAnalysisService {
  private aiService: AIServiceClient;

  constructor(aiService?: AIServiceClient) {
    this.aiService = aiService || getAIService();
  }

  /**
   * Analyze a natural language description to extract structured requirements
   */
  async analyzeDescription(description: string): Promise<AnalysisResult> {
    try {
      const response = await this.aiService.generateWithTemplate(
        GenerationTask.ANALYZE_DESCRIPTION,
        { description }
      );

      const analysisResult = this.parseAnalysisResponse(response.content);
      return this.validateAnalysisResult(analysisResult);
    } catch (error) {
      throw new Error(`Failed to analyze description: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate tech stack recommendations based on analyzed requirements
   */
  async recommendTechStack(request: TechStackRecommendationRequest): Promise<TechStackRecommendationResult> {
    try {
      const response = await this.aiService.generateWithTemplate(
        GenerationTask.RECOMMEND_TECH_STACK,
        {
          requirements: JSON.stringify(request.requirements),
          preferences: JSON.stringify(request.preferences || {}),
          scale: request.scale || 'medium'
        }
      );

      const recommendations = this.parseTechStackResponse(response.content);
      return this.validateTechStackRecommendations(recommendations);
    } catch (error) {
      throw new Error(`Failed to generate tech stack recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate clarification questions for ambiguous requirements
   */
  generateClarificationQuestions(analysis: AnalysisResult): string[] {
    const questions: string[] = [...analysis.clarificationQuestions];

    // Add contextual questions based on analysis
    if (analysis.functionality.length === 0) {
      questions.push("What is the main purpose of your backend application?");
    }

    if (analysis.dataModels.length === 0) {
      questions.push("What kind of data will your application store and manage?");
    }

    if (analysis.apiEndpoints.length === 0) {
      questions.push("What API endpoints do you need for your frontend or external integrations?");
    }

    if (!analysis.authentication.required && analysis.functionality.some(f => 
      f.toLowerCase().includes('user') || f.toLowerCase().includes('account'))) {
      questions.push("Do you need user authentication and authorization?");
    }

    if (analysis.database.type === 'unknown' || !analysis.database.type) {
      questions.push("Do you have any preferences for the database type (SQL vs NoSQL)?");
    }

    if (analysis.performance.length === 0 && analysis.functionality.length > 5) {
      questions.push("Are there any specific performance requirements or expected load?");
    }

    if (analysis.integrations.length === 0 && analysis.functionality.some(f => 
      f.toLowerCase().includes('payment') || f.toLowerCase().includes('email') || f.toLowerCase().includes('notification'))) {
      questions.push("Do you need to integrate with any third-party services?");
    }

    return [...new Set(questions)]; // Remove duplicates
  }

  /**
   * Score tech stack recommendations based on requirements
   */
  scoreTechStackRecommendation(
    recommendation: Omit<TechStackRecommendation, 'score' | 'rank'>,
    requirements: AnalysisResult,
    preferences?: Partial<TechStack>
  ): number {
    let score = 0;

    // Base score for popular, well-supported stacks
    const popularStacks = {
      'TypeScript': 10, 'JavaScript': 8, 'Python': 9, 'Java': 8, 'Go': 7,
      'Express.js': 9, 'FastAPI': 8, 'Spring Boot': 8, 'Gin': 7,
      'PostgreSQL': 9, 'MongoDB': 8, 'MySQL': 7, 'Redis': 8
    };

    score += popularStacks[recommendation.language as keyof typeof popularStacks] || 5;
    score += popularStacks[recommendation.framework as keyof typeof popularStacks] || 5;
    score += popularStacks[recommendation.database as keyof typeof popularStacks] || 5;

    // Preference matching bonus
    if (preferences) {
      if (preferences.language === recommendation.language) score += 15;
      if (preferences.framework === recommendation.framework) score += 15;
      if (preferences.database === recommendation.database) score += 15;
    }

    // Complexity penalty/bonus based on requirements
    const complexityScore = {
      'low': requirements.functionality.length < 5 ? 10 : 0,
      'medium': requirements.functionality.length >= 5 && requirements.functionality.length <= 10 ? 10 : 5,
      'high': requirements.functionality.length > 10 ? 10 : -5
    };
    score += complexityScore[recommendation.complexity];

    // Learning curve consideration
    const learningCurveScore = {
      'low': 10,
      'medium': 5,
      'high': -5
    };
    score += learningCurveScore[recommendation.learningCurve];

    // Scalability bonus for complex projects
    if (requirements.functionality.length > 8 || requirements.performance.length > 0) {
      const scalabilityScore = {
        'low': -10,
        'medium': 0,
        'high': 15
      };
      score += scalabilityScore[recommendation.scalability];
    }

    // Community support bonus
    const communityScore = {
      'poor': -5,
      'fair': 0,
      'good': 5,
      'excellent': 10
    };
    score += communityScore[recommendation.communitySupport];

    // Database type matching
    if (requirements.database.type) {
      const dbTypeMatch = this.matchDatabaseType(recommendation.database, requirements.database.type);
      score += dbTypeMatch ? 10 : -5;
    }

    // Security requirements bonus
    if (requirements.security.length > 0) {
      const secureStacks = ['TypeScript', 'Java', 'Go'];
      if (secureStacks.includes(recommendation.language)) score += 5;
    }

    return Math.max(0, Math.min(100, score)); // Clamp between 0-100
  }

  private parseAnalysisResponse(content: string): AnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as AnalysisResult;
    } catch (error) {
      throw new Error(`Failed to parse analysis response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  private parseTechStackResponse(content: string): TechStackRecommendationResult {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as TechStackRecommendationResult;
    } catch (error) {
      throw new Error(`Failed to parse tech stack response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  private validateAnalysisResult(result: any): AnalysisResult {
    const validated: AnalysisResult = {
      functionality: Array.isArray(result.functionality) ? result.functionality : [],
      dataModels: Array.isArray(result.dataModels) ? result.dataModels.map((model: any) => this.validateDataModel(model)) : [],
      apiEndpoints: Array.isArray(result.apiEndpoints) ? result.apiEndpoints.map((endpoint: any) => this.validateAPIEndpoint(endpoint)) : [],
      authentication: this.validateAuthentication(result.authentication),
      database: this.validateDatabase(result.database),
      integrations: Array.isArray(result.integrations) ? result.integrations : [],
      performance: Array.isArray(result.performance) ? result.performance : [],
      security: Array.isArray(result.security) ? result.security : [],
      clarificationQuestions: Array.isArray(result.clarificationQuestions) ? result.clarificationQuestions : []
    };

    return validated;
  }

  private validateDataModel(model: any): DataModel {
    return {
      name: typeof model.name === 'string' ? model.name : 'Unknown',
      fields: Array.isArray(model.fields) ? model.fields : [],
      relationships: Array.isArray(model.relationships) ? model.relationships : []
    };
  }

  private validateAPIEndpoint(endpoint: any): APIEndpoint {
    return {
      method: typeof endpoint.method === 'string' ? endpoint.method.toUpperCase() : 'GET',
      path: typeof endpoint.path === 'string' ? endpoint.path : '/',
      description: typeof endpoint.description === 'string' ? endpoint.description : ''
    };
  }

  private validateAuthentication(auth: any): AuthenticationRequirement {
    return {
      required: typeof auth?.required === 'boolean' ? auth.required : false,
      type: typeof auth?.type === 'string' ? auth.type : 'JWT'
    };
  }

  private validateDatabase(db: any): DatabaseRequirement {
    return {
      type: typeof db?.type === 'string' ? db.type : 'unknown',
      reasoning: typeof db?.reasoning === 'string' ? db.reasoning : ''
    };
  }

  private validateTechStackRecommendations(result: any): TechStackRecommendationResult {
    const recommendations = Array.isArray(result.recommendations) 
      ? result.recommendations.map((rec: any) => this.validateTechStackRecommendation(rec))
      : [];

    return { recommendations };
  }

  private validateTechStackRecommendation(rec: any): TechStackRecommendation {
    return {
      rank: typeof rec.rank === 'number' ? rec.rank : 1,
      score: typeof rec.score === 'number' ? rec.score : 0,
      language: typeof rec.language === 'string' ? rec.language : 'JavaScript',
      framework: typeof rec.framework === 'string' ? rec.framework : 'Express.js',
      database: typeof rec.database === 'string' ? rec.database : 'MongoDB',
      additionalTools: Array.isArray(rec.additionalTools) ? rec.additionalTools : [],
      pros: Array.isArray(rec.pros) ? rec.pros : [],
      cons: Array.isArray(rec.cons) ? rec.cons : [],
      reasoning: typeof rec.reasoning === 'string' ? rec.reasoning : '',
      complexity: this.validateComplexity(rec.complexity),
      learningCurve: this.validateComplexity(rec.learningCurve),
      scalability: this.validateComplexity(rec.scalability),
      communitySupport: this.validateCommunitySupport(rec.communitySupport)
    };
  }

  private validateComplexity(value: any): 'low' | 'medium' | 'high' {
    return ['low', 'medium', 'high'].includes(value) ? value : 'medium';
  }

  private validateCommunitySupport(value: any): 'poor' | 'fair' | 'good' | 'excellent' {
    return ['poor', 'fair', 'good', 'excellent'].includes(value) ? value : 'good';
  }

  private matchDatabaseType(recommended: string, required: string): boolean {
    const sqlDatabases = ['postgresql', 'mysql', 'sqlite', 'mssql'];
    const nosqlDatabases = ['mongodb', 'cassandra', 'dynamodb', 'couchdb'];
    
    const recommendedLower = recommended.toLowerCase();
    const requiredLower = required.toLowerCase();

    if (requiredLower.includes('sql') && !requiredLower.includes('nosql')) {
      return sqlDatabases.some(db => recommendedLower.includes(db));
    }
    
    if (requiredLower.includes('nosql')) {
      return nosqlDatabases.some(db => recommendedLower.includes(db));
    }

    return recommendedLower.includes(requiredLower) || requiredLower.includes(recommendedLower);
  }
}

// Export singleton instance
export const descriptionAnalysisService = new DescriptionAnalysisService();
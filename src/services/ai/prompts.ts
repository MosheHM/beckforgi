import { PromptTemplate, GenerationTask } from './types';

export const PROMPT_TEMPLATES: Record<GenerationTask, PromptTemplate> = {
  [GenerationTask.ANALYZE_DESCRIPTION]: {
    id: 'analyze_description',
    name: 'Description Analysis',
    description: 'Analyze natural language backend requirements',
    systemMessage: `You are an expert backend architect. Analyze the user's description and extract:
1. Core functionality requirements
2. Data models and relationships
3. API endpoints needed
4. Authentication/authorization needs
5. Database requirements
6. Third-party integrations
7. Performance considerations
8. Security requirements

Respond in JSON format with structured analysis.`,
    userPromptTemplate: `Analyze this backend description and provide structured requirements:

Description: {{description}}

Please provide a JSON response with the following structure:
{
  "functionality": ["requirement1", "requirement2"],
  "dataModels": [{"name": "ModelName", "fields": ["field1", "field2"], "relationships": ["relatedModel"]}],
  "apiEndpoints": [{"method": "GET", "path": "/api/endpoint", "description": "purpose"}],
  "authentication": {"required": true, "type": "JWT"},
  "database": {"type": "suggested_db_type", "reasoning": "why this db"},
  "integrations": ["service1", "service2"],
  "performance": ["consideration1", "consideration2"],
  "security": ["requirement1", "requirement2"],
  "clarificationQuestions": ["question1", "question2"]
}`,
    variables: ['description'],
    maxTokens: 2000,
    temperature: 0.3
  },

  [GenerationTask.RECOMMEND_TECH_STACK]: {
    id: 'recommend_tech_stack',
    name: 'Tech Stack Recommendation',
    description: 'Recommend optimal technology stack based on requirements',
    systemMessage: `You are a senior technical architect with expertise in all major programming languages and frameworks. 
Recommend the best technology stack based on the analyzed requirements, considering:
1. Project complexity and scale
2. Performance requirements
3. Team expertise (if mentioned)
4. Deployment preferences
5. Maintenance considerations
6. Community support and ecosystem

Provide multiple options with pros/cons and scoring.`,
    userPromptTemplate: `Based on these analyzed requirements, recommend the best technology stacks:

Requirements: {{requirements}}
Team Preferences: {{preferences}}
Scale: {{scale}}

Provide 3 ranked recommendations in JSON format:
{
  "recommendations": [
    {
      "rank": 1,
      "score": 95,
      "language": "TypeScript",
      "framework": "Express.js",
      "database": "PostgreSQL",
      "additionalTools": ["Redis", "Docker"],
      "pros": ["reason1", "reason2"],
      "cons": ["limitation1", "limitation2"],
      "reasoning": "detailed explanation",
      "complexity": "medium",
      "learningCurve": "low",
      "scalability": "high",
      "communitySupport": "excellent"
    }
  ]
}`,
    variables: ['requirements', 'preferences', 'scale'],
    maxTokens: 1500,
    temperature: 0.4
  },

  [GenerationTask.GENERATE_CODE]: {
    id: 'generate_code',
    name: 'Code Generation',
    description: 'Generate backend code following TDD principles',
    systemMessage: `You are an expert backend developer who strictly follows Test-Driven Development (TDD).
Generate production-ready code with:
1. Tests written FIRST before implementation
2. Minimal code to pass tests
3. Proper error handling and validation
4. Comprehensive logging
5. Security best practices
6. Clean, maintainable code structure
7. Proper TypeScript typing
8. API documentation

Always start with tests, then implement the minimal code to make them pass.`,
    userPromptTemplate: `Generate {{component}} for this backend project following TDD:

Tech Stack: {{techStack}}
Requirements: {{requirements}}
Component Specification: {{specification}}

Generate in this order:
1. Test files first (*.test.ts)
2. Implementation files
3. Type definitions
4. Documentation

Ensure all code follows best practices and includes proper error handling.`,
    variables: ['component', 'techStack', 'requirements', 'specification'],
    maxTokens: 3000,
    temperature: 0.2
  },

  [GenerationTask.GENERATE_TESTS]: {
    id: 'generate_tests',
    name: 'Test Generation',
    description: 'Generate comprehensive test suites',
    systemMessage: `You are a testing expert who creates comprehensive, maintainable test suites.
Generate tests that cover:
1. Unit tests for individual functions/methods
2. Integration tests for API endpoints
3. Edge cases and error scenarios
4. Mock external dependencies
5. Test data setup and teardown
6. Performance considerations
7. Security testing where applicable

Use Jest and appropriate testing libraries for the tech stack.`,
    userPromptTemplate: `Generate comprehensive tests for:

Code: {{code}}
Tech Stack: {{techStack}}
Requirements: {{requirements}}

Include:
- Unit tests with mocks
- Integration tests
- Error scenario testing
- Test data fixtures
- Setup/teardown logic`,
    variables: ['code', 'techStack', 'requirements'],
    maxTokens: 2500,
    temperature: 0.1
  },

  [GenerationTask.FIX_ISSUES]: {
    id: 'fix_issues',
    name: 'Issue Resolution',
    description: 'Fix code issues and bugs',
    systemMessage: `You are a debugging expert who can quickly identify and fix code issues.
Analyze the problem and provide:
1. Root cause analysis
2. Minimal fix that addresses the issue
3. Prevention strategies
4. Updated tests if needed
5. Documentation updates if required

Focus on surgical fixes that don't break existing functionality.`,
    userPromptTemplate: `Fix this issue in the backend code:

Error/Issue: {{issue}}
Code Context: {{code}}
Stack Trace: {{stackTrace}}
Expected Behavior: {{expectedBehavior}}

Provide:
1. Root cause explanation
2. Fixed code
3. Updated tests
4. Prevention recommendations`,
    variables: ['issue', 'code', 'stackTrace', 'expectedBehavior'],
    maxTokens: 2000,
    temperature: 0.1
  },

  [GenerationTask.GENERATE_DOCUMENTATION]: {
    id: 'generate_documentation',
    name: 'Documentation Generation',
    description: 'Generate comprehensive API and code documentation',
    systemMessage: `You are a technical writer who creates clear, comprehensive documentation.
Generate documentation that includes:
1. API endpoint documentation with examples
2. Data model schemas
3. Authentication flows
4. Error handling guides
5. Setup and deployment instructions
6. Code examples and usage patterns
7. Troubleshooting guides

Use clear, concise language with practical examples.`,
    userPromptTemplate: `Generate documentation for this backend:

Code: {{code}}
API Endpoints: {{endpoints}}
Data Models: {{models}}
Tech Stack: {{techStack}}

Include:
- OpenAPI/Swagger specifications
- Setup instructions
- Usage examples
- Error handling documentation
- Deployment guide`,
    variables: ['code', 'endpoints', 'models', 'techStack'],
    maxTokens: 3000,
    temperature: 0.3
  }
};

export function getPromptTemplate(task: GenerationTask): PromptTemplate {
  return PROMPT_TEMPLATES[task];
}

export function renderPrompt(template: PromptTemplate, variables: Record<string, string>): string {
  let rendered = template.userPromptTemplate;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return rendered;
}
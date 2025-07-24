import { getPromptTemplate, renderPrompt, PROMPT_TEMPLATES } from '../../../src/services/ai/prompts';
import { GenerationTask } from '../../../src/services/ai/types';

describe('Prompts', () => {
  describe('PROMPT_TEMPLATES', () => {
    it('should contain all required generation tasks', () => {
      const expectedTasks = [
        GenerationTask.ANALYZE_DESCRIPTION,
        GenerationTask.RECOMMEND_TECH_STACK,
        GenerationTask.GENERATE_CODE,
        GenerationTask.GENERATE_TESTS,
        GenerationTask.FIX_ISSUES,
        GenerationTask.GENERATE_DOCUMENTATION
      ];

      expectedTasks.forEach(task => {
        expect(PROMPT_TEMPLATES[task]).toBeDefined();
        expect(PROMPT_TEMPLATES[task].id).toBe(task);
      });
    });

    it('should have valid template structure for each task', () => {
      Object.values(PROMPT_TEMPLATES).forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('systemMessage');
        expect(template).toHaveProperty('userPromptTemplate');
        expect(template).toHaveProperty('variables');
        expect(template).toHaveProperty('maxTokens');
        expect(template).toHaveProperty('temperature');

        expect(typeof template.id).toBe('string');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.systemMessage).toBe('string');
        expect(typeof template.userPromptTemplate).toBe('string');
        expect(Array.isArray(template.variables)).toBe(true);
        expect(typeof template.maxTokens).toBe('number');
        expect(typeof template.temperature).toBe('number');
      });
    });
  });

  describe('getPromptTemplate', () => {
    it('should return correct template for analyze description task', () => {
      const template = getPromptTemplate(GenerationTask.ANALYZE_DESCRIPTION);
      
      expect(template.id).toBe('analyze_description');
      expect(template.name).toBe('Description Analysis');
      expect(template.systemMessage).toContain('expert backend architect');
      expect(template.userPromptTemplate).toContain('{{description}}');
      expect(template.variables).toContain('description');
    });

    it('should return correct template for tech stack recommendation task', () => {
      const template = getPromptTemplate(GenerationTask.RECOMMEND_TECH_STACK);
      
      expect(template.id).toBe('recommend_tech_stack');
      expect(template.name).toBe('Tech Stack Recommendation');
      expect(template.systemMessage).toContain('senior technical architect');
      expect(template.userPromptTemplate).toContain('{{requirements}}');
      expect(template.variables).toContain('requirements');
      expect(template.variables).toContain('preferences');
      expect(template.variables).toContain('scale');
    });

    it('should return correct template for code generation task', () => {
      const template = getPromptTemplate(GenerationTask.GENERATE_CODE);
      
      expect(template.id).toBe('generate_code');
      expect(template.name).toBe('Code Generation');
      expect(template.systemMessage).toContain('Test-Driven Development');
      expect(template.userPromptTemplate).toContain('{{component}}');
      expect(template.variables).toContain('component');
      expect(template.variables).toContain('techStack');
      expect(template.variables).toContain('requirements');
      expect(template.variables).toContain('specification');
    });

    it('should return correct template for test generation task', () => {
      const template = getPromptTemplate(GenerationTask.GENERATE_TESTS);
      
      expect(template.id).toBe('generate_tests');
      expect(template.name).toBe('Test Generation');
      expect(template.systemMessage).toContain('testing expert');
      expect(template.userPromptTemplate).toContain('{{code}}');
      expect(template.variables).toContain('code');
      expect(template.variables).toContain('techStack');
      expect(template.variables).toContain('requirements');
    });

    it('should return correct template for issue fixing task', () => {
      const template = getPromptTemplate(GenerationTask.FIX_ISSUES);
      
      expect(template.id).toBe('fix_issues');
      expect(template.name).toBe('Issue Resolution');
      expect(template.systemMessage).toContain('debugging expert');
      expect(template.userPromptTemplate).toContain('{{issue}}');
      expect(template.variables).toContain('issue');
      expect(template.variables).toContain('code');
      expect(template.variables).toContain('stackTrace');
      expect(template.variables).toContain('expectedBehavior');
    });

    it('should return correct template for documentation generation task', () => {
      const template = getPromptTemplate(GenerationTask.GENERATE_DOCUMENTATION);
      
      expect(template.id).toBe('generate_documentation');
      expect(template.name).toBe('Documentation Generation');
      expect(template.systemMessage).toContain('technical writer');
      expect(template.userPromptTemplate).toContain('{{code}}');
      expect(template.variables).toContain('code');
      expect(template.variables).toContain('endpoints');
      expect(template.variables).toContain('models');
      expect(template.variables).toContain('techStack');
    });
  });

  describe('renderPrompt', () => {
    it('should replace single variable in template', () => {
      const template = getPromptTemplate(GenerationTask.ANALYZE_DESCRIPTION);
      const variables = {
        description: 'A REST API for managing users'
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('A REST API for managing users');
      expect(rendered).not.toContain('{{description}}');
    });

    it('should replace multiple variables in template', () => {
      const template = getPromptTemplate(GenerationTask.RECOMMEND_TECH_STACK);
      const variables = {
        requirements: 'User management, authentication, REST API',
        preferences: 'TypeScript, PostgreSQL',
        scale: 'medium'
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('User management, authentication, REST API');
      expect(rendered).toContain('TypeScript, PostgreSQL');
      expect(rendered).toContain('medium');
      expect(rendered).not.toContain('{{requirements}}');
      expect(rendered).not.toContain('{{preferences}}');
      expect(rendered).not.toContain('{{scale}}');
    });

    it('should handle repeated variables in template', () => {
      const template = {
        id: 'test',
        name: 'Test',
        description: 'Test template',
        systemMessage: 'System message',
        userPromptTemplate: 'Hello {{name}}, welcome {{name}}!',
        variables: ['name'],
        maxTokens: 100,
        temperature: 0.5
      };

      const variables = { name: 'John' };
      const rendered = renderPrompt(template, variables);

      expect(rendered).toBe('Hello John, welcome John!');
    });

    it('should leave unreplaced variables if not provided', () => {
      const template = getPromptTemplate(GenerationTask.RECOMMEND_TECH_STACK);
      const variables = {
        requirements: 'User management'
        // Missing preferences and scale
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('User management');
      expect(rendered).toContain('{{preferences}}');
      expect(rendered).toContain('{{scale}}');
    });

    it('should handle empty variables object', () => {
      const template = getPromptTemplate(GenerationTask.ANALYZE_DESCRIPTION);
      const variables = {};

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('{{description}}');
      expect(rendered).toBe(template.userPromptTemplate);
    });

    it('should handle variables not in template', () => {
      const template = getPromptTemplate(GenerationTask.ANALYZE_DESCRIPTION);
      const variables = {
        description: 'A REST API',
        extraVariable: 'This should not cause issues'
      };

      const rendered = renderPrompt(template, variables);

      expect(rendered).toContain('A REST API');
      expect(rendered).not.toContain('{{description}}');
      expect(rendered).not.toContain('extraVariable');
    });
  });
});
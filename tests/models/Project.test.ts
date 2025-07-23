import mongoose from 'mongoose';
import { Project, IProject, ITechStack, ICodeFile, IDocumentationSection } from '../../src/models/Project';
import { User } from '../../src/models/User';

describe('Project Model', () => {
  let userId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a test user
    const user = new User({
      email: 'test@example.com',
      passwordHash: 'password123'
    });
    const savedUser = await user.save();
    userId = savedUser._id;
  });

  const validProjectData = {
    name: 'Test Project',
    description: 'A test project for backend generation',
    techStack: {
      language: 'typescript',
      framework: 'express',
      database: 'mongodb',
      additionalTools: ['jest', 'eslint']
    }
  };

  describe('Project Schema Validation', () => {
    it('should create a project with valid data', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.name).toBe('Test Project');
      expect(savedProject.description).toBe('A test project for backend generation');
      expect(savedProject.userId).toEqual(userId);
      expect(savedProject.status).toBe('planning');
      expect(savedProject.createdAt).toBeDefined();
      expect(savedProject.updatedAt).toBeDefined();
    });

    it('should require userId field', async () => {
      const projectData = {
        ...validProjectData
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('User ID is required');
    });

    it('should require name field', async () => {
      const projectData = {
        userId,
        description: 'A test project',
        techStack: validProjectData.techStack
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Project name is required');
    });

    it('should require description field', async () => {
      const projectData = {
        userId,
        name: 'Test Project',
        techStack: validProjectData.techStack
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Project description is required');
    });

    it('should require techStack field', async () => {
      const projectData = {
        userId,
        name: 'Test Project',
        description: 'A test project'
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Tech stack is required');
    });

    it('should enforce name length limit', async () => {
      const projectData = {
        userId,
        name: 'a'.repeat(101), // Exceeds 100 character limit
        description: 'A test project',
        techStack: validProjectData.techStack
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Project name cannot exceed 100 characters');
    });

    it('should enforce description length limit', async () => {
      const projectData = {
        userId,
        name: 'Test Project',
        description: 'a'.repeat(1001), // Exceeds 1000 character limit
        techStack: validProjectData.techStack
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Project description cannot exceed 1000 characters');
    });

    it('should trim name and description', async () => {
      const projectData = {
        userId,
        name: '  Test Project  ',
        description: '  A test project  ',
        techStack: validProjectData.techStack
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.name).toBe('Test Project');
      expect(savedProject.description).toBe('A test project');
    });
  });

  describe('Tech Stack Validation', () => {
    it('should require all tech stack fields', async () => {
      const projectData = {
        userId,
        name: 'Test Project',
        description: 'A test project',
        techStack: {
          language: 'typescript',
          framework: 'express'
          // Missing database
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Database is required');
    });

    it('should allow empty additionalTools array', async () => {
      const projectData = {
        userId,
        name: 'Test Project',
        description: 'A test project',
        techStack: {
          language: 'typescript',
          framework: 'express',
          database: 'mongodb',
          additionalTools: []
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.techStack.additionalTools).toEqual([]);
    });

    it('should trim tech stack fields', async () => {
      const projectData = {
        userId,
        name: 'Test Project',
        description: 'A test project',
        techStack: {
          language: '  typescript  ',
          framework: '  express  ',
          database: '  mongodb  ',
          additionalTools: ['  jest  ', '  eslint  ']
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.techStack.language).toBe('typescript');
      expect(savedProject.techStack.framework).toBe('express');
      expect(savedProject.techStack.database).toBe('mongodb');
      expect(savedProject.techStack.additionalTools).toEqual(['jest', 'eslint']);
    });
  });

  describe('Status Management', () => {
    it('should set default status to planning', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.status).toBe('planning');
    });

    it('should validate status enum values', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        status: 'invalid' as any
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow();
    });

    it('should allow valid status values', async () => {
      const validStatuses = ['planning', 'generating', 'completed', 'error', 'paused'];

      for (const status of validStatuses) {
        const projectData = {
          userId,
          ...validProjectData,
          status: status as any
        };

        const project = new Project(projectData);
        const savedProject = await project.save();

        expect(savedProject.status).toBe(status);
        
        // Clean up for next iteration
        await Project.deleteOne({ _id: savedProject._id });
      }
    });

    it('should validate status transitions', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        status: 'planning'
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.validateStatus()).toBe(true);
    });
  });

  describe('Generated Code Structure', () => {
    it('should initialize with default directory structure', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.generatedCode.structure.name).toBe('root');
      expect(savedProject.generatedCode.structure.type).toBe('directory');
      expect(savedProject.generatedCode.structure.path).toBe('/');
      expect(savedProject.generatedCode.structure.children).toEqual([]);
      expect(savedProject.generatedCode.files).toEqual([]);
    });

    it('should allow adding code files', async () => {
      const codeFile: ICodeFile = {
        path: 'src/index.ts',
        content: 'console.log("Hello World");',
        language: 'typescript',
        lastModified: new Date()
      };

      const projectData = {
        userId,
        ...validProjectData,
        generatedCode: {
          files: [codeFile],
          structure: {
            name: 'root',
            type: 'directory' as const,
            path: '/',
            children: []
          }
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.generatedCode.files).toHaveLength(1);
      expect(savedProject.generatedCode.files[0].path).toBe('src/index.ts');
      expect(savedProject.generatedCode.files[0].content).toBe('console.log("Hello World");');
      expect(savedProject.generatedCode.files[0].language).toBe('typescript');
    });

    it('should require code file fields', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        generatedCode: {
          files: [{
            path: 'src/index.ts',
            content: 'console.log("Hello World");'
            // Missing language
          }],
          structure: {
            name: 'root',
            type: 'directory' as const,
            path: '/',
            children: []
          }
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Programming language is required');
    });
  });

  describe('Documentation Management', () => {
    it('should initialize with empty documentation', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.documentation.sections).toEqual([]);
      expect(savedProject.documentation.history).toEqual([]);
      expect(savedProject.documentation.lastUpdated).toBeDefined();
    });

    it('should allow adding documentation sections', async () => {
      const docSection: IDocumentationSection = {
        title: 'API Documentation',
        content: 'This is the API documentation',
        type: 'api',
        lastUpdated: new Date()
      };

      const projectData = {
        userId,
        ...validProjectData,
        documentation: {
          sections: [docSection],
          history: [],
          lastUpdated: new Date()
        }
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.documentation.sections).toHaveLength(1);
      expect(savedProject.documentation.sections[0].title).toBe('API Documentation');
      expect(savedProject.documentation.sections[0].type).toBe('api');
    });

    it('should validate documentation section types', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        documentation: {
          sections: [{
            title: 'Test Doc',
            content: 'Test content',
            type: 'invalid' as any,
            lastUpdated: new Date()
          }],
          history: [],
          lastUpdated: new Date()
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow();
    });

    it('should update documentation and add history', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      const docSection: IDocumentationSection = {
        title: 'API Documentation',
        content: 'This is the API documentation',
        type: 'api',
        lastUpdated: new Date()
      };

      await savedProject.updateDocumentation(docSection);

      expect(savedProject.documentation.sections).toHaveLength(1);
      expect(savedProject.documentation.sections[0].title).toBe('API Documentation');
      expect(savedProject.documentation.history).toHaveLength(1);
      expect(savedProject.documentation.history[0].changeType).toBe('created');
      expect(savedProject.documentation.history[0].description).toContain('created');
    });

    it('should update existing documentation section', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      const docSection: IDocumentationSection = {
        title: 'API Documentation',
        content: 'This is the API documentation',
        type: 'api',
        lastUpdated: new Date()
      };

      await savedProject.updateDocumentation(docSection);

      const updatedSection: IDocumentationSection = {
        title: 'API Documentation',
        content: 'This is the updated API documentation',
        type: 'api',
        lastUpdated: new Date()
      };

      await savedProject.updateDocumentation(updatedSection);

      expect(savedProject.documentation.sections).toHaveLength(1);
      expect(savedProject.documentation.sections[0].content).toBe('This is the updated API documentation');
      expect(savedProject.documentation.history).toHaveLength(2);
      expect(savedProject.documentation.history[1].changeType).toBe('updated');
    });
  });

  describe('Git Integration', () => {
    it('should initialize with empty git integration', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.gitIntegration.repoUrl).toBeUndefined();
      expect(savedProject.gitIntegration.branch).toBe('main');
      expect(savedProject.gitIntegration.lastCommit).toBeUndefined();
      expect(savedProject.gitIntegration.lastSyncAt).toBeUndefined();
    });

    it('should validate repository URL format', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        gitIntegration: {
          repoUrl: 'invalid-url'
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Please enter a valid repository URL');
    });

    it('should allow valid repository URLs', async () => {
      const validUrls = [
        'https://github.com/user/repo.git',
        'http://gitlab.com/user/repo.git'
      ];

      for (const repoUrl of validUrls) {
        const projectData = {
          userId,
          ...validProjectData,
          gitIntegration: {
            repoUrl
          }
        };

        const project = new Project(projectData);
        const savedProject = await project.save();

        expect(savedProject.gitIntegration.repoUrl).toBe(repoUrl);
        
        // Clean up for next iteration
        await Project.deleteOne({ _id: savedProject._id });
      }
    });
  });

  describe('Analytics', () => {
    it('should initialize with default analytics', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.analytics.generationTime).toBe(0);
      expect(savedProject.analytics.testCoverage).toBe(0);
      expect(savedProject.analytics.linesOfCode).toBe(0);
      expect(savedProject.analytics.filesGenerated).toBe(0);
      expect(savedProject.analytics.codeQuality.complexity).toBe(0);
      expect(savedProject.analytics.codeQuality.maintainability).toBe(0);
      expect(savedProject.analytics.codeQuality.testCoverage).toBe(0);
      expect(savedProject.analytics.codeQuality.codeSmells).toBe(0);
    });

    it('should validate analytics ranges', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        analytics: {
          generationTime: -1, // Invalid negative value
          testCoverage: 0,
          codeQuality: {
            complexity: 0,
            maintainability: 0,
            testCoverage: 0,
            codeSmells: 0
          },
          linesOfCode: 0,
          filesGenerated: 0
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Generation time cannot be negative');
    });

    it('should validate test coverage range', async () => {
      const projectData = {
        userId,
        ...validProjectData,
        analytics: {
          generationTime: 0,
          testCoverage: 150, // Invalid value > 100
          codeQuality: {
            complexity: 0,
            maintainability: 0,
            testCoverage: 0,
            codeSmells: 0
          },
          linesOfCode: 0,
          filesGenerated: 0
        }
      };

      const project = new Project(projectData);
      
      await expect(project.save()).rejects.toThrow('Test coverage cannot exceed 100');
    });
  });

  describe('Change History', () => {
    it('should add change history entries', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      savedProject.addChangeHistory({
        changeType: 'created',
        description: 'Project created',
        author: 'user@example.com'
      });

      expect(savedProject.documentation.history).toHaveLength(1);
      expect(savedProject.documentation.history[0].changeType).toBe('created');
      expect(savedProject.documentation.history[0].description).toBe('Project created');
      expect(savedProject.documentation.history[0].author).toBe('user@example.com');
      expect(savedProject.documentation.history[0].timestamp).toBeDefined();
    });

    it('should limit history to 100 entries', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      // Add 105 history entries
      for (let i = 0; i < 105; i++) {
        savedProject.addChangeHistory({
          changeType: 'updated',
          description: `Change ${i}`,
          author: 'user@example.com'
        });
      }

      expect(savedProject.documentation.history).toHaveLength(100);
      expect(savedProject.documentation.history[0].description).toBe('Change 5'); // First 5 should be removed
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt automatically', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();

      expect(savedProject.createdAt).toBeDefined();
      expect(savedProject.updatedAt).toBeDefined();
      expect(savedProject.createdAt).toBeInstanceOf(Date);
      expect(savedProject.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const projectData = {
        userId,
        ...validProjectData
      };

      const project = new Project(projectData);
      const savedProject = await project.save();
      const originalUpdatedAt = savedProject.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedProject.name = 'Updated Project Name';
      const updatedProject = await savedProject.save();

      expect(updatedProject.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
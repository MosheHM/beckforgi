import mongoose from 'mongoose';
import { Analytics, IAnalytics, ITechStackUsed, IGenerationMetrics, IUserInteractions, IPerformanceMetrics } from '../../src/models/Analytics';

describe('Analytics Model', () => {
  const validTechStack: ITechStackUsed = {
    language: 'typescript',
    framework: 'express',
    database: 'mongodb',
    additionalTools: ['jest', 'eslint']
  };

  const validGenerationMetrics: IGenerationMetrics = {
    timeToComplete: 30000,
    linesOfCode: 500,
    testCoverage: 85,
    filesGenerated: 15,
    errorsEncountered: 2,
    aiFixesUsed: 1
  };

  const validUserInteractions: IUserInteractions = {
    chatMessages: 10,
    aiFixesUsed: 1,
    manualEdits: 3,
    testRunsExecuted: 5,
    documentationViews: 8
  };

  const validPerformanceMetrics: IPerformanceMetrics = {
    averageResponseTime: 250,
    peakMemoryUsage: 128,
    cpuUsagePercent: 45,
    databaseQueryTime: 50
  };

  const validAnalyticsData = {
    anonymizedUserHash: 'a'.repeat(64), // 64 character hex string
    projectType: 'api',
    techStackUsed: validTechStack,
    generationMetrics: validGenerationMetrics,
    userInteractions: validUserInteractions,
    performanceMetrics: validPerformanceMetrics,
    sessionDuration: 120000
  };

  describe('Analytics Schema Validation', () => {
    it('should create analytics with valid data', async () => {
      const analytics = new Analytics(validAnalyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.anonymizedUserHash).toBe('a'.repeat(64));
      expect(savedAnalytics.projectType).toBe('api');
      expect(savedAnalytics.techStackUsed.language).toBe('typescript');
      expect(savedAnalytics.generationMetrics.timeToComplete).toBe(30000);
      expect(savedAnalytics.userInteractions.chatMessages).toBe(10);
      expect(savedAnalytics.performanceMetrics.averageResponseTime).toBe(250);
      expect(savedAnalytics.sessionDuration).toBe(120000);
      expect(savedAnalytics.timestamp).toBeDefined();
    });

    it('should require anonymizedUserHash field', async () => {
      const analyticsData: any = {
        ...validAnalyticsData
      };
      delete analyticsData.anonymizedUserHash;

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Anonymized user hash is required');
    });

    it('should require projectType field', async () => {
      const analyticsData: any = {
        ...validAnalyticsData
      };
      delete analyticsData.projectType;

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Project type is required');
    });

    it('should validate projectType enum values', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        projectType: 'invalid-type'
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Project type must be one of');
    });

    it('should allow valid projectType values', async () => {
      const validProjectTypes = ['api', 'web-app', 'microservice', 'cli-tool', 'library', 'other'];

      for (const projectType of validProjectTypes) {
        const analyticsData = {
          ...validAnalyticsData,
          projectType,
          anonymizedUserHash: 'b'.repeat(64) // Use different hash for each test
        };

        const analytics = new Analytics(analyticsData);
        const savedAnalytics = await analytics.save();

        expect(savedAnalytics.projectType).toBe(projectType);
        
        // Clean up for next iteration
        await Analytics.deleteOne({ _id: savedAnalytics._id });
      }
    });

    it('should normalize projectType to lowercase', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        projectType: 'API'
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.projectType).toBe('api');
    });

    it('should set default timestamp', async () => {
      const analytics = new Analytics(validAnalyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.timestamp).toBeDefined();
      expect(savedAnalytics.timestamp).toBeInstanceOf(Date);
    });

    it('should validate userAgent length', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        userAgent: 'a'.repeat(501) // Exceeds 500 character limit
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('User agent cannot exceed 500 characters');
    });
  });

  describe('Tech Stack Validation', () => {
    it('should require all tech stack fields', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        techStackUsed: {
          language: 'typescript',
          framework: 'express'
          // Missing database
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Database is required');
    });

    it('should normalize tech stack fields to lowercase', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        techStackUsed: {
          language: 'TYPESCRIPT',
          framework: 'EXPRESS',
          database: 'MONGODB',
          additionalTools: ['JEST', 'ESLINT']
        }
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.techStackUsed.language).toBe('typescript');
      expect(savedAnalytics.techStackUsed.framework).toBe('express');
      expect(savedAnalytics.techStackUsed.database).toBe('mongodb');
      expect(savedAnalytics.techStackUsed.additionalTools).toEqual(['jest', 'eslint']);
    });

    it('should allow empty additionalTools array', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        techStackUsed: {
          ...validTechStack,
          additionalTools: []
        }
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.techStackUsed.additionalTools).toEqual([]);
    });
  });

  describe('Generation Metrics Validation', () => {
    it('should require all generation metrics fields', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        generationMetrics: {
          timeToComplete: 30000,
          linesOfCode: 500,
          testCoverage: 85
          // Missing filesGenerated
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Files generated is required');
    });

    it('should validate negative values', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        generationMetrics: {
          ...validGenerationMetrics,
          timeToComplete: -1
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Time to complete cannot be negative');
    });

    it('should validate test coverage range', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        generationMetrics: {
          ...validGenerationMetrics,
          testCoverage: 150
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Test coverage cannot exceed 100');
    });

    it('should set default values for optional fields', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        generationMetrics: {
          timeToComplete: 30000,
          linesOfCode: 500,
          testCoverage: 85,
          filesGenerated: 15
          // errorsEncountered and aiFixesUsed should default to 0
        }
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.generationMetrics.errorsEncountered).toBe(0);
      expect(savedAnalytics.generationMetrics.aiFixesUsed).toBe(0);
    });
  });

  describe('User Interactions Validation', () => {
    it('should require core user interaction fields', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        userInteractions: {
          chatMessages: 10,
          aiFixesUsed: 1
          // Missing manualEdits
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Manual edits count is required');
    });

    it('should validate negative values', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        userInteractions: {
          ...validUserInteractions,
          chatMessages: -1
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Chat messages cannot be negative');
    });

    it('should set default values for optional fields', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        userInteractions: {
          chatMessages: 10,
          aiFixesUsed: 1,
          manualEdits: 3
          // testRunsExecuted and documentationViews should default to 0
        }
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.userInteractions.testRunsExecuted).toBe(0);
      expect(savedAnalytics.userInteractions.documentationViews).toBe(0);
    });
  });

  describe('Performance Metrics Validation', () => {
    it('should require all performance metrics fields', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        performanceMetrics: {
          averageResponseTime: 250,
          peakMemoryUsage: 128,
          cpuUsagePercent: 45
          // Missing databaseQueryTime
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Database query time is required');
    });

    it('should validate negative values', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        performanceMetrics: {
          ...validPerformanceMetrics,
          averageResponseTime: -1
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Average response time cannot be negative');
    });

    it('should validate CPU usage percentage range', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        performanceMetrics: {
          ...validPerformanceMetrics,
          cpuUsagePercent: 150
        }
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('CPU usage percent cannot exceed 100');
    });
  });

  describe('Anonymization Methods', () => {
    let analytics: IAnalytics;

    beforeEach(() => {
      analytics = new Analytics(validAnalyticsData);
    });

    it('should generate anonymized hash for user ID', () => {
      const userId = 'user123';
      const hash = analytics.generateAnonymizedHash(userId);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Should be valid hex
      expect(hash).not.toBe(userId); // Should not be the original user ID
    });

    it('should generate consistent hash for same user ID', () => {
      const userId = 'user123';
      const hash1 = analytics.generateAnonymizedHash(userId);
      const hash2 = analytics.generateAnonymizedHash(userId);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different user IDs', () => {
      const hash1 = analytics.generateAnonymizedHash('user123');
      const hash2 = analytics.generateAnonymizedHash('user456');

      expect(hash1).not.toBe(hash2);
    });

    it('should anonymize IP address', () => {
      const ip = '192.168.1.1';
      const hash = analytics.anonymizeIP(ip);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Should be valid hex
      expect(hash).not.toBe(ip); // Should not be the original IP
    });

    it('should generate consistent hash for same IP', () => {
      const ip = '192.168.1.1';
      const hash1 = analytics.anonymizeIP(ip);
      const hash2 = analytics.anonymizeIP(ip);

      expect(hash1).toBe(hash2);
    });
  });

  describe('Pre-save Validation', () => {
    it('should validate anonymized user hash format', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        anonymizedUserHash: 'invalid-hash'
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Invalid anonymized user hash format');
    });

    it('should validate anonymized IP hash format', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        ipHash: 'invalid-hash'
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Invalid anonymized IP hash format');
    });

    it('should accept valid hash formats', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        ipHash: 'b'.repeat(64) // Valid 64 character hex string
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.ipHash).toBe('b'.repeat(64));
    });

    it('should set timestamp if not provided', async () => {
      const analyticsData: any = {
        ...validAnalyticsData
      };
      delete analyticsData.timestamp;

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.timestamp).toBeDefined();
      expect(savedAnalytics.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Static Methods', () => {
    it('should create anonymized entry with proper hashing', () => {
      const data = {
        userId: 'user123',
        ip: '192.168.1.1',
        projectType: 'api',
        techStackUsed: validTechStack,
        generationMetrics: validGenerationMetrics,
        userInteractions: validUserInteractions,
        performanceMetrics: validPerformanceMetrics,
        sessionDuration: 120000,
        userAgent: 'Mozilla/5.0 Test Browser'
      };

      const analytics = Analytics.createAnonymizedEntry(data);

      expect(analytics.anonymizedUserHash).toBeDefined();
      expect(analytics.anonymizedUserHash).toHaveLength(64);
      expect(analytics.anonymizedUserHash).not.toBe('user123');
      expect(analytics.ipHash).toBeDefined();
      expect(analytics.ipHash).toHaveLength(64);
      expect(analytics.ipHash).not.toBe('192.168.1.1');
      expect(analytics.projectType).toBe('api');
      expect(analytics.userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    it('should create anonymized entry without IP', () => {
      const data = {
        userId: 'user123',
        projectType: 'api',
        techStackUsed: validTechStack,
        generationMetrics: validGenerationMetrics,
        userInteractions: validUserInteractions,
        performanceMetrics: validPerformanceMetrics,
        sessionDuration: 120000
      };

      const analytics = Analytics.createAnonymizedEntry(data);

      expect(analytics.anonymizedUserHash).toBeDefined();
      expect(analytics.ipHash).toBeUndefined();
      expect(analytics.projectType).toBe('api');
    });

    it('should save anonymized entry successfully', async () => {
      const data = {
        userId: 'user123',
        ip: '192.168.1.1',
        projectType: 'api',
        techStackUsed: validTechStack,
        generationMetrics: validGenerationMetrics,
        userInteractions: validUserInteractions,
        performanceMetrics: validPerformanceMetrics,
        sessionDuration: 120000
      };

      const analytics = Analytics.createAnonymizedEntry(data);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics._id).toBeDefined();
      expect(savedAnalytics.anonymizedUserHash).toHaveLength(64);
      expect(savedAnalytics.ipHash).toHaveLength(64);
    });
  });

  describe('Session Duration Validation', () => {
    it('should require session duration', async () => {
      const analyticsData: any = {
        ...validAnalyticsData
      };
      delete analyticsData.sessionDuration;

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Session duration is required');
    });

    it('should validate negative session duration', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        sessionDuration: -1
      };

      const analytics = new Analytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow('Session duration cannot be negative');
    });

    it('should allow zero session duration', async () => {
      const analyticsData = {
        ...validAnalyticsData,
        sessionDuration: 0
      };

      const analytics = new Analytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.sessionDuration).toBe(0);
    });
  });
});
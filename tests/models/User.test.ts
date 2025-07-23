import mongoose from 'mongoose';
import { User, IUser } from '../../src/models/User';

describe('User Model', () => {
  describe('User Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.passwordHash).not.toBe('password123'); // Should be hashed
      expect(savedUser.preferences.theme).toBe('light'); // Default value
      expect(savedUser.preferences.defaultTechStack?.language).toBe('typescript');
      expect(savedUser.preferences.notifications.email).toBe(true);
      expect(savedUser.settings.maxProjects).toBe(10);
      expect(savedUser.createdAt).toBeDefined();
    });

    it('should require email field', async () => {
      const userData = {
        passwordHash: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Email is required');
    });

    it('should require password field', async () => {
      const userData = {
        email: 'test@example.com'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Password is required');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Please enter a valid email');
    });

    it('should enforce minimum password length', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: '123'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('Password must be at least 6 characters');
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user1 = new User(userData);
      await user1.save();

      const user2 = new User(userData);
      
      await expect(user2.save()).rejects.toThrow();
    });

    it('should normalize email to lowercase', async () => {
      const userData = {
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim email whitespace', async () => {
      const userData = {
        email: '  test@example.com  ',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.passwordHash).not.toBe('password123');
      expect(savedUser.passwordHash.length).toBeGreaterThan(20); // Hashed passwords are longer
    });

    it('should not rehash password if not modified', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      const originalHash = savedUser.passwordHash;

      // Update a different field
      savedUser.preferences.theme = 'dark';
      const updatedUser = await savedUser.save();

      expect(updatedUser.passwordHash).toBe(originalHash);
    });

    it('should rehash password when modified', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      const originalHash = savedUser.passwordHash;

      // Update password
      savedUser.passwordHash = 'newpassword123';
      const updatedUser = await savedUser.save();

      expect(updatedUser.passwordHash).not.toBe(originalHash);
      expect(updatedUser.passwordHash).not.toBe('newpassword123');
    });
  });

  describe('Password Comparison', () => {
    let user: IUser;

    beforeEach(async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      user = new User(userData);
      await user.save();
    });

    it('should return true for correct password', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });

    it('should handle empty password', async () => {
      const isMatch = await user.comparePassword('');
      expect(isMatch).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should set default preferences', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.preferences.theme).toBe('light');
      expect(savedUser.preferences.defaultTechStack?.language).toBe('typescript');
      expect(savedUser.preferences.defaultTechStack?.framework).toBe('express');
      expect(savedUser.preferences.defaultTechStack?.database).toBe('mongodb');
      expect(savedUser.preferences.notifications.email).toBe(true);
      expect(savedUser.preferences.notifications.push).toBe(false);
    });

    it('should allow custom preferences', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        preferences: {
          theme: 'dark' as const,
          defaultTechStack: {
            language: 'python',
            framework: 'fastapi',
            database: 'postgresql'
          },
          notifications: {
            email: false,
            push: true
          }
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.preferences.theme).toBe('dark');
      expect(savedUser.preferences.defaultTechStack?.language).toBe('python');
      expect(savedUser.preferences.defaultTechStack?.framework).toBe('fastapi');
      expect(savedUser.preferences.defaultTechStack?.database).toBe('postgresql');
      expect(savedUser.preferences.notifications.email).toBe(false);
      expect(savedUser.preferences.notifications.push).toBe(true);
    });

    it('should validate theme enum values', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        preferences: {
          theme: 'invalid' as any,
          notifications: {
            email: true,
            push: false
          }
        }
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Settings', () => {
    it('should set default settings', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.settings.apiKeyUsage).toBe(0);
      expect(savedUser.settings.maxProjects).toBe(10);
    });

    it('should allow custom settings', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        settings: {
          apiKeyUsage: 50,
          maxProjects: 20
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.settings.apiKeyUsage).toBe(50);
      expect(savedUser.settings.maxProjects).toBe(20);
    });
  });

  describe('JSON Serialization', () => {
    it('should exclude passwordHash from JSON output', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();
      const userJson = savedUser.toJSON();

      expect(userJson.passwordHash).toBeUndefined();
      expect(userJson.email).toBe('test@example.com');
      expect(userJson.preferences).toBeDefined();
      expect(userJson.settings).toBeDefined();
    });
  });

  describe('Project References', () => {
    it('should initialize with empty projects array', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.projects).toEqual([]);
    });

    it('should allow adding project references', async () => {
      const projectId = new mongoose.Types.ObjectId();
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        projects: [projectId]
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.projects).toHaveLength(1);
      expect(savedUser.projects[0]).toEqual(projectId);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt automatically', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.createdAt).toBeInstanceOf(Date);
    });

    it('should allow setting lastLoginAt', async () => {
      const loginTime = new Date();
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123',
        lastLoginAt: loginTime
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.lastLoginAt).toEqual(loginTime);
    });

    it('should leave lastLoginAt undefined by default', async () => {
      const userData = {
        email: 'test@example.com',
        passwordHash: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.lastLoginAt).toBeUndefined();
    });
  });
});
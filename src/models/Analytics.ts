import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface ITechStackUsed {
  language: string;
  framework: string;
  database: string;
  additionalTools: string[];
}

export interface IGenerationMetrics {
  timeToComplete: number; // in milliseconds
  linesOfCode: number;
  testCoverage: number; // percentage 0-100
  filesGenerated: number;
  errorsEncountered: number;
  aiFixesUsed: number;
}

export interface IUserInteractions {
  chatMessages: number;
  aiFixesUsed: number;
  manualEdits: number;
  testRunsExecuted: number;
  documentationViews: number;
}

export interface IPerformanceMetrics {
  averageResponseTime: number; // in milliseconds
  peakMemoryUsage: number; // in MB
  cpuUsagePercent: number;
  databaseQueryTime: number; // in milliseconds
}

export interface IAnalytics extends Document {
  anonymizedUserHash: string;
  projectType: string;
  techStackUsed: ITechStackUsed;
  generationMetrics: IGenerationMetrics;
  userInteractions: IUserInteractions;
  performanceMetrics: IPerformanceMetrics;
  sessionDuration: number; // in milliseconds
  timestamp: Date;
  ipHash?: string; // Optional anonymized IP for geographic insights
  userAgent?: string; // Browser/client information
  generateAnonymizedHash(userId: string): string;
  anonymizeIP(ip: string): string;
}

const techStackUsedSchema = new Schema<ITechStackUsed>({
  language: {
    type: String,
    required: [true, 'Programming language is required'],
    trim: true,
    lowercase: true
  },
  framework: {
    type: String,
    required: [true, 'Framework is required'],
    trim: true,
    lowercase: true
  },
  database: {
    type: String,
    required: [true, 'Database is required'],
    trim: true,
    lowercase: true
  },
  additionalTools: [{
    type: String,
    trim: true,
    lowercase: true
  }]
});

const generationMetricsSchema = new Schema<IGenerationMetrics>({
  timeToComplete: {
    type: Number,
    required: [true, 'Time to complete is required'],
    min: [0, 'Time to complete cannot be negative']
  },
  linesOfCode: {
    type: Number,
    required: [true, 'Lines of code is required'],
    min: [0, 'Lines of code cannot be negative']
  },
  testCoverage: {
    type: Number,
    required: [true, 'Test coverage is required'],
    min: [0, 'Test coverage cannot be negative'],
    max: [100, 'Test coverage cannot exceed 100']
  },
  filesGenerated: {
    type: Number,
    required: [true, 'Files generated is required'],
    min: [0, 'Files generated cannot be negative']
  },
  errorsEncountered: {
    type: Number,
    default: 0,
    min: [0, 'Errors encountered cannot be negative']
  },
  aiFixesUsed: {
    type: Number,
    default: 0,
    min: [0, 'AI fixes used cannot be negative']
  }
});

const userInteractionsSchema = new Schema<IUserInteractions>({
  chatMessages: {
    type: Number,
    required: [true, 'Chat messages count is required'],
    min: [0, 'Chat messages cannot be negative']
  },
  aiFixesUsed: {
    type: Number,
    required: [true, 'AI fixes used count is required'],
    min: [0, 'AI fixes used cannot be negative']
  },
  manualEdits: {
    type: Number,
    required: [true, 'Manual edits count is required'],
    min: [0, 'Manual edits cannot be negative']
  },
  testRunsExecuted: {
    type: Number,
    default: 0,
    min: [0, 'Test runs executed cannot be negative']
  },
  documentationViews: {
    type: Number,
    default: 0,
    min: [0, 'Documentation views cannot be negative']
  }
});

const performanceMetricsSchema = new Schema<IPerformanceMetrics>({
  averageResponseTime: {
    type: Number,
    required: [true, 'Average response time is required'],
    min: [0, 'Average response time cannot be negative']
  },
  peakMemoryUsage: {
    type: Number,
    required: [true, 'Peak memory usage is required'],
    min: [0, 'Peak memory usage cannot be negative']
  },
  cpuUsagePercent: {
    type: Number,
    required: [true, 'CPU usage percent is required'],
    min: [0, 'CPU usage percent cannot be negative'],
    max: [100, 'CPU usage percent cannot exceed 100']
  },
  databaseQueryTime: {
    type: Number,
    required: [true, 'Database query time is required'],
    min: [0, 'Database query time cannot be negative']
  }
});

const analyticsSchema = new Schema<IAnalytics>({
  anonymizedUserHash: {
    type: String,
    required: [true, 'Anonymized user hash is required'],
    index: true
  },
  projectType: {
    type: String,
    required: [true, 'Project type is required'],
    trim: true,
    lowercase: true,
    enum: {
      values: ['api', 'web-app', 'microservice', 'cli-tool', 'library', 'other'],
      message: 'Project type must be one of: api, web-app, microservice, cli-tool, library, other'
    }
  },
  techStackUsed: {
    type: techStackUsedSchema,
    required: [true, 'Tech stack used is required']
  },
  generationMetrics: {
    type: generationMetricsSchema,
    required: [true, 'Generation metrics are required']
  },
  userInteractions: {
    type: userInteractionsSchema,
    required: [true, 'User interactions are required']
  },
  performanceMetrics: {
    type: performanceMetricsSchema,
    required: [true, 'Performance metrics are required']
  },
  sessionDuration: {
    type: Number,
    required: [true, 'Session duration is required'],
    min: [0, 'Session duration cannot be negative']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipHash: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  }
});

// Generate anonymized hash for user ID
analyticsSchema.methods.generateAnonymizedHash = function(userId: string): string {
  const salt = process.env.ANALYTICS_SALT || 'default-salt-change-in-production';
  return crypto.createHash('sha256').update(userId + salt).digest('hex');
};

// Anonymize IP address by hashing it
analyticsSchema.methods.anonymizeIP = function(ip: string): string {
  const salt = process.env.ANALYTICS_SALT || 'default-salt-change-in-production';
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
};

// Pre-save middleware to ensure anonymization
analyticsSchema.pre('save', function(next) {
  // Ensure timestamp is set
  if (!this.timestamp) {
    this.timestamp = new Date();
  }

  // Validate that the user hash is properly anonymized (should be 64 chars hex)
  if (this.anonymizedUserHash && !/^[a-f0-9]{64}$/.test(this.anonymizedUserHash)) {
    return next(new Error('Invalid anonymized user hash format'));
  }

  // Validate that IP hash is properly anonymized if provided
  if (this.ipHash && !/^[a-f0-9]{64}$/.test(this.ipHash)) {
    return next(new Error('Invalid anonymized IP hash format'));
  }

  next();
});

// Define interface for static methods
interface IAnalyticsModel extends mongoose.Model<IAnalytics> {
  createAnonymizedEntry(data: {
    userId: string;
    ip?: string;
    projectType: string;
    techStackUsed: ITechStackUsed;
    generationMetrics: IGenerationMetrics;
    userInteractions: IUserInteractions;
    performanceMetrics: IPerformanceMetrics;
    sessionDuration: number;
    userAgent?: string;
  }): IAnalytics;
}

// Static method to create analytics entry with proper anonymization
analyticsSchema.statics.createAnonymizedEntry = function(data: {
  userId: string;
  ip?: string;
  projectType: string;
  techStackUsed: ITechStackUsed;
  generationMetrics: IGenerationMetrics;
  userInteractions: IUserInteractions;
  performanceMetrics: IPerformanceMetrics;
  sessionDuration: number;
  userAgent?: string;
}) {
  const analytics = new this();
  
  // Generate anonymized hashes
  analytics.anonymizedUserHash = analytics.generateAnonymizedHash(data.userId);
  if (data.ip) {
    analytics.ipHash = analytics.anonymizeIP(data.ip);
  }

  // Set other fields
  analytics.projectType = data.projectType;
  analytics.techStackUsed = data.techStackUsed;
  analytics.generationMetrics = data.generationMetrics;
  analytics.userInteractions = data.userInteractions;
  analytics.performanceMetrics = data.performanceMetrics;
  analytics.sessionDuration = data.sessionDuration;
  analytics.userAgent = data.userAgent;

  return analytics;
};

// Indexes for efficient querying
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ projectType: 1, timestamp: -1 });
analyticsSchema.index({ 'techStackUsed.language': 1, timestamp: -1 });
analyticsSchema.index({ 'techStackUsed.framework': 1, timestamp: -1 });
analyticsSchema.index({ 'techStackUsed.database': 1, timestamp: -1 });

// TTL index to automatically delete old analytics data after 2 years
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years in seconds

export const Analytics = mongoose.model<IAnalytics, IAnalyticsModel>('Analytics', analyticsSchema);
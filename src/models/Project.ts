import mongoose, { Document, Schema } from 'mongoose';

export interface ITechStack {
  language: string;
  framework: string;
  database: string;
  additionalTools: string[];
}

export interface ICodeFile {
  path: string;
  content: string;
  language: string;
  lastModified: Date;
}

export interface IDirectoryStructure {
  name: string;
  type: 'file' | 'directory';
  children?: IDirectoryStructure[];
  path: string;
}

export interface IDocumentationSection {
  title: string;
  content: string;
  type: 'api' | 'schema' | 'guide' | 'changelog';
  lastUpdated: Date;
}

export interface IChangeHistory {
  timestamp: Date;
  changeType: 'created' | 'updated' | 'deleted';
  description: string;
  author: string;
}

export interface IGitIntegration {
  repoUrl?: string;
  branch?: string;
  lastCommit?: string;
  lastSyncAt?: Date;
}

export interface IQualityMetrics {
  complexity: number;
  maintainability: number;
  testCoverage: number;
  codeSmells: number;
}

export interface IAnalytics {
  generationTime: number;
  testCoverage: number;
  codeQuality: IQualityMetrics;
  linesOfCode: number;
  filesGenerated: number;
}

export type ProjectStatus = 'planning' | 'generating' | 'completed' | 'error' | 'paused';

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  techStack: ITechStack;
  generatedCode: {
    files: ICodeFile[];
    structure: IDirectoryStructure;
  };
  documentation: {
    sections: IDocumentationSection[];
    history: IChangeHistory[];
    lastUpdated: Date;
  };
  gitIntegration: IGitIntegration;
  analytics: IAnalytics;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  validateStatus(): boolean;
  updateDocumentation(section: IDocumentationSection): Promise<void>;
  addChangeHistory(change: Omit<IChangeHistory, 'timestamp'>): void;
}

const techStackSchema = new Schema<ITechStack>({
  language: {
    type: String,
    required: [true, 'Programming language is required'],
    trim: true
  },
  framework: {
    type: String,
    required: [true, 'Framework is required'],
    trim: true
  },
  database: {
    type: String,
    required: [true, 'Database is required'],
    trim: true
  },
  additionalTools: [{
    type: String,
    trim: true
  }]
});

const codeFileSchema = new Schema<ICodeFile>({
  path: {
    type: String,
    required: [true, 'File path is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'File content is required']
  },
  language: {
    type: String,
    required: [true, 'Programming language is required'],
    trim: true
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

const directoryStructureSchema = new Schema<IDirectoryStructure>({
  name: {
    type: String,
    required: [true, 'Directory/file name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['file', 'directory'],
    required: [true, 'Type is required']
  },
  path: {
    type: String,
    required: [true, 'Path is required'],
    trim: true
  }
});

// Add self-reference after schema creation
directoryStructureSchema.add({
  children: [directoryStructureSchema]
});

const documentationSectionSchema = new Schema<IDocumentationSection>({
  title: {
    type: String,
    required: [true, 'Documentation title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Documentation content is required']
  },
  type: {
    type: String,
    enum: ['api', 'schema', 'guide', 'changelog'],
    required: [true, 'Documentation type is required']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const changeHistorySchema = new Schema<IChangeHistory>({
  timestamp: {
    type: Date,
    default: Date.now
  },
  changeType: {
    type: String,
    enum: ['created', 'updated', 'deleted'],
    required: [true, 'Change type is required']
  },
  description: {
    type: String,
    required: [true, 'Change description is required'],
    trim: true
  },
  author: {
    type: String,
    required: [true, 'Change author is required'],
    trim: true
  }
});

const gitIntegrationSchema = new Schema<IGitIntegration>({
  repoUrl: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid repository URL']
  },
  branch: {
    type: String,
    trim: true,
    default: 'main'
  },
  lastCommit: {
    type: String,
    trim: true
  },
  lastSyncAt: {
    type: Date
  }
});

const qualityMetricsSchema = new Schema<IQualityMetrics>({
  complexity: {
    type: Number,
    min: [0, 'Complexity cannot be negative'],
    default: 0
  },
  maintainability: {
    type: Number,
    min: [0, 'Maintainability cannot be negative'],
    max: [100, 'Maintainability cannot exceed 100'],
    default: 0
  },
  testCoverage: {
    type: Number,
    min: [0, 'Test coverage cannot be negative'],
    max: [100, 'Test coverage cannot exceed 100'],
    default: 0
  },
  codeSmells: {
    type: Number,
    min: [0, 'Code smells cannot be negative'],
    default: 0
  }
});

const analyticsSchema = new Schema<IAnalytics>({
  generationTime: {
    type: Number,
    min: [0, 'Generation time cannot be negative'],
    default: 0
  },
  testCoverage: {
    type: Number,
    min: [0, 'Test coverage cannot be negative'],
    max: [100, 'Test coverage cannot exceed 100'],
    default: 0
  },
  codeQuality: {
    type: qualityMetricsSchema,
    default: () => ({})
  },
  linesOfCode: {
    type: Number,
    min: [0, 'Lines of code cannot be negative'],
    default: 0
  },
  filesGenerated: {
    type: Number,
    min: [0, 'Files generated cannot be negative'],
    default: 0
  }
});

const projectSchema = new Schema<IProject>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [1000, 'Project description cannot exceed 1000 characters']
  },
  techStack: {
    type: techStackSchema,
    required: [true, 'Tech stack is required']
  },
  generatedCode: {
    files: [codeFileSchema],
    structure: {
      type: directoryStructureSchema,
      default: () => ({
        name: 'root',
        type: 'directory',
        children: [],
        path: '/'
      })
    }
  },
  documentation: {
    sections: [documentationSectionSchema],
    history: [changeHistorySchema],
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  gitIntegration: {
    type: gitIntegrationSchema,
    default: () => ({})
  },
  analytics: {
    type: analyticsSchema,
    default: () => ({})
  },
  status: {
    type: String,
    enum: ['planning', 'generating', 'completed', 'error', 'paused'],
    default: 'planning'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Validate project status transitions
projectSchema.methods.validateStatus = function(): boolean {
  const validTransitions: Record<ProjectStatus, ProjectStatus[]> = {
    'planning': ['generating', 'paused', 'error'],
    'generating': ['completed', 'error', 'paused'],
    'completed': ['generating', 'paused'],
    'error': ['planning', 'generating', 'paused'],
    'paused': ['planning', 'generating', 'completed', 'error']
  };

  const currentStatus = this.status as ProjectStatus;
  return validTransitions[currentStatus] !== undefined;
};

// Update documentation and add to history
projectSchema.methods.updateDocumentation = async function(section: IDocumentationSection): Promise<void> {
  const existingIndex = this.documentation.sections.findIndex(
    (s: IDocumentationSection) => s.title === section.title && s.type === section.type
  );

  if (existingIndex >= 0) {
    this.documentation.sections[existingIndex] = section;
  } else {
    this.documentation.sections.push(section);
  }

  this.documentation.lastUpdated = new Date();
  
  this.addChangeHistory({
    changeType: existingIndex >= 0 ? 'updated' : 'created',
    description: `Documentation section "${section.title}" ${existingIndex >= 0 ? 'updated' : 'created'}`,
    author: 'system'
  });

  await this.save();
};

// Add change history entry
projectSchema.methods.addChangeHistory = function(change: Omit<IChangeHistory, 'timestamp'>): void {
  this.documentation.history.push({
    ...change,
    timestamp: new Date()
  });

  // Keep only the last 100 history entries
  if (this.documentation.history.length > 100) {
    this.documentation.history = this.documentation.history.slice(-100);
  }
};

// Index for efficient queries
projectSchema.index({ userId: 1, createdAt: -1 });
projectSchema.index({ status: 1 });
projectSchema.index({ 'techStack.language': 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
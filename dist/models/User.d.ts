import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    email: string;
    passwordHash: string;
    preferences: {
        defaultTechStack?: {
            language: string;
            framework: string;
            database: string;
        };
        theme: 'light' | 'dark';
        notifications: {
            email: boolean;
            push: boolean;
        };
    };
    projects: mongoose.Types.ObjectId[];
    settings: {
        apiKeyUsage: number;
        maxProjects: number;
    };
    createdAt: Date;
    lastLoginAt?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & {
    _id: mongoose.Types.ObjectId;
}, any>;
//# sourceMappingURL=User.d.ts.map
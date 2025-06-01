import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';
import { IJobPost } from './JobPost';
import { IResume } from './Resume';
import { ICandidateDetails } from './Resume';

export interface IResumeMatchResult extends Document {
  _id: Types.ObjectId;
  jobPost: Types.ObjectId | IJobPost;
  resume: Types.ObjectId | IResume;
  recruiter: Types.ObjectId | IRecruiter;
  overallScore: number;
  categoryScores?: {
    skillsMatch?: number;
    experienceMatch?: number;
    educationMatch?: number;
    roleMatch?: number;
  };
  matchedSkills?: string[];
  missingSkills?: string[];
  matchSummary?: string;
  matchDate: Date;
  matchMethod: 'vector' | 'keyword' | 'hybrid';
  modelVersion?: string;
  candidateDetails?: ICandidateDetails;
}

const ResumeMatchResultSchema: Schema = new Schema({
  jobPost: { 
    type: Schema.Types.ObjectId, 
    ref: 'JobPost', 
    required: true 
  },
  resume: { 
    type: Schema.Types.ObjectId, 
    ref: 'Resume', 
    required: true 
  },
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
    required: true 
  },
  overallScore: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100
  },
  categoryScores: {
    skillsMatch: { type: Number, min: 0, max: 100 },
    experienceMatch: { type: Number, min: 0, max: 100 },
    educationMatch: { type: Number, min: 0, max: 100 },
    roleMatch: { type: Number, min: 0, max: 100 }
  },
  matchedSkills: [{ type: String }],
  missingSkills: [{ type: String }],
  matchSummary: { type: String },
  matchDate: { type: Date, default: Date.now },
  matchMethod: { 
    type: String, 
    required: true,
    enum: ['vector', 'keyword', 'hybrid'],
    default: 'vector'
  },
  modelVersion: { type: String },
  candidateDetails: {
    name: String,
    email: String,
    phone: String,
    experience: String,
    skills: [String],
    summary: String
  },
});

// Create indexes for better query performance
ResumeMatchResultSchema.index({ jobPost: 1 });
ResumeMatchResultSchema.index({ resume: 1 });
ResumeMatchResultSchema.index({ recruiter: 1 });
ResumeMatchResultSchema.index({ overallScore: -1 }); // For sorting by score
ResumeMatchResultSchema.index({ matchDate: -1 }); // For sorting by date
// Compound index for common queries
ResumeMatchResultSchema.index({ jobPost: 1, overallScore: -1 });
ResumeMatchResultSchema.index({ jobPost: 1, resume: 1 }, { unique: true }); // Ensure unique job-resume pairs

export default mongoose.model<IResumeMatchResult>('ResumeMatchResult', ResumeMatchResultSchema);
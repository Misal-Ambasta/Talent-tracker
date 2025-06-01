import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';
import { IApplicant } from './Applicant';
import { IInterviewAudio } from './InterviewAudio';

export interface IInterviewSummary extends Document {
  _id: Types.ObjectId;
  interviewAudio: Types.ObjectId | IInterviewAudio;
  recruiter: Types.ObjectId | IRecruiter;
  applicant: Types.ObjectId | IApplicant;
  transcription: string;
  transcriptionConfidence: number; // 0-1 score
  summary: string;
  overallScore: number; // 0-100 score
  categoryScores: {
    technicalSkills: number; // 0-100 score
    communication: number; // 0-100 score
    problemSolving: number; // 0-100 score
    culturalFit: number; // 0-100 score
    experience: number; // 0-100 score
  };
  strengths: string[];
  areasForImprovement: string[];
  keyInsights: string[];
  recommendation: 'strong_hire' | 'hire' | 'consider' | 'pass';
  recommendationConfidence: number; // 0-1 score
  aiModel: string; // Model used for analysis
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSummarySchema: Schema = new Schema({
  interviewAudio: { 
    type: Schema.Types.ObjectId, 
    ref: 'InterviewAudio', 
  },
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
  },
  applicant: { 
    type: Schema.Types.ObjectId, 
    ref: 'Applicant', 
  },
  transcription: { type: String, required: true },
  transcriptionConfidence: { type: Number, required: true },
  summary: { type: String, required: true },
  overallScore: { type: Number, required: true },
  categoryScores: {
    technicalSkills: { type: Number, required: true },
    communication: { type: Number, required: true },
    problemSolving: { type: Number, required: true },
    culturalFit: { type: Number, required: true },
    experience: { type: Number, required: true }
  },
  strengths: [{ type: String }],
  areasForImprovement: [{ type: String }],
  keyInsights: [{ type: String }],
  recommendation: { 
    type: String, 
    enum: ['strong_hire', 'hire', 'consider', 'pass'],
    required: true 
  },
  recommendationConfidence: { type: Number, required: true },
  aiModel: { type: String, required: true },
}, { timestamps: true });

// Create indexes for better query performance
InterviewSummarySchema.index({ interviewAudio: 1 });
InterviewSummarySchema.index({ recruiter: 1 });
InterviewSummarySchema.index({ applicant: 1 });
InterviewSummarySchema.index({ overallScore: -1 });
InterviewSummarySchema.index({ recommendation: 1 });
InterviewSummarySchema.index({ createdAt: -1 });

export default mongoose.model<IInterviewSummary>('InterviewSummary', InterviewSummarySchema);
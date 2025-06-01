import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';

export type BiasCategory = 
  | 'gender' 
  | 'age' 
  | 'race' 
  | 'ethnicity' 
  | 'disability' 
  | 'religion' 
  | 'socioeconomic' 
  | 'appearance' 
  | 'other';

export type BiasRiskLevel = 'low' | 'medium' | 'high';

export interface IBiasDetection {
  category: BiasCategory;
  biasedText: string;
  explanation: string;
  suggestion: string;
  confidence: number; // 0-1 score
}

export interface IBiasReport extends Document {
  _id: Types.ObjectId;
  recruiter: Types.ObjectId | IRecruiter;
  originalText: string;
  contentType: 'job_description' | 'interview_question' | 'feedback' | 'other';
  detections: IBiasDetection[];
  overallRiskLevel: BiasRiskLevel;
  improvedText?: string;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

const BiasDetectionSchema = new Schema({
  category: { 
    type: String, 
    enum: ['gender', 'age', 'race', 'ethnicity', 'disability', 'religion', 'socioeconomic', 'appearance', 'other'],
    required: true 
  },
  biasedText: { type: String, required: true },
  explanation: { type: String, required: true },
  suggestion: { type: String, required: true },
  confidence: { type: Number, required: true }
});

const BiasReportSchema: Schema = new Schema({
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
  },
  originalText: { type: String, required: true },
  contentType: { 
    type: String, 
    enum: ['job_description', 'interview_question', 'feedback', 'other'],
    required: true 
  },
  detections: [BiasDetectionSchema],
  overallRiskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    required: true 
  },
  improvedText: { type: String },
  aiModel: { type: String, required: true }
}, { timestamps: true });

// Create indexes for better query performance
BiasReportSchema.index({ recruiter: 1 });
BiasReportSchema.index({ createdAt: -1 });
BiasReportSchema.index({ overallRiskLevel: 1 });
BiasReportSchema.index({ contentType: 1 });

// Create a text index for searching in original text
BiasReportSchema.index({ originalText: 'text' });

export default mongoose.model<IBiasReport>('BiasReport', BiasReportSchema);
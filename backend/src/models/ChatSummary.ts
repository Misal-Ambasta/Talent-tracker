import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';
import { IApplicant } from './Applicant';

export interface IChatSummary extends Document {
  _id: Types.ObjectId;
  recruiter: Types.ObjectId | IRecruiter;
  applicant?: Types.ObjectId | IApplicant;
  chatText: string;
  summary: string;
  keyPoints: string[];
  questions: string[];
  answers: string[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceScore: number; // 0-1 score
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSummarySchema: Schema = new Schema({
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
    required: true 
  },
  applicant: { 
    type: Schema.Types.ObjectId, 
    ref: 'Applicant'
  },
  chatText: { type: String, required: true },
  summary: { type: String, required: true },
  keyPoints: [{ type: String }],
  questions: [{ type: String }],
  answers: [{ type: String }],
  nextSteps: [{ type: String }],
  sentiment: { 
    type: String, 
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  confidenceScore: { type: Number, required: true },
  aiModel: { type: String, required: true },
}, { timestamps: true });

// Create indexes for better query performance
ChatSummarySchema.index({ recruiter: 1 });
ChatSummarySchema.index({ applicant: 1 });
ChatSummarySchema.index({ createdAt: -1 });
ChatSummarySchema.index({ sentiment: 1 });

// Create a text index for searching in chat text and summary
ChatSummarySchema.index(
  { chatText: 'text', summary: 'text' },
  { weights: { chatText: 1, summary: 2 } }
);

export default mongoose.model<IChatSummary>('ChatSummary', ChatSummarySchema);
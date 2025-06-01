import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';

// Interface for candidate details structure
export interface ICandidateDetails {
  name: string;
  email: string;
  phone: string;
  experience: string;
  skills: string[];
  summary: string;
}

export interface IResume extends Document {
  _id: Types.ObjectId;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  parsedText: string;
  textEmbedding?: number[];
  embeddingModel?: string;
  embeddingDate?: Date;
  recruiter: Types.ObjectId | IRecruiter;
  uploadDate: Date;
  isProcessed: boolean;
  processingError?: string;
  candidateDetails?: ICandidateDetails;
}

const ResumeSchema: Schema = new Schema({
  fileName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  filePath: { type: String, required: true },
  parsedText: { type: String, required: true },
  textEmbedding: { type: [Number] },
  embeddingModel: { type: String },
  embeddingDate: { type: Date },
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
    required: true 
  },
  uploadDate: { type: Date, default: Date.now },
  isProcessed: { type: Boolean, default: false },
  processingError: { type: String },
  candidateDetails: {
    name: String,
    email: String,
    phone: String,
    experience: String,
    skills: [String],
    summary: String
  }
});

// Create indexes for better query performance
ResumeSchema.index({ recruiter: 1 });
ResumeSchema.index({ uploadDate: -1 });
ResumeSchema.index({ isProcessed: 1 });

// Create a text index for basic text search capabilities
ResumeSchema.index({ parsedText: 'text' });

export default mongoose.model<IResume>('Resume', ResumeSchema);
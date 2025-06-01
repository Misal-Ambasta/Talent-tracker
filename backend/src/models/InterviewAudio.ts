import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';
import { IApplicant } from './Applicant';

export interface IInterviewAudio extends Document {
  _id: Types.ObjectId;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  duration: number; // Duration in seconds
  recruiter: Types.ObjectId | IRecruiter;
  applicant: Types.ObjectId | IApplicant;
  uploadDate: Date;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  transcriptionJobId?: string; // For tracking async transcription jobs
}

const InterviewAudioSchema: Schema = new Schema({
  fileName: { type: String, required: true },
  originalFileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  filePath: { type: String, required: true },
  duration: { type: Number, required: true },
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
  },
  applicant: { 
    type: Schema.Types.ObjectId, 
    ref: 'Applicant', 
  },
  uploadDate: { type: Date, default: Date.now },
  isProcessed: { type: Boolean, default: false },
  processingStatus: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingError: { type: String },
  transcriptionJobId: { type: String }
});

// Create indexes for better query performance
InterviewAudioSchema.index({ recruiter: 1 });
InterviewAudioSchema.index({ applicant: 1 });
InterviewAudioSchema.index({ uploadDate: -1 });
InterviewAudioSchema.index({ isProcessed: 1 });
InterviewAudioSchema.index({ processingStatus: 1 });

export default mongoose.model<IInterviewAudio>('InterviewAudio', InterviewAudioSchema);
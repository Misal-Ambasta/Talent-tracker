import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';

export interface IJobPost extends Document {
  _id: Types.ObjectId;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  responsibilities: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship' | 'temporary';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  skills: string[];
  applicationDeadline?: Date;
  isRemote: boolean;
  isActive: boolean;
  department: string;
  postedDate: Date;
  closingDate: Date;
  status: 'open' | 'closed';
  recruiter: Types.ObjectId | IRecruiter;
  createdAt: Date;
  updatedAt: Date;
}

const JobPostSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: false, trim: true },
  location: { type: String, required: false, trim: true },
  description: { type: String, required: true },
  // requirements: { type: String, required: true },
  responsibilities: { type: String, required: false },
  salary: {
    min: { type: Number, default: 40000 },
    max: { type: Number, default: 70000 },
    currency: { type: String, default: 'USD' }
  },
  employmentType: { 
    type: String,
    required: true, 
    enum: ['full-time', 'part-time', 'contract', 'internship', 'temporary'],
    default: 'full-time'
  },
  experienceLevel: { 
    type: String, 
    required: false, 
    enum: ['entry', 'mid', 'senior', 'executive'],
    default: 'entry'
  },
  skills: [{ type: String, trim: true }],
  applicationDeadline: { type: Date },
  isRemote: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  department: { type: String, required: false },
  postedDate: { type: Date, required: false, default: Date.now },
  closingDate: { type: Date, required: false, default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
  status: { type: String, enum: ['open', 'closed'], required: true, default: 'open' },
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
    required: true 
  },
}, {
  timestamps: true // Automatically add createdAt and updatedAt fields
});

// Create indexes for better query performance
JobPostSchema.index({ recruiter: 1 });
JobPostSchema.index({ recruiter: 1, isActive: 1 });
JobPostSchema.index({ skills: 1 });
JobPostSchema.index({ createdAt: -1 }); // For sorting by newest

export default mongoose.model<IJobPost>('JobPost', JobPostSchema);
import mongoose, { Schema, Document, Types } from 'mongoose';
import { IRecruiter } from './Recruiter';
import { IJobPost } from './JobPost';
import { IResume } from './Resume';

export type ApplicantStatus = 
  | 'new' 
  | 'screening' 
  | 'reviewing' 
  | 'interview' 
  | 'technical' 
  | 'offer' 
  | 'hired' 
  | 'rejected';

export interface IApplicant extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  currentCompany?: string;
  currentPosition?: string;
  skills?: string[];
  location?: string;
  additionalNotes?: string;
  yearsOfExperience?: number;
  education?: {
    degree?: string;
    institution?: string;
    graduationYear?: number;
  };
  status: ApplicantStatus;
  notes?: string;
  tags?: string[];
  resume: Types.ObjectId | IResume;
  jobPost: Types.ObjectId | IJobPost;
  recruiter: Types.ObjectId | IRecruiter;
  matchScore?: number;
  applicationDate: Date;
  lastUpdated: Date;
}

const ApplicantSchema: Schema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  linkedInUrl: { type: String, trim: true },
  portfolioUrl: { type: String, trim: true },
  currentCompany: { type: String, trim: true },
  currentPosition: { type: String, trim: true },
  location: { type: String, trim: true },
  additionalNotes: { type: String, trim: true },
  skills: [String],
  yearsOfExperience: { type: Number },
  education: {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    graduationYear: { type: Number }
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['new', 'screening', 'reviewing', 'interview', 'technical', 'offer', 'hired', 'rejected'],
    default: 'new'
  },
  notes: { type: String },
  tags: [{ type: String, trim: true }],
  resume: { 
    type: Schema.Types.ObjectId, 
    ref: 'Resume', 
  },
  jobPost: { 
    type: Schema.Types.ObjectId, 
    ref: 'JobPost', 
  },
  recruiter: { 
    type: Schema.Types.ObjectId, 
    ref: 'Recruiter', 
    required: true 
  },
  matchScore: { type: Number },
  applicationDate: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

// Update lastUpdated timestamp before saving
ApplicantSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Create indexes for better query performance
ApplicantSchema.index({ jobPost: 1 });
ApplicantSchema.index({ recruiter: 1 });
ApplicantSchema.index({ status: 1 });
ApplicantSchema.index({ email: 1 });
ApplicantSchema.index({ applicationDate: -1 });
// Compound index for common queries
ApplicantSchema.index({ jobPost: 1, status: 1 });
ApplicantSchema.index({ recruiter: 1, jobPost: 1 });

export default mongoose.model<IApplicant>('Applicant', ApplicantSchema);
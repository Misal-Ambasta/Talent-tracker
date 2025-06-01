import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IRecruiter extends Document {
  _id: Types.ObjectId; 
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
  comparePassword: (candidatePassword: string) => Promise<boolean>; // Add method signature
}

const RecruiterSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  isActive: { type: Boolean, default: true },
});

// Mongoose middleware to hash password before saving
RecruiterSchema.pre<IRecruiter>('save', async function (next) {
  if (!this.isModified('passwordHash') || this.passwordHash.length === 0) { // Ensure passwordHash is not empty
    return next();
  }
  try {
    // Check if passwordHash looks like a plain password (not already hashed)
    // A common heuristic is length or absence of hash structure, but checking isModified is usually sufficient
    // unless we are updating the password with a plain text value again.
    // Let's rely on isModified and ensure length > 0.

    const salt = await bcrypt.genSalt(12); // Using salt rounds = 12 as specified in PRD
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Method to compare password
RecruiterSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false; // Cannot compare if no password hash exists
  }
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    console.error("Error comparing password:", error); // Log error for debugging
    return false;
  }
};


export default mongoose.model<IRecruiter>('Recruiter', RecruiterSchema);
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import logger from './logger';

// Define allowed file types
const ALLOWED_FILE_TYPES = [
  'application/pdf',                                                     // PDF
  'application/msword',                                                  // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.oasis.opendocument.text',                            // ODT
  'text/plain'                                                          // TXT
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Ensure upload directory exists
const createUploadDirectories = () => {
  const baseDir = path.join(process.cwd(), 'uploads');
  const resumesDir = path.join(baseDir, 'resumes');
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  if (!fs.existsSync(resumesDir)) {
    fs.mkdirSync(resumesDir, { recursive: true });
  }
  
  return { baseDir, resumesDir };
};

// Create directories
const { resumesDir } = createUploadDirectories();

// Configure storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, resumesDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    // Generate a unique filename while preserving the original extension
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// File filter function
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`));
  }
};

// Create multer upload instance
export const resumeUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

// Helper function to delete a file
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

// Helper function to get absolute file path
export const getResumePath = (fileName: string): string => {
  return path.join(resumesDir, fileName);
};
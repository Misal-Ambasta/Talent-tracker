import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import logger from './logger';

// Define allowed audio file types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',                // MP3
  'audio/mp4',                 // M4A
  'audio/wav',                 // WAV
  'audio/x-wav',               // WAV (alternative MIME)
  'audio/webm',                // WEBM
  'audio/ogg',                 // OGG
  'audio/x-m4a'                // M4A (alternative MIME)
];

// Maximum file size (30MB)
const MAX_AUDIO_SIZE = 30 * 1024 * 1024;

// Maximum audio duration in seconds (30 minutes)
const MAX_AUDIO_DURATION = 30 * 60;

// Ensure upload directory exists
const createUploadDirectories = () => {
  const baseDir = path.join(process.cwd(), 'uploads');
  const audioDir = path.join(baseDir, 'interviews');
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }
  
  return { baseDir, audioDir };
};

// Create directories
const { audioDir } = createUploadDirectories();

// Configure storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, audioDir);
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
  if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed audio types: ${ALLOWED_AUDIO_TYPES.join(', ')}`));
  }
};

// Create multer upload instance
export const audioUpload = multer({
  storage,
  limits: {
    fileSize: MAX_AUDIO_SIZE
  },
  fileFilter
});

// Helper function to delete an audio file
export const deleteAudioFile = async (filePath: string): Promise<boolean> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting audio file ${filePath}:`, error);
    return false;
  }
};

// Helper function to get absolute file path
export const getAudioPath = (fileName: string): string => {
  return path.join(audioDir, fileName);
};

// Export constants for use in validation
export {
  ALLOWED_AUDIO_TYPES,
  MAX_AUDIO_SIZE,
  MAX_AUDIO_DURATION
};
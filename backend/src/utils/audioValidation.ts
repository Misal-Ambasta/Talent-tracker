import fs from 'fs';
import { promisify } from 'util';
import { getAudioDurationInSeconds } from 'get-audio-duration';
import { ALLOWED_AUDIO_TYPES, MAX_AUDIO_DURATION } from './audioUpload';
import logger from './logger';

const statAsync = promisify(fs.stat);

/**
 * Validates an audio file for format, size, and duration
 * @param filePath Path to the audio file
 * @param mimeType MIME type of the file
 * @returns Object with validation results
 */
export const validateAudioFile = async (filePath: string, mimeType: string): Promise<{
  isValid: boolean;
  duration?: number;
  error?: string;
}> => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { isValid: false, error: 'File does not exist' };
    }

    // Check MIME type
    if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
      return { 
        isValid: false, 
        error: `Invalid file type. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}` 
      };
    }

    // Check file size
    const stats = await statAsync(filePath);
    if (stats.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }

    // Get audio duration
    const duration = await getAudioDurationInSeconds(filePath);
    
    // Check if duration is valid
    if (isNaN(duration) || duration <= 0) {
      return { isValid: false, error: 'Could not determine audio duration or invalid audio file' };
    }
    
    // Check if duration exceeds maximum
    if (duration > MAX_AUDIO_DURATION) {
      return { 
        isValid: false, 
        duration,
        error: `Audio duration exceeds maximum allowed (${MAX_AUDIO_DURATION / 60} minutes)` 
      };
    }

    return { isValid: true, duration };
  } catch (error) {
    logger.error('Error validating audio file:', error);
    return { isValid: false, error: 'Error validating audio file' };
  }
};

/**
 * Checks audio quality metrics
 * @param filePath Path to the audio file
 * @returns Object with quality assessment
 */
export const assessAudioQuality = async (filePath: string): Promise<{
  qualityScore: number; // 0-1 score
  isStereo: boolean;
  sampleRate?: number;
  bitRate?: number;
  hasBackground: boolean;
  recommendations: string[];
}> => {
  try {
    // This is a placeholder for actual audio quality assessment
    // In a real implementation, you would use a library like ffprobe or Web Audio API
    // to analyze the audio file and extract quality metrics
    
    // For now, we'll return default values
    return {
      qualityScore: 0.8,
      isStereo: true,
      sampleRate: 44100,
      bitRate: 128000,
      hasBackground: false,
      recommendations: []
    };
    
    // TODO: Implement actual audio quality assessment using ffprobe or similar
    // This would analyze:
    // - Sample rate (higher is better, 44.1kHz or 48kHz is ideal)
    // - Bit rate (higher is better, 128kbps+ for speech)
    // - Channels (mono vs stereo)
    // - Signal-to-noise ratio
    // - Clipping detection
    // - Background noise detection
  } catch (error) {
    logger.error('Error assessing audio quality:', error);
    return {
      qualityScore: 0.5, // Default medium quality
      isStereo: false,
      hasBackground: true,
      recommendations: ['Could not properly assess audio quality']
    };
  }
};
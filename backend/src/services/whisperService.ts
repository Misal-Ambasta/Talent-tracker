import fs from 'fs';
import { OpenAI } from 'openai';
import config from '../config';
import logger from '../utils/logger';
import { MAX_AUDIO_DURATION } from '../utils/audioUpload';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Whisper API model to use
const WHISPER_MODEL = 'whisper-1';

/**
 * Transcribe audio file using OpenAI's Whisper API
 * @param filePath Path to the audio file
 * @param options Additional options for transcription
 * @returns Transcription result
 */
export const transcribeAudio = async (filePath: string, options?: {
  language?: string; // ISO language code (e.g., 'en', 'es')
  prompt?: string;   // Optional prompt to guide transcription
  temperature?: number; // Controls randomness (0-1)
}): Promise<{
  transcription: string;
  confidence: number; // Estimated confidence score (0-1)
  duration: number;   // Duration in seconds
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}> => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    // Create a readable stream from the file
    const audioStream = fs.createReadStream(filePath);

    // Call Whisper API
    const response = await openai.audio.transcriptions.create({
      file: audioStream,
      model: WHISPER_MODEL,
      language: options?.language,
      prompt: options?.prompt,
      temperature: options?.temperature ?? 0.2,
      response_format: 'verbose_json',
    });
    // Close the stream
    audioStream.close();

    // Extract and format the response
    // Note: The actual response structure may vary based on OpenAI's API
    // This is based on the documented response format
    const result = response as any;

    return {
      transcription: result.text || '',
      confidence: 0.85,
      duration: result.duration || 0,
      segments: result.segments?.map((segment: any) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text
      }))
    };
  } catch (error) {
    logger.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Process long audio by splitting into chunks and transcribing each chunk
 * @param filePath Path to the audio file
 * @param duration Duration of the audio in seconds
 * @param options Additional options for transcription
 * @returns Combined transcription result
 */
export const processLongAudio = async (filePath: string, duration: number, options?: {
  language?: string;
  prompt?: string;
  temperature?: number;
  chunkSize?: number; // Size of each chunk in seconds
  overlap?: number;   // Overlap between chunks in seconds
}): Promise<{
  transcription: string;
  confidence: number;
  duration: number;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}> => {
  try {
    // If audio is within the limit, process directly
    if (duration <= MAX_AUDIO_DURATION) {
      const result = await transcribeAudio(filePath, options);
      return {
        ...result,
        segments: result.segments || [] // Ensure segments is always an array
      };
    }

    // For longer audio, we would need to split the file into chunks
    // This is a placeholder for actual implementation
    // In a real implementation, you would:
    // 1. Use ffmpeg to split the audio into overlapping chunks
    // 2. Transcribe each chunk
    // 3. Combine the results, handling overlaps

    logger.warn(`Audio exceeds maximum duration (${duration}s > ${MAX_AUDIO_DURATION}s). Chunking not implemented.`);
    
    // Return a placeholder result
    return {
      transcription: 'Audio exceeds maximum duration. Please split the file manually.',
      confidence: 0,
      duration,
      segments: []
    };
  } catch (error) {
    logger.error('Error processing long audio:', error);
    throw new Error(`Failed to process long audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate a summary of the interview from transcription using GPT-4
 * @param transcription The interview transcription
 * @param jobDetails Optional job details for context
 * @returns Interview summary and analysis
 */
export const generateInterviewSummary = async (transcription: string, jobDetails?: {
  title: string;
  description: string;
  requiredSkills: string[];
}): Promise<{
  summary: string;
  overallScore: number; // 0-100
  categoryScores: {
    technicalSkills: number; // 0-100
    communication: number; // 0-100
    problemSolving: number; // 0-100
    culturalFit: number; // 0-100
    experience: number; // 0-100
  };
  strengths: string[];
  areasForImprovement: string[];
  keyInsights: string[];
  recommendation: 'strong_hire' | 'hire' | 'consider' | 'pass';
  recommendationConfidence: number; // 0-1
}> => {
  try {
    // Prepare the prompt with job context if available
    let prompt = `Analyze the following interview transcription and provide a detailed assessment.`;
    
    if (jobDetails) {
      prompt += `\n\nJob Context:\nTitle: ${jobDetails.title}\nDescription: ${jobDetails.description}\nRequired Skills: ${jobDetails.requiredSkills.join(', ')}`;
    }
    
    prompt += `\n\nTranscription:\n${transcription.slice(0, 14000)}`; // Limit to avoid token limits
    
    prompt += `\n\nProvide a comprehensive analysis in JSON format with the following structure:\n{
  "summary": "Brief summary of the interview",
  "overallScore": 85, // 0-100 score
  "categoryScores": {
    "technicalSkills": 80, // 0-100
    "communication": 90, // 0-100
    "problemSolving": 85, // 0-100
    "culturalFit": 75, // 0-100
    "experience": 80 // 0-100
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForImprovement": ["area1", "area2"],
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendation": "hire", // one of: strong_hire, hire, consider, pass
  "recommendationConfidence": 0.85 // 0-1 score
}`;
    
    // Call GPT-4 for analysis
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in GPT-4 response');
    }
    
    try {
      const result = JSON.parse(content);
      
      // Validate and normalize the result
      return {
        summary: result.summary || 'No summary provided',
        overallScore: Math.min(100, Math.max(0, result.overallScore || 0)),
        categoryScores: {
          technicalSkills: Math.min(100, Math.max(0, result.categoryScores?.technicalSkills || 0)),
          communication: Math.min(100, Math.max(0, result.categoryScores?.communication || 0)),
          problemSolving: Math.min(100, Math.max(0, result.categoryScores?.problemSolving || 0)),
          culturalFit: Math.min(100, Math.max(0, result.categoryScores?.culturalFit || 0)),
          experience: Math.min(100, Math.max(0, result.categoryScores?.experience || 0))
        },
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        areasForImprovement: Array.isArray(result.areasForImprovement) ? result.areasForImprovement : [],
        keyInsights: Array.isArray(result.keyInsights) ? result.keyInsights : [],
        recommendation: ['strong_hire', 'hire', 'consider', 'pass'].includes(result.recommendation) 
          ? result.recommendation as 'strong_hire' | 'hire' | 'consider' | 'pass'
          : 'consider',
        recommendationConfidence: Math.min(1, Math.max(0, result.recommendationConfidence || 0.5))
      };
    } catch (parseError) {
      logger.error('Error parsing interview summary JSON:', parseError);
      throw new Error('Failed to parse interview summary');
    }
  } catch (error) {
    logger.error('Error generating interview summary:', error);
    throw new Error(`Failed to generate interview summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
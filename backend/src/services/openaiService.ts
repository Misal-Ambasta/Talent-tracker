import { OpenAI } from 'openai';
import config from '../config';
import logger from '../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// Current embedding model
const EMBEDDING_MODEL = config.openai.embeddingModel;

/**
 * Generate embeddings for a text using OpenAI's embedding model
 * @param text Text to generate embeddings for
 * @returns Array of embedding values
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    // Truncate text if it's too long (OpenAI has token limits)
    const truncatedText = text.slice(0, 8000); // Approximate limit
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
};

/**
 * Generate embeddings for multiple texts in batch
 * @param texts Array of texts to generate embeddings for
 * @returns Array of embedding arrays
 */
export const generateEmbeddingsBatch = async (texts: string[]): Promise<number[][]> => {
  try {
    // Process in smaller batches to avoid rate limits
    const batchSize = 5;
    const embeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Truncate texts if they're too long
      const truncatedBatch = batch.map(text => text.slice(0, 8000));
      
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedBatch,
      });
      
      // Sort the embeddings by index to maintain original order
      const sortedEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);
      
      embeddings.push(...sortedEmbeddings);
      
      // Add a small delay to avoid rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return embeddings;
  } catch (error) {
    logger.error('Error generating embeddings batch:', error);
    throw new Error('Failed to generate embeddings batch');
  }
};

/**
 * Calculate cosine similarity between two vectors
 * @param vecA First vector
 * @param vecB Second vector
 * @returns Cosine similarity score (0-1)
 */
export const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Extract skills from text using OpenAI
 * @param text Text to extract skills from
 * @returns Array of extracted skills
 */
export const extractSkills = async (text: string): Promise<string[]> => {
  try {
    const prompt = `
      Extract all professional skills from the following text. It should in descending order, the most important skills first.
      Return ONLY a JSON array of strings with no explanation or other text.
      Example output format: ["JavaScript", "React", "Node.js"]
      
      Text: ${text.slice(0, 4000)}
    `;
    
    const response = await openai.chat.completions.create({
      model: config.openai.skillExtractionModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      return [];
    }
    
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed.skills) ? parsed.skills : [];
    } catch (parseError) {
      logger.error('Error parsing skills JSON:', parseError);
      return [];
    }
  } catch (error) {
    logger.error('Error extracting skills:', error);
    return [];
  }
};

/**
 * Calculate resume match score using GPT-4o
 * @param resumeText Resume text content
 * @param jobDescription Job description text
 * @returns Match score between 0-100
 */
export const calculateResumeMatchScore = async (resumeText: string, jobDescription: string): Promise<number> => {
  try {
    // Truncate texts to avoid token limits
    const truncatedResume = resumeText.slice(0, 6000);
    const truncatedJobDescription = jobDescription.slice(0, 2000);
    
    const response = await openai.chat.completions.create({ 
      model: "gpt-4o", 
      messages: [ 
        { 
          role: "system", 
          content: `You are a resume matcher AI. Analyze the resume and job description and return ONLY a fit score between 0 and 100. Do not provide any explanation, reasoning, or additional text.`, 
        }, 
        { 
          role: "user", 
          content: `Resume:\n${truncatedResume}\n\nJob Description:\n${truncatedJobDescription}\n\nOnly return a number between 0 and 100.`, 
        }, 
      ],
      temperature: 0.2,
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('Empty response from GPT-4o resume matching');
      return 0;
    }
    
    // Extract the number from the response
    const score = parseInt(content.trim(), 10);
    if (isNaN(score) || score < 0 || score > 100) {
      logger.error(`Invalid score from GPT-4o: ${content}`);
      return 0;
    }
    
    return score;
  } catch (error) {
    logger.error('Error calculating resume match score with GPT-4o:', error);
    return 0;
  }
};
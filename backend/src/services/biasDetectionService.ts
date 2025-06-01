import { OpenAI } from 'openai';
import config from '../config';
import logger from '../utils/logger';
import { BiasCategory, BiasRiskLevel, IBiasDetection } from '../models/BiasReport';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// Bias categories with examples to help the model identify them
const biasCategories: Record<BiasCategory, string[]> = {
  gender: ['he/she pronouns exclusively', 'masculine/feminine traits', 'gender stereotypes'],
  age: ['young', 'old', 'experienced', 'digital native', 'recent graduate'],
  race: ['cultural fit', 'native English speaker', 'ethnic background references'],
  ethnicity: ['cultural background', 'accent', 'heritage'],
  disability: ['able-bodied', 'physical requirements not essential to role'],
  religion: ['religious holidays', 'beliefs', 'practices'],
  socioeconomic: ['elite university', 'prestigious background', 'economic class indicators'],
  appearance: ['professional appearance', 'dress code beyond necessity', 'physical attributes'],
  other: ['other potential biases not fitting above categories']
};

/**
 * Analyzes text for potential biases using GPT-4
 * @param text The text to analyze for bias
 * @param contentType The type of content being analyzed
 * @returns Analysis results including detections and overall risk level
 */
export async function detectBias(text: string, contentType: string): Promise<{
  detections: IBiasDetection[];
  overallRiskLevel: BiasRiskLevel;
  improvedText?: string;
  aiModel: string;
}> {
  try {
    // Define the system prompt with bias detection guidelines
    const systemPrompt = `You are an AI bias detection expert specializing in workplace and hiring bias. 
    Analyze the provided ${contentType} for potential biases in these categories: ${Object.keys(biasCategories).join(', ')}.
    
    For each bias detected:
    1. Identify the specific biased text
    2. Explain why it's potentially biased
    3. Suggest an alternative phrasing
    4. Assign a confidence score (0.0-1.0)
    
    Also provide:
    - An overall risk assessment (low/medium/high)
    - An improved version of the entire text with all biases addressed
    
    Format your response as a valid JSON object with these fields:
    - detections: array of {category, biasedText, explanation, suggestion, confidence}
    - overallRiskLevel: "low", "medium", or "high"
    - improvedText: complete improved version of the text
    `;

    // Call GPT-4 for bias analysis
    const model = config.openai.biasDetectionModel || 'gpt-4';
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.2, // Lower temperature for more consistent analysis
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const result = JSON.parse(content);
    
    // Validate the response format
    if (!result.detections || !Array.isArray(result.detections) || !result.overallRiskLevel) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Return the analysis results with the model used
    return {
      detections: result.detections,
      overallRiskLevel: result.overallRiskLevel as BiasRiskLevel,
      improvedText: result.improvedText,
      aiModel: model
    };
  } catch (error) {
    logger.error('Error in bias detection:', error);
    throw new Error(`Failed to analyze text for bias: ${(error as Error).message}`);
  }
}

/**
 * Calculates the overall risk level based on individual bias detections
 * This is a fallback if the AI doesn't provide an overall assessment
 * @param detections Array of bias detections
 * @returns Risk level assessment
 */
export function calculateOverallRiskLevel(detections: IBiasDetection[]): BiasRiskLevel {
  if (detections.length === 0) return 'low';
  
  // Count high confidence detections (>0.7)
  const highConfidenceCount = detections.filter(d => d.confidence > 0.7).length;
  
  // Calculate average confidence
  const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
  
  if (detections.length > 5 || highConfidenceCount >= 3 || avgConfidence > 0.8) {
    return 'high';
  } else if (detections.length > 2 || highConfidenceCount >= 1 || avgConfidence > 0.6) {
    return 'medium';
  } else {
    return 'low';
  }
}
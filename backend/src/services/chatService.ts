import { OpenAI } from 'openai';
import config from '../config';
import logger from '../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Clean and normalize chat text
 * @param text Raw chat text
 * @returns Cleaned text
 */
export const cleanChatText = (text: string): string => {
  // Remove excessive whitespace
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Remove common chat artifacts like emojis, if needed
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  
  // Normalize line breaks
  cleaned = cleaned.replace(/\r\n|\r/g, '\n');
  
  // Remove duplicate line breaks
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
};

/**
 * Analyze chat text and generate a summary
 * @param chatText The chat conversation text
 * @returns Summary and analysis
 */
export const analyzeChatText = async (chatText: string): Promise<{
  summary: string;
  keyPoints: string[];
  questions: string[];
  answers: string[];
  nextSteps: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceScore: number;
}> => {
  try {
    // Clean the chat text
    const cleanedText = cleanChatText(chatText);
    
    // Prepare the prompt
    const prompt = `
      Analyze the following chat conversation and provide a detailed summary.
      
      Chat Conversation:
      ${cleanedText.slice(0, 14000)} // Limit to avoid token limits
      
      Provide a comprehensive analysis in JSON format with the following structure:
      {
        "summary": "Brief summary of the conversation",
        "keyPoints": ["key point 1", "key point 2", "key point 3"],
        "questions": ["question 1", "question 2"],
        "answers": ["answer 1", "answer 2"],
        "nextSteps": ["next step 1", "next step 2"],
        "sentiment": "positive", // one of: positive, neutral, negative
        "confidenceScore": 0.85 // 0-1 score
      }
    `;
    
    // Call GPT-4 for analysis
    const response = await openai.chat.completions.create({
      model: config.openai.chatSummaryModel,
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
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
        questions: Array.isArray(result.questions) ? result.questions : [],
        answers: Array.isArray(result.answers) ? result.answers : [],
        nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
        sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment) 
          ? result.sentiment as 'positive' | 'neutral' | 'negative'
          : 'neutral',
        confidenceScore: Math.min(1, Math.max(0, result.confidenceScore || 0.5))
      };
    } catch (parseError) {
      logger.error('Error parsing chat analysis JSON:', parseError);
      throw new Error('Failed to parse chat analysis');
    }
  } catch (error) {
    logger.error('Error analyzing chat text:', error);
    throw new Error(`Failed to analyze chat text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Estimate the confidence level of the analysis based on chat characteristics
 * @param chatText The chat conversation text
 * @returns Confidence score (0-1)
 */
export const estimateConfidence = (chatText: string): number => {
  // This is a simple heuristic - in a real implementation, you would use more sophisticated methods
  const wordCount = chatText.split(/\s+/).length;
  
  // Very short conversations might have lower confidence
  if (wordCount < 50) {
    return 0.5;
  }
  
  // Medium length conversations
  if (wordCount < 500) {
    return 0.7;
  }
  
  // Longer conversations
  return 0.9;
};
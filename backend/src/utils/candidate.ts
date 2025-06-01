import { OpenAI } from 'openai';
import config from '../config';

const openai = new OpenAI({
    apiKey: config.openai.apiKey
  });

export const extractCandidateDetails = async (parsedText: string): Promise<any> => {
    try {
      // Use OpenAI to extract structured data
      const prompt = `Extract the following information from this resume text and return it as a valid JSON object:
  
  REQUIRED FORMAT:
  {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number with country code if available",
    "experience": "X years" (estimate total years of professional experience),
    "skills": ["skill1", "skill2", "skill3"] (array of technical skills only),
    "summary": "Brief professional summary in 1-2 sentences describing the candidate's background and expertise"
  }
  
  EXTRACTION RULES:
  1. If any field is not found, use an empty string "" or empty array [] as appropriate
  2. For experience, try to calculate total years from work history or education graduation date
  3. For skills, only include technical skills (programming languages, frameworks, tools, technologies)
  4. For summary, create a concise professional overview based on the resume content
  5. Return ONLY the JSON object, no additional text or formatting
  
  RESUME TEXT:
  ${parsedText.substring(0, 4000)} // Limit text to avoid token limits
  
  Return only valid JSON:`;
  
      const extractionResult = await callLLMForExtraction(prompt);
      
      // Validate the result has required structure
      const validatedResult = {
        name: extractionResult.name || "",
        email: extractionResult.email || "",
        phone: extractionResult.phone || "",
        experience: extractionResult.experience || "",
        skills: Array.isArray(extractionResult.skills) ? extractionResult.skills : [],
        summary: extractionResult.summary || ""
      };
      
      return validatedResult;
    } catch (error) {
      console.error('Error extracting candidate details:', error);
      // Return basic structure with empty values
      return {
        name: "",
        email: "",
        phone: "",
        experience: "",
        skills: [],
        summary: ""
      };
    }
  };

  const callLLMForExtraction = async (prompt: string): Promise<any> => {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ 
          role: "user", 
          content: prompt 
        }],
        temperature: 0.1,
        max_tokens: 1000, // Adjust based on your needs
      });
      
      const content = response.choices[0].message.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }
  
      // Clean the response to ensure it's valid JSON
      let cleanedContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/```json\n?/g, '').replace(/\n?```/g, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/```\n?/g, '').replace(/\n?```/g, '');
      }
  
      try {
        return JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Content received:', cleanedContent);
        
        // Return default structure if parsing fails
        return {
          name: "",
          email: "",
          phone: "",
          experience: "",
          skills: [],
          summary: ""
        };
      }
      
    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      // Return default structure if API call fails
      return {
        name: "",
        email: "",
        phone: "",
        experience: "",
        skills: [],
        summary: ""
      };
    }
  };
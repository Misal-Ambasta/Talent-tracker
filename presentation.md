# AI-Powered Applicant Tracking System Presentation

## Project Overview

The AI-Powered Applicant Tracking System (ATS) is a comprehensive recruitment platform that leverages advanced AI capabilities to streamline and enhance the hiring process. The system is designed for recruiters to efficiently manage job postings, applicants, resumes, and interviews, with AI-powered features for resume matching, interview analysis, chat summarization, and bias detection.

## Project Structure

The project follows a modern full-stack architecture with clear separation between frontend and backend:

### Backend Structure

```
backend/
├── src/
│   ├── config/         # Configuration settings and environment variables
│   ├── controllers/    # Request handlers for API endpoints
│   ├── middleware/     # Express middleware (auth, validation, etc.)
│   ├── models/         # MongoDB schemas and models
│   ├── routes/         # API route definitions
│   ├── services/       # Business logic and external API integrations
│   └── utils/          # Helper functions and utilities
├── dist/               # Compiled JavaScript output
├── uploads/            # Temporary storage for uploaded files
├── logs/               # Application logs
└── package.json        # Dependencies and scripts
```

### Frontend Structure

```
frontend/
├── src/
│   ├── assets/         # Static assets (images, fonts, etc.)
│   ├── components/     # Reusable UI components
│   ├── config/         # Frontend configuration
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   ├── pages/          # Page components for routing
│   ├── services/       # API service integrations
│   ├── slices/         # Redux Toolkit slices
│   ├── store/          # Redux store configuration
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper functions
├── public/             # Static public assets
└── package.json        # Dependencies and scripts
```

## Technologies Used

### Backend Technologies

- **Node.js & Express**: Server framework for handling HTTP requests and API endpoints
- **TypeScript**: Type-safe JavaScript for improved developer experience and code quality
- **MongoDB & Mongoose**: NoSQL database for flexible data storage with schema validation
- **JWT Authentication**: Secure user authentication with JSON Web Tokens
- **Multer**: Middleware for handling file uploads (resumes, audio files)
- **pdf-parse & mammoth**: Libraries for extracting text from PDF and DOCX files
- **OpenAI API**: Integration for AI capabilities (GPT models, embeddings, Whisper)
- **Winston**: Logging system for application monitoring
- **Joi**: Schema validation for request data and environment variables
- **Cloudinary**: Cloud storage for uploaded files (optional integration)

### Frontend Technologies

- **React**: UI library for building component-based interfaces
- **TypeScript**: Type-safe JavaScript for frontend development
- **Vite**: Modern build tool for faster development and optimized production builds
- **Redux Toolkit**: State management with simplified Redux patterns
- **React Router**: Client-side routing for single-page application
- **React Query**: Data fetching, caching, and state management for API calls
- **Axios**: HTTP client for API requests
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Radix UI**: Accessible component primitives for building UI
- **React Hook Form**: Form handling with validation
- **Zod**: Schema validation for form data
- **React Media Recorder**: Audio recording for interview functionality

## AI Features and Implementation

### 1. Resume Matching with OpenAI Embeddings

**Technology**: OpenAI Embeddings API

**Model**: `text-embedding-ada-002` (configurable via `OPENAI_EMBEDDING_MODEL` environment variable)

**Implementation Details**:
- Resumes and job descriptions are processed to extract clean text
- Text is sent to OpenAI's embedding API to generate vector representations
- **Generated embeddings are stored as arrays in the MongoDB database alongside other document fields**
- Cosine similarity is calculated between job and resume embeddings
- **All similarity calculations are performed in-memory within the backend application; no dedicated vector database is used**
- Results are ranked and normalized to a 0-100 scale
- Batch processing is implemented with rate limiting considerations

> **Note:**
> The system does not use a dedicated vector database (such as Pinecone, FAISS, or Chroma) for similarity search. Instead, embeddings are stored as arrays in MongoDB, and all similarity calculations are performed in-memory. This approach is suitable for small to medium datasets but may require optimization or a vector database for large-scale deployments.

**Code Example**:
```typescript
// From openaiService.ts
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

export const calculateCosineSimilarity = (vecA: number[], vecB: number[]): number => {
  // Implementation of cosine similarity calculation
  // ...
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
```

**Temperature Setting**: N/A (Embeddings don't use temperature)

**Rationale**: Embeddings provide semantic understanding of text, allowing for more accurate matching between job requirements and candidate qualifications compared to keyword matching alone.

### 2. Interview Audio Processing with Whisper

**Technology**: OpenAI Whisper API

**Model**: `whisper-1`

**Implementation Details**:
- Audio files are uploaded and validated (format, size, duration)
- Files are sent to Whisper API for transcription
- Long audio files are split into chunks if they exceed maximum duration
- Transcription results include confidence scores and timestamps

**Code Example**:
```typescript
// From whisperService.ts
export const transcribeAudio = async (filePath: string, options?: {
  language?: string;
  prompt?: string;
  temperature?: number;
}): Promise<{
  transcription: string;
  confidence: number;
  duration: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}> => {
  // Implementation of audio transcription
  // ...
  const response = await openai.audio.transcriptions.create({
    file: audioStream,
    model: WHISPER_MODEL,
    language: options?.language,
    prompt: options?.prompt,
    temperature: options?.temperature ?? 0.2,
    response_format: 'verbose_json',
  });
  // ...
};
```

**Temperature Setting**: 0.2 (default, configurable)

**Rationale**: A low temperature (0.2) is used for transcription to ensure accuracy and consistency in the output. This is important for interview transcription where precise wording matters for subsequent analysis.

### 3. Interview Summary Generation with GPT-4

**Technology**: OpenAI Chat Completions API

**Model**: `gpt-4` (configurable via `OPENAI_INTERVIEW_SUMMARY_MODEL` environment variable)

**Implementation Details**:
- Transcribed interview text is processed and sent to GPT-4
- A structured prompt guides the model to analyze the interview
- The model generates a comprehensive assessment with scores, strengths, concerns, and recommendations
- Results are returned in JSON format for easy parsing and display

**Code Example**:
```typescript
// From whisperService.ts
export const generateInterviewSummary = async (transcription: string, jobDetails?: {
  title: string;
  description: string;
  requiredSkills: string[];
}): Promise<{
  summary: string;
  overallScore: number;
  categoryScores: {
    technicalSkills: number;
    communication: number;
    problemSolving: number;
    culturalFit: number;
    experience: number;
  };
  strengths: string[];
  areasForImprovement: string[];
  keyInsights: string[];
  recommendation: 'strong_hire' | 'hire' | 'consider' | 'pass';
  recommendationConfidence: number;
}> => {
  // Implementation of interview summary generation
  // ...
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  // ...
};
```

**Prompt Structure**:
```
Analyze the following interview transcription and provide a detailed assessment.

[Job Context if available]
Title: {jobDetails.title}
Description: {jobDetails.description}
Required Skills: {jobDetails.requiredSkills.join(', ')}

Transcription:
{transcription}

Provide a comprehensive analysis in JSON format with the following structure:
{
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
}
```

**Temperature Setting**: 0.2

**Rationale**: A low temperature (0.2) is used to ensure consistent, structured output that follows the required JSON format. This is critical for reliable scoring and recommendations in the hiring process.

### 4. Skill Extraction with GPT-3.5 Turbo

**Technology**: OpenAI Chat Completions API

**Model**: `gpt-3.5-turbo` (configurable via `OPENAI_SKILL_EXTRACTION_MODEL` environment variable)

**Implementation Details**:
- Resume text is processed and sent to GPT-3.5 Turbo
- A focused prompt instructs the model to extract professional skills
- Results are returned in JSON format as an array of skills
- These skills are used for keyword matching and candidate profiling

**Code Example**:
```typescript
// From openaiService.ts
export const extractSkills = async (text: string): Promise<string[]> => {
  try {
    const prompt = `
      Extract all professional skills from the following text. 
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
    
    // Process and return results
    // ...
  } catch (error) {
    logger.error('Error extracting skills:', error);
    return [];
  }
};
```

**Temperature Setting**: 0.2

**Rationale**: A low temperature (0.2) is used to ensure consistent and accurate skill extraction. This is important for reliable keyword matching and candidate profiling.

### 5. Bias Detection with GPT-4

**Technology**: OpenAI Chat Completions API

**Model**: `gpt-4` (configurable via `OPENAI_BIAS_DETECTION_MODEL` environment variable)

**Implementation Details**:
- Text from job descriptions, interview feedback, or other recruitment content is analyzed
- A specialized prompt guides the model to identify potential biases across multiple categories
- Results include bias scores, flagged text, explanations, and alternative suggestions
- The system helps recruiters maintain fair and inclusive hiring practices

**Temperature Setting**: 0.2

**Rationale**: A low temperature (0.2) is used to ensure consistent and reliable bias detection. This is critical for maintaining fair hiring practices and avoiding discriminatory language.

## Configuration and Environment Variables

The system uses a comprehensive configuration system with environment variables for customization:

```typescript
// From config/index.ts
const envVarsSchema = Joi.object()
  .keys({
    // ... other environment variables
    OPENAI_API_KEY: Joi.string().required().description('OpenAI API key'),
    OPENAI_EMBEDDING_MODEL: Joi.string().default('text-embedding-ada-002').description('OpenAI embedding model'),
    OPENAI_MAX_TOKENS: Joi.number().default(8191).description('Maximum tokens for OpenAI requests'),
    OPENAI_TEMPERATURE: Joi.number().default(0.7).description('Temperature for OpenAI requests'),
    OPENAI_SKILL_EXTRACTION_MODEL: Joi.string().default('gpt-3.5-turbo').description('Model for skill extraction'),
    OPENAI_INTERVIEW_SUMMARY_MODEL: Joi.string().default('gpt-4').description('Model for interview summaries'),
    OPENAI_BIAS_DETECTION_MODEL: Joi.string().default('gpt-4').description('Model for bias detection'),
    OPENAI_CHAT_SUMMARY_MODEL: Joi.string().default('gpt-4').description('Model for chat summaries'),
    // ... other environment variables
  })
  .unknown();
```

## Implementation Status

According to the project's todo.md file, the system has completed 10 of the 11 planned implementation phases:

1. ✅ Foundation Setup
2. ✅ Authentication System
3. ✅ Job Management
4. ✅ File Upload System
5. ✅ Applicant Management
6. ✅ AI Resume Matching
7. ✅ Interview Audio Processing
8. ✅ Chat Summarization
9. ✅ Bias Detection
10. ✅ Frontend-Backend Integration
11. ⏳ Testing (in progress)

## Conclusion

The AI-Powered Applicant Tracking System demonstrates effective integration of modern AI capabilities into a practical business application. By leveraging OpenAI's models with carefully selected parameters (primarily low temperature settings for consistency and accuracy), the system provides valuable automation and insights for the recruitment process.

> **Scalability Consideration:**
> For large-scale deployments with thousands of resumes and jobs, integrating a dedicated vector database (such as Pinecone, FAISS, or Chroma) is recommended for efficient similarity search and improved performance.

The architecture follows best practices with clear separation of concerns, comprehensive error handling, and configurable settings. The frontend delivers a modern, responsive user experience with React and Tailwind CSS, while the backend provides robust API services with Node.js, Express, and MongoDB.
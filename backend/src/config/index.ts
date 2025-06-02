import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Load environment variables from .env file
// dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

// Define validation schema for environment variables
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URI: Joi.string().required().description('MongoDB connection URI'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh token secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('Minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(7).description('Days after which refresh tokens expire'),
    CORS_ORIGIN: Joi.string().default('*').description('Allowed CORS origins, comma-separated for multiple origins'),
    RATE_LIMIT_WINDOW: Joi.number().default(3600000).description('Rate limit window in milliseconds'),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100).description('Maximum requests per window'),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly').default('info'),
    ENCRYPTION_KEY: Joi.string().min(32).max(32).description('32 character key for AES-256 encryption'),
    OPENAI_API_KEY: Joi.string().required().description('OpenAI API key'),
    OPENAI_EMBEDDING_MODEL: Joi.string().default('text-embedding-ada-002').description('OpenAI embedding model'),
    OPENAI_MAX_TOKENS: Joi.number().default(8191).description('Maximum tokens for OpenAI requests'),
    OPENAI_TEMPERATURE: Joi.number().default(0.7).description('Temperature for OpenAI requests'),
    OPENAI_SKILL_EXTRACTION_MODEL: Joi.string().default('gpt-3.5-turbo').description('Model for skill extraction'),
    OPENAI_INTERVIEW_SUMMARY_MODEL: Joi.string().default('gpt-4').description('Model for interview summaries'),
    OPENAI_BIAS_DETECTION_MODEL: Joi.string().default('gpt-4').description('Model for bias detection'),
    OPENAI_CHAT_SUMMARY_MODEL: Joi.string().default('gpt-4').description('Model for chat summaries'),
    // Cloudinary Configuration
    CLOUDINARY_CLOUD_NAME: Joi.string().description('Cloudinary cloud name'),
    CLOUDINARY_API_KEY: Joi.string().description('Cloudinary API key'),
    CLOUDINARY_API_SECRET: Joi.string().description('Cloudinary API secret'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
  },
  cors: {
    origin: envVars.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  logLevel: envVars.LOG_LEVEL,
  openai: {
    apiKey: envVars.OPENAI_API_KEY || '',
    embeddingModel: envVars.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
    maxTokens: parseInt(envVars.OPENAI_MAX_TOKENS || '8191', 10),
    temperature: parseFloat(envVars.OPENAI_TEMPERATURE || '0.7'),
    skillExtractionModel: envVars.OPENAI_SKILL_EXTRACTION_MODEL || 'gpt-3.5-turbo',
    interviewSummaryModel: envVars.OPENAI_INTERVIEW_SUMMARY_MODEL || 'gpt-4-turbo-preview',
    biasDetectionModel: envVars.OPENAI_BIAS_DETECTION_MODEL || 'gpt-4-turbo-preview',
    chatSummaryModel: envVars.OPENAI_CHAT_SUMMARY_MODEL || 'gpt-4-turbo-preview'
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME || '',
    apiKey: envVars.CLOUDINARY_API_KEY || '',
    apiSecret: envVars.CLOUDINARY_API_SECRET || '',
  },
};

export default config;
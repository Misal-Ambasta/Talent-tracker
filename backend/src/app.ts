import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config';
import logger from './utils/logger';
import authRoutes from './routes/auth';
import jobRoutes from './routes/jobs';
import applicantRoutes from './routes/applicants';
import resumeRoutes from './routes/resumes';
import interviewRoutes from './routes/interviews';
import chatRoutes from './routes/chats';
import biasRoutes from './routes/bias';

// Create Express app
const app: Express = express();

// Apply security middleware
app.use(helmet());

// Apply CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Apply rate limiting
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
}));

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Log HTTP requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api', applicantRoutes);
app.use('/api', resumeRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/bias', biasRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.stack || err.message);
  res.status(500).json({
    message: 'Internal server error',
    ...(config.env === 'development' && { error: err.message }),
  });
});

export default app;
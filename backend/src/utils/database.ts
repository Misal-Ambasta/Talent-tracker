import mongoose from 'mongoose';
import config from '../config';
import logger from './logger';

/**
 * Connect to MongoDB database
 */
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoose.url);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error connecting to MongoDB: ${error.message}`);
    } else {
      logger.error('Unknown error connecting to MongoDB');
    }
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error disconnecting from MongoDB: ${error.message}`);
    } else {
      logger.error('Unknown error disconnecting from MongoDB');
    }
  }
};

/**
 * Handle MongoDB connection errors
 */
mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error: ${err}`);
});

/**
 * Handle MongoDB disconnection
 */
mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB disconnected');
});

/**
 * Handle process termination - close MongoDB connection
 */
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

export default {
  connectDB,
  disconnectDB,
};
import { v2 as cloudinary } from 'cloudinary';
import config from '.';
import logger from '../utils/logger';

// Define allowed resource types for Cloudinary
type ResourceType = 'raw' | 'image' | 'video' | 'auto';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

// Define interface for Cloudinary upload options
interface CloudinaryUploadOptions {
  folder?: string;
  resource_type?: ResourceType;
  public_id?: string;
  [key: string]: any; // Allow other Cloudinary options
}

// Helper function to upload a file to Cloudinary
export const uploadToCloudinary = async (filePath: string, options: CloudinaryUploadOptions = {}) => {
  try {
    // Set default options
    const uploadOptions = {
      folder: 'resumes',
      resource_type: 'raw' as ResourceType,
      ...options
    };
    
    // Upload the file
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    return result;
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

// Helper function to delete a file from Cloudinary
export const deleteCloudinaryFile = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' as ResourceType });
    return result.result === 'ok';
  } catch (error) {
    logger.error(`Error deleting file from Cloudinary: ${publicId}`, error);
    return false;
  }
};

// Helper function to generate a Cloudinary URL
export const getCloudinaryUrl = (publicId: string) => {
  return cloudinary.url(publicId, { resource_type: 'raw' as ResourceType });
};

export default cloudinary;
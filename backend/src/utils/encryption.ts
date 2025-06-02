import crypto from 'crypto';

// Get encryption key from environment or use a default for development
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0OacQ>U"r|d|.igFNk~."p2_/l#^H]es';
const IV_LENGTH = 16; // For AES, this is always 16

// Ensure key is exactly 32 bytes for AES-256
const getValidKey = (key: string): Buffer => {
  const keyBuffer = Buffer.from(key, 'utf8');
  if (keyBuffer.length === 32) {
    return keyBuffer;
  } else if (keyBuffer.length > 32) {
    return keyBuffer.subarray(0, 32);
  } else {
    // Pad with zeros if too short
    const paddedKey = Buffer.alloc(32);
    keyBuffer.copy(paddedKey);
    return paddedKey;
  }
};

/**
 * Encrypt a string using AES-256-CBC
 * @param text The text to encrypt
 * @returns Encrypted text as base64 string with IV prepended
 */
export const encrypt = (text: string): string => {
  try {
    const key = getValidKey(ENCRYPTION_KEY);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return `${iv.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt a string that was encrypted with the encrypt function
 * @param text The encrypted text (IV:encryptedData)
 * @returns Decrypted string
 */
export const decrypt = (text: string): string => {
  try {
    // Validate input format
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    const textParts = text.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted text format: expected "IV:encryptedData"');
    }
    
    const [ivBase64, encryptedText] = textParts;
    
    // Validate IV
    if (!ivBase64 || !encryptedText) {
      throw new Error('Invalid encrypted text format: missing IV or encrypted data');
    }

    const key = getValidKey(ENCRYPTION_KEY);
    const iv = Buffer.from(ivBase64, 'base64');
    
    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('bad decrypt')) {
        throw new Error('Decryption failed: Invalid key or corrupted data');
      } else if (error.message.includes('Invalid encrypted text format')) {
        throw error; // Re-throw our custom validation errors
      }
    }
    
    throw new Error('Failed to decrypt data');
  }
};
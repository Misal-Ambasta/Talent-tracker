/**
 * Encryption utilities for sensitive data
 * Uses AES-256-CBC encryption with a random IV
 */

// CryptoJS is a popular library for encryption in JavaScript
import CryptoJS from 'crypto-js';

// This key should match the one on the backend
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || '0OacQ>U"r|d|.igFNk~."p2_/l#^H]es';

// Ensure key is properly formatted for CryptoJS (32 bytes for AES-256)
const getValidKey = (key: string): CryptoJS.lib.WordArray => {
  // Convert string to UTF-8 bytes
  const keyUtf8 = CryptoJS.enc.Utf8.parse(key);
  
  // Ensure exactly 32 bytes (256 bits) for AES-256
  if (keyUtf8.sigBytes === 32) {
    return keyUtf8;
  } else if (keyUtf8.sigBytes > 32) {
    // Truncate if too long
    const truncated = CryptoJS.lib.WordArray.create();
    for (let i = 0; i < 8; i++) { // 8 words = 32 bytes
      truncated.words[i] = keyUtf8.words[i];
    }
    truncated.sigBytes = 32;
    return truncated;
  } else {
    // Pad with zeros if too short
    const padded = keyUtf8.clone();
    while (padded.sigBytes < 32) {
      padded.words.push(0);
      padded.sigBytes = Math.min(padded.sigBytes + 4, 32);
    }
    return padded;
  }
};

/**
 * Encrypt sensitive data before sending to the server
 * @param data The data to encrypt (string or object)
 * @returns Encrypted string with IV prepended
 */
export const encryptData = (data: string | object): string => {
  try {
    // Convert object to string if needed
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Validate input
    if (!dataString) {
      throw new Error('Cannot encrypt empty data');
    }
    
    const key = getValidKey(ENCRYPTION_KEY);
    
    // Generate a random IV (16 bytes for AES)
    const iv = CryptoJS.lib.WordArray.random(16);
    
    // Encrypt the data
    const encrypted = CryptoJS.AES.encrypt(dataString, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combine IV and encrypted data
    return iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data received from the server
 * @param encryptedData The encrypted data string (IV:encryptedData)
 * @returns Decrypted data as string
 */
export const decryptData = (encryptedData: string): string => {
  try {
    // Validate input
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new Error('Invalid input: encryptedData must be a non-empty string');
    }

    const textParts = encryptedData.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted data format: expected "IV:encryptedData"');
    }
    
    const [ivBase64, encryptedText] = textParts;
    
    // Validate parts
    if (!ivBase64 || !encryptedText) {
      throw new Error('Invalid encrypted data format: missing IV or encrypted data');
    }

    const key = getValidKey(ENCRYPTION_KEY);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    
    // Validate IV length (should be 16 bytes = 128 bits)
    if (iv.sigBytes !== 16) {
      throw new Error(`Invalid IV length: expected 16 bytes, got ${iv.sigBytes}`);
    }
    
    // Decrypt the data
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Convert to UTF-8 string
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    // Validate decryption result
    if (!decryptedString) {
      throw new Error('Decryption resulted in empty string - likely wrong key or corrupted data');
    }
    
    return decryptedString;
  } catch (error) {
    console.error('Decryption error:', error);
    
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Malformed UTF-8 data')) {
        throw new Error('Decryption failed: Invalid key or corrupted data');
      } else if (error.message.includes('Invalid encrypted data format')) {
        throw error; // Re-throw our custom validation errors
      }
    }
    
    throw new Error('Failed to decrypt data');
  }
};
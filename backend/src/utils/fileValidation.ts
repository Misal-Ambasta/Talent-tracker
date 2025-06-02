import * as fs from 'fs/promises';
import * as path from 'path';

// Types
export type ValidationResult = {
  isValid: boolean;
  error?: string;
  confidence: 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
};

export type FileInfo = {
  path: string;
  name: string;
  size: number;
  extension: string;
};

export type ValidatedFile = FileInfo & {
  validation: ValidationResult;
};

// Configuration
export const VALIDATION_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedExtensions: ['pdf', 'docx', 'xlsx', 'doc', 'xls', 'txt', 'csv'],
  minFileSize: 10, // 10 bytes
} as const;

// File signatures for format detection
const FILE_SIGNATURES = new Map([
  ['pdf', [0x25, 0x50, 0x44, 0x46]], // %PDF
  ['docx', [0x50, 0x4B, 0x03, 0x04]], // ZIP (DOCX is ZIP-based)
  ['xlsx', [0x50, 0x4B, 0x03, 0x04]], // ZIP (XLSX is ZIP-based)
  ['doc', [0xD0, 0xCF, 0x11, 0xE0]], // OLE2
  ['xls', [0xD0, 0xCF, 0x11, 0xE0]], // OLE2
  ['txt', null], // No signature needed
  ['csv', null], // No signature needed
]);

// Pure validation functions
const isValidSize = (size: number): boolean =>
  size >= VALIDATION_CONFIG.minFileSize && size <= VALIDATION_CONFIG.maxFileSize;

const isValidExtension = (extension: string): boolean =>
  VALIDATION_CONFIG.supportedExtensions.includes(extension.toLowerCase() as typeof VALIDATION_CONFIG.supportedExtensions[number]);

const extractFileInfo = (filePath: string) => async (): Promise<FileInfo> => {
  const stats = await fs.stat(filePath);
  return {
    path: filePath,
    name: path.basename(filePath),
    size: stats.size,
    extension: path.extname(filePath).slice(1).toLowerCase(),
  };
};

// File signature validation
const readFileSignature = (filePath: string) => async (): Promise<Buffer> => {
  const buffer = Buffer.alloc(8);
  const fileHandle = await fs.open(filePath, 'r');
  try {
    await fileHandle.read(buffer, 0, 8, 0);
    return buffer;
  } finally {
    await fileHandle.close();
  }
};

const validateFileSignature = (extension: string, signature: Buffer): boolean => {
  const expectedSignature = FILE_SIGNATURES.get(extension);
  
  if (!expectedSignature) return true; // No signature check needed
  
  return expectedSignature.every((byte, index) => signature[index] === byte);
};

// Password protection detection
const detectPasswordProtection = (filePath: string, extension: string) => async (): Promise<boolean> => {
  try {
    const buffer = Buffer.alloc(1024);
    const fileHandle = await fs.open(filePath, 'r');
    try {
      await fileHandle.read(buffer, 0, 1024, 0);
      
      const content = buffer.toString('latin1');
      
      if (extension === 'pdf') {
        return content.includes('/Encrypt') || content.includes('/Security');
      }
      
      if (['docx', 'xlsx'].includes(extension)) {
        return content.includes('encrypted') || buffer.includes(Buffer.from([0x50, 0x4B, 0x07, 0x08]));
      }
      
      return false;
    } finally {
      await fileHandle.close();
    }
  } catch {
    return false;
  }
};

// File corruption detection
const detectCorruption = (filePath: string, extension: string) => async (): Promise<boolean> => {
  try {
    const signature = await readFileSignature(filePath)();
    
    if (!validateFileSignature(extension, signature)) {
      return true;
    }
    
    if (extension === 'pdf') {
      return await detectPDFCorruption(filePath);
    }
    
    if (['docx', 'xlsx'].includes(extension)) {
      return await detectZipCorruption(filePath);
    }
    
    return false;
  } catch {
    return true;
  }
};

const detectPDFCorruption = async (filePath: string): Promise<boolean> => {
  try {
    const fileHandle = await fs.open(filePath, 'r');
    
    try {
      // Read first 1024 bytes for header check only
      const buffer = Buffer.alloc(1024);
      const { bytesRead } = await fileHandle.read(buffer, 0, 1024, 0);
      const content = buffer.slice(0, bytesRead).toString('latin1');
      
      // Only check for PDF header - %%EOF is not always required
      return !content.includes('%PDF-');
      
    } finally {
      await fileHandle.close();
    }
  } catch (error) {
    console.error('Error checking PDF corruption:', error);
    return true;
  }
};


const detectZipCorruption = async (filePath: string): Promise<boolean> => {
  try {
    const stats = await fs.stat(filePath);
    const buffer = Buffer.alloc(22);
    const fileHandle = await fs.open(filePath, 'r');
    try {
      await fileHandle.read(buffer, 0, 22, Math.max(0, stats.size - 22));
      return !buffer.includes(Buffer.from([0x50, 0x4B, 0x05, 0x06]));
    } finally {
      await fileHandle.close();
    }
  } catch {
    return true;
  }
};

// Main validation functions
const validateSingleFile = (filePath: string) => async (): Promise<ValidatedFile> => {
  try {
    const fileInfo = await extractFileInfo(filePath)();
    
    if (!isValidSize(fileInfo.size)) {
      return {
        ...fileInfo,
        validation: {
          isValid: false,
          error: `File size ${fileInfo.size} bytes exceeds limits (min: ${VALIDATION_CONFIG.minFileSize}, max: ${VALIDATION_CONFIG.maxFileSize})`,
          confidence: 'high',
        },
      };
    }
    
    if (!isValidExtension(fileInfo.extension)) {
      return {
        ...fileInfo,
        validation: {
          isValid: false,
          error: `Unsupported file extension: ${fileInfo.extension}`,
          confidence: 'high',
        },
      };
    }
    
    const isPasswordProtected = await detectPasswordProtection(filePath, fileInfo.extension)();
    if (isPasswordProtected) {
      return {
        ...fileInfo,
        validation: {
          isValid: false,
          error: 'File is password protected',
          confidence: 'medium',
        },
      };
    }
    
    const isCorrupted = await detectCorruption(filePath, fileInfo.extension)();
    if (isCorrupted) {
      return {
        ...fileInfo,
        validation: {
          isValid: false,
          error: 'File appears corrupted or has invalid format',
          confidence: 'medium',
        },
      };
    }
    
    return {
      ...fileInfo,
      validation: {
        isValid: true,
        confidence: 'high',
        metadata: {
          extension: fileInfo.extension,
          sizeKB: Math.round(fileInfo.size / 1024),
        },
      },
    };
    
  } catch (error) {
    const fileInfo = {
      path: filePath,
      name: path.basename(filePath),
      size: 0,
      extension: path.extname(filePath).slice(1).toLowerCase(),
    };
    
    return {
      ...fileInfo,
      validation: {
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 'high',
      },
    };
  }
};

export const validateFiles = (filePaths: string[]) => async (): Promise<{
  valid: ValidatedFile[];
  invalid: ValidatedFile[];
  summary: {
    total: number;
    validCount: number;
    invalidCount: number;
    shouldProceed: boolean;
  };
}> => {
  const validationPromises = filePaths.map(validateSingleFile);
  const results = await Promise.all(validationPromises.map(fn => fn()));
  
  const valid = results.filter(file => file.validation.isValid);
  const invalid = results.filter(file => !file.validation.isValid);
  
  const shouldProceed = invalid.length <= Math.floor(filePaths.length * 0.3);
  
  return {
    valid,
    invalid,
    summary: {
      total: filePaths.length,
      validCount: valid.length,
      invalidCount: invalid.length,
      shouldProceed,
    },
  };
};

export { validateSingleFile };
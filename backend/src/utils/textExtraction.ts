import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import logger from './logger';

// For PDF parsing
let pdfParse: any;

// For DOCX parsing
let mammoth: any;

// Dynamically import modules to handle different file types
const loadDependencies = async () => {
  try {
    // Import pdf-parse for PDF files
    if (!pdfParse) {
      pdfParse = (await import('pdf-parse')).default;
    }
    
    // Import mammoth for DOCX files
    if (!mammoth) {
      mammoth = await import('mammoth');
    }
  } catch (error) {
    logger.error('Error loading text extraction dependencies:', error);
    throw new Error('Failed to load text extraction dependencies');
  }
};

// Convert fs.readFile to Promise-based
const readFile = promisify(fs.readFile);

/**
 * Extract text from a PDF file
 * @param filePath Path to the PDF file
 * @returns Extracted text content
 */
const extractTextFromPDF = async (filePath: string): Promise<string> => {
  try {
    await loadDependencies();
    const dataBuffer = await readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || '';
  } catch (error) {
    logger.error(`Error extracting text from PDF ${filePath}:`, error);
    throw new Error('Failed to extract text from PDF');
  }
};

/**
 * Extract text from a DOCX file
 * @param filePath Path to the DOCX file
 * @returns Extracted text content
 */
const extractTextFromDOCX = async (filePath: string): Promise<string> => {
  try {
    await loadDependencies();
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  } catch (error) {
    logger.error(`Error extracting text from DOCX ${filePath}:`, error);
    throw new Error('Failed to extract text from DOCX');
  }
};

/**
 * Extract text from a DOC file (limited support)
 * @param filePath Path to the DOC file
 * @returns Extracted text content
 */
const extractTextFromDOC = async (filePath: string): Promise<string> => {
  try {
    // For DOC files, we'll use a simple text extraction approach
    // This is a simplified approach and may not work for all DOC files
    const buffer = await readFile(filePath);
    // Extract text by looking for readable strings
    let text = '';
    for (let i = 0; i < buffer.length; i++) {
      // Only include ASCII printable characters
      if (buffer[i] >= 32 && buffer[i] <= 126) {
        text += String.fromCharCode(buffer[i]);
      } else if (buffer[i] === 13 || buffer[i] === 10) {
        // Add newlines
        text += '\n';
      }
    }
    return text;
  } catch (error) {
    logger.error(`Error extracting text from DOC ${filePath}:`, error);
    throw new Error('Failed to extract text from DOC');
  }
};

/**
 * Extract text from a plain text file
 * @param filePath Path to the text file
 * @returns Extracted text content
 */
const extractTextFromTXT = async (filePath: string): Promise<string> => {
  try {
    const text = await readFile(filePath, 'utf8');
    return text;
  } catch (error) {
    logger.error(`Error extracting text from TXT ${filePath}:`, error);
    throw new Error('Failed to extract text from TXT');
  }
};

/**
 * Extract text from a file based on its MIME type
 * @param filePath Path to the file
 * @param mimeType MIME type of the file
 * @returns Extracted text content
 */
export const extractTextFromFile = async (filePath: string, mimeType: string): Promise<string> => {
  try {
    switch (mimeType) {
      case 'application/pdf':
        return await extractTextFromPDF(filePath);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return await extractTextFromDOCX(filePath);
      case 'application/msword':
        return await extractTextFromDOC(filePath);
      case 'text/plain':
        return await extractTextFromTXT(filePath);
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    logger.error(`Error extracting text from file ${filePath}:`, error);
    throw error;
  }
};

/**
 * Clean and normalize extracted text
 * @param text Raw extracted text
 * @returns Cleaned and normalized text
 */
export const cleanExtractedText = (text: string): string => {
  if (!text) return '';
  
  // Replace multiple spaces with a single space
  let cleaned = text.replace(/\s+/g, ' ');
  
  // Replace multiple newlines with a single newline
  cleaned = cleaned.replace(/\n+/g, '\n');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};
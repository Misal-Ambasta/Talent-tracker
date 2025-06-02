import { Request, Response } from 'express';
import Recruiter from '../models/Recruiter';
import Joi from 'joi';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { decrypt } from '../utils/encryption';

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const registerRecruiter = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if the request contains encrypted data
    const { encryptedData } = req.body;
    
    if (!encryptedData) {
      res.status(400).json({ message: 'Encrypted data is required' });
      return;
    }
    
    // Decrypt the data
    const decryptedData = decrypt(encryptedData);
    const userData = JSON.parse(decryptedData);
    
    // Validate the decrypted data
    const { error, value } = registerSchema.validate(userData);
    
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { name, email, password } = value;
    
    const existing = await Recruiter.findOne({ email });
    if (existing) {
      res.status(409).json({ message: 'Email already registered' });
      return;
    }

    const recruiter = new Recruiter({ name, email, passwordHash: password });
    await recruiter.save();
    
    const accessToken = generateAccessToken(recruiter._id.toString());
    const refreshToken = generateRefreshToken(recruiter._id.toString());
    
    res.cookie('token', accessToken, { httpOnly: true, sameSite: 'lax' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax' });
    res.status(201).json({ 
      user: { id: recruiter._id.toString(), name, email }, 
      token: accessToken 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
};

export const loginRecruiter = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if the request contains encrypted data
    const { encryptedData } = req.body;
    
    if (!encryptedData) {
      res.status(400).json({ message: 'Encrypted data is required' });
      return;
    }
    
    // Decrypt the data
    const decryptedData = decrypt(encryptedData);
    const loginData = JSON.parse(decryptedData);
    // Validate the decrypted data
    const { error, value } = loginSchema.validate(loginData);
    if (error) {
      res.status(400).json({ message: error.details[0].message });
      return;
    }

    const { email, password } = value;
    
    const recruiter = await Recruiter.findOne({ email });
    if (!recruiter) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    const valid = await recruiter.comparePassword(password);
    if (!valid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }
    
    recruiter.lastLoginAt = new Date();
    await recruiter.save();
    
    const accessToken = generateAccessToken(recruiter._id.toString());
    const refreshToken = generateRefreshToken(recruiter._id.toString());
    
    res.cookie('token', accessToken, { httpOnly: true, sameSite: 'lax' });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax' });
    res.status(200).json({ 
      user: { id: recruiter._id.toString(), name: recruiter.name, email }, 
      token: accessToken 
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err });
  }
};

export const logoutRecruiter = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out' });
};
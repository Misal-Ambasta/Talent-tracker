import { Request, Response } from 'express';
import Recruiter from '../models/Recruiter';
import Joi from 'joi';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

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
  const { error, value } = registerSchema.validate(req.body);
 
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const { name, email, password } = value;
  console.log(email,"email");
  try {
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
    res.status(500).json({ message: 'Registration failed', error: err });
  }
};

export const loginRecruiter = async (req: Request, res: Response): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    res.status(400).json({ message: error.details[0].message });
    return;
  }

  const { email, password } = value;
  try {
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
    res.status(500).json({ message: 'Login failed', error: err });
  }
};

export const logoutRecruiter = async (req: Request, res: Response): Promise<void> => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out' });
};
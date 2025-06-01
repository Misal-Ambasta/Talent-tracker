import jwt from 'jsonwebtoken';
import config from '../config/index';

export const generateAccessToken = (recruiterId: string): string => {
  return jwt.sign({ recruiterId }, config.jwt.secret, {
    expiresIn: `${config.jwt.accessExpirationMinutes}m`,
    algorithm: 'HS256'
  });
};

export const generateRefreshToken = (recruiterId: string): string => {
  return jwt.sign({ recruiterId }, config.jwt.refreshSecret, {
    expiresIn: `${config.jwt.refreshExpirationDays}d`,
    algorithm: 'HS256'
  });
};

export const verifyAccessToken = (token: string): { recruiterId: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, { 
      algorithms: ['HS256']
    }) as { recruiterId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): { recruiterId: string } | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret, { 
      algorithms: ['HS256']
    }) as { recruiterId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};
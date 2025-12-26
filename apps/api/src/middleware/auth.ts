import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase-admin.js';
import type { AuthUser, ErrorCode } from '@family-inventory/shared';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED' as ErrorCode,
        message: '認証トークンが必要です',
      },
    });
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);

    req.authUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);

    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN' as ErrorCode,
        message: '無効な認証トークンです',
      },
    });
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);

    req.authUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
    };
  } catch {
    // トークンが無効でもエラーにしない
  }

  next();
}

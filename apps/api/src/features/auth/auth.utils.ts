import type { Response } from 'express';

export const setAuthCookie = (res: Response, token: string) => {
  // Store the single JWT token in an HTTP-only cookie
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

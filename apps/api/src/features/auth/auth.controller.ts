import type { NextFunction, Request, Response } from 'express'
import { loginSchema } from './auth.types'
import { AuthService } from './auth.service'
import { setAuthCookie } from './auth.utils'

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const payload = loginSchema.parse(req.body)
    const { token, user } = await AuthService.login(payload)

    setAuthCookie(res, token)

    // Return the token and user in the response body for clients like React Native
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user,
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.clearCookie('jwt')
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    })
  } catch (error) {
    next(error)
  }
}

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const { user } = await AuthService.getMe(userId);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

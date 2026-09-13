import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserService } from "../features/user/user.service";
import { setAuthCookie } from "../features/auth/auth.utils";
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

export interface JwtPayload {
  id: string;
}

export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    // Check if user exists and is active
    const user = await UserService.getUser(decoded.id);
    if (!user) {
      res.status(401).json({ success: false, message: "Unauthorized: User does not exist" });
      return;
    }
    
    if (!user.is_active) {
      res.status(403).json({ success: false, message: "Forbidden: Account has been disabled" });
      return;
    }

    (req as any).user = { id: decoded.id };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      try {
        // Decode but verify the signature is valid, ignoring expiration
        const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as JwtPayload;
        
        // Re-verify the user is still active
        const user = await UserService.getUser(decoded.id);
        if (user && user.is_active) {
          const newToken = generateToken(decoded.id);
          setAuthCookie(res, newToken); // Web App auto-refresh
          res.setHeader("x-new-token", newToken); // Mobile App auto-refresh
          
          (req as any).user = { id: decoded.id };
          return next();
        }
      } catch (e) {
        // Fallthrough to 401 if anything else fails
      }
    }
    res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
  }
};

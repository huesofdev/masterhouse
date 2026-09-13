import fs from 'fs/promises';
import path from 'path';

// Base directory for uploads. 
// __dirname usually points to dist/utils (if compiled) or src/utils (in dev).
// We'll use process.cwd() to ensure it's in the root of the api directory.
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export class S3Util {
  /**
   * Uploads a buffer to the local disk and returns the key.
   * Keeps the same method signature to avoid breaking controllers.
   */
  static async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string = "image/jpeg"
  ): Promise<string> {
    const fullPath = path.join(UPLOADS_DIR, key);
    const dir = path.dirname(fullPath);

    // Ensure the directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(fullPath, buffer);

    return key;
  }

  /**
   * Generates a URL for reading the object.
   * Since files are public via the /uploads static route, we just return the full URL.
   * Keeps the "SignedDownloadUrl" name to avoid breaking services calling it.
   */
  static async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    let baseUrl = process.env.API_URL || 'http://localhost:3000';
    
    // Auto-correct poorly formatted API_URLs (e.g. if it's just "api" instead of "/api" or "http...")
    if (!baseUrl.startsWith('http') && !baseUrl.startsWith('/')) {
      baseUrl = '/' + baseUrl;
    }

    // Ensure no double slashes if API_URL has a trailing slash
    const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const sanitizedKey = key.startsWith('/') ? key.slice(1) : key;
    
    return `${sanitizedBase}/uploads/${sanitizedKey}`;
  }
}

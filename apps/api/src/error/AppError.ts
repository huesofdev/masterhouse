// CustomError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(arg1: string | number, arg2: number | string) {
    let msg: string;
    let code: number;

    if (typeof arg1 === 'number') {
      code = arg1;
      msg = String(arg2);
    } else {
      msg = arg1;
      code = Number(arg2) || 500;
    }

    super(msg);
    this.statusCode = code;
    // "Operational" errors are known errors (like bad user input, resource not found)
    // Programmer errors are bugs (like typos, undefined variables, connection failures)
    this.isOperational = true;

    // Captures the stack trace, excluding this constructor from it
    Error.captureStackTrace(this, this.constructor);
  }
}
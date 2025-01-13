//The default Error method cannot handle status codes. Therefore, I created a superclass named 'AppError' to handle status codes along with error messages.
class AppError extends Error {
  public statusCode: number;
  public path?: string;
  public isAppError:boolean
  constructor(statusCode: number, path?: string, message?: string, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.path = path;
    this.isAppError = true;
    if (!stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;

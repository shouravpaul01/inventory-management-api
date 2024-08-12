import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import handleZodErrors from "../errors/handleZodErrors";
import handleValidationErrors from "../errors/handleValidationErros";
import handleCastError from "../errors/handleCastError";
import AppError from "../errors/AppError";
import { TErrorMessages } from "../interfaces/error";
import handleDuplicateError from "../errors/handleDuplicateError";

export const globalErrorHandler:ErrorRequestHandler=async (error,req,res,next) => {
    let statusCode = 500;
    let message = 'Something went to wrong';
  
    let errorMessages: TErrorMessages = [
      {
        path: '',
        message: 'Something  wrong',
      },
    ];
  
    if (error instanceof ZodError) {
        const simplifiedError = handleZodErrors(error);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorMessages = simplifiedError?.errorMessages;
      } else if (error?.name === 'ValidationError') {
        const simplifiedError = handleValidationErrors(error);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorMessages = simplifiedError?.errorMessages;
      } else if (error?.name === 'CastError') {
        const simplifiedError = handleCastError(error);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorMessages = simplifiedError?.errorMessages;
      } else if (error?.code === 11000) {
        const simplifiedError = handleDuplicateError(error);
        statusCode = simplifiedError?.statusCode;
        message = simplifiedError?.message;
        errorMessages = simplifiedError?.errorMessages;
      } else if (error instanceof AppError) {
        statusCode = error?.statusCode;
        message = error.message;

        errorMessages = [
          {
            path: error.path || '',
            message: error?.message,
          },
        ];
       
      } else if (error instanceof Error) {
        message = error.message;
        errorMessages = [
          {
            path: '',
            message: error?.message,
          },
        ];
      }
    return res.status(statusCode).json({
      status: false,
      message,
      errorMessages,
      stack: null,
      // error: error,
    });
}
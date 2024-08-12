import mongoose from 'mongoose';
import { TErrorMessages, TGenericErrorResponse } from '../interfaces/error';
import httpStatus from 'http-status';

const handleCastError = (
  error: mongoose.Error.CastError,
): TGenericErrorResponse => {
  const errorMessages: TErrorMessages = [
    {
      path: error.path,
      message: error.message,
    },
  ];

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Cast Error',
    errorMessages,
  };
};

export default handleCastError;

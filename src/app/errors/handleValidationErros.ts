import mongoose from 'mongoose';
import { TErrorMessages, TGenericErrorResponse } from '../interfaces/error';
import httpStatus from 'http-status';

const handleValidationErrors = (
  error: mongoose.Error.ValidationError,
): TGenericErrorResponse => {
  const errorMessages: TErrorMessages = Object.values(error.errors).map(
    (value: mongoose.Error.ValidatorError | mongoose.Error.CastError) => {
      return {
        path: value.path,
        message: value.message,
      };
    },
  );
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Mongoose Validation Error',
    errorMessages,
  };
};

export default handleValidationErrors;

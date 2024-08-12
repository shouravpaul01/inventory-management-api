import { ZodError, ZodIssue, map } from 'zod';
import httpStatus from 'http-status';
import { TErrorMessages, TGenericErrorResponse } from '../interfaces/error';

const handleZodErrors = (error: ZodError): TGenericErrorResponse => {
  const errorMessages: TErrorMessages = error?.issues?.map((issue: ZodIssue) => {
    return {
      path: issue?.path[issue.path.length - 1],
      message: issue?.message,
    };
  });
  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: 'Zod Validation Error',
    errorMessages,
  };
};

export default handleZodErrors;
